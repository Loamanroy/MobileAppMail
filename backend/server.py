from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import imaplib
import email
import smtplib
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import aiosmtplib
import base64
import socket
import re
from cryptography.fernet import Fernet
import asyncio
import traceback

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'mailapp')]

# Encryption key for passwords (in production, use env variable)
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key())
if isinstance(ENCRYPTION_KEY, str):
    ENCRYPTION_KEY = ENCRYPTION_KEY.encode()
cipher = Fernet(ENCRYPTION_KEY)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class IMAPConfig(BaseModel):
    host: str
    port: int = 993
    use_ssl: bool = True

class SMTPConfig(BaseModel):
    host: str
    port: int = 587
    use_tls: bool = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    imap_config: IMAPConfig
    smtp_config: SMTPConfig

class LoginResponse(BaseModel):
    user_id: str
    email: str
    message: str

class EmailAttachment(BaseModel):
    filename: str
    content: str  # base64
    content_type: str
    size: int

class EmailMessage(BaseModel):
    id: str
    message_id: Optional[str] = None
    subject: str
    from_address: str
    to_address: List[str]
    cc_address: Optional[List[str]] = []
    body_text: Optional[str] = ""
    body_html: Optional[str] = ""
    attachments: List[EmailAttachment] = []
    folder: str = "INBOX"
    is_read: bool = False
    date: datetime
    cached_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str

class SendEmailRequest(BaseModel):
    user_id: str
    to: List[EmailStr]
    cc: Optional[List[EmailStr]] = []
    subject: str
    body: str
    attachments: Optional[List[EmailAttachment]] = []

class SyncRequest(BaseModel):
    user_id: str
    folder: str = "INBOX"
    limit: int = 50

class FolderInfo(BaseModel):
    name: str
    message_count: int

class UpdateReadRequest(BaseModel):
    is_read: bool

# ==================== HELPER FUNCTIONS ====================

def encrypt_password(password: str) -> str:
    return cipher.encrypt(password.encode()).decode()

def decrypt_password(encrypted: str) -> str:
    return cipher.decrypt(encrypted.encode()).decode()

def clean_email_address(addr: str) -> str:
    """Extract email from 'Name <email@domain.com>' format"""
    match = re.search(r'<(.+?)>', addr)
    if match:
        return match.group(1)
    return addr.strip()

def decode_mime_words(s):
    """Decode MIME encoded strings"""
    if not s:
        return ""
    decoded_parts = decode_header(s)
    decoded_string = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                decoded_string += part.decode(encoding or 'utf-8', errors='ignore')
            except:
                decoded_string += part.decode('utf-8', errors='ignore')
        else:
            decoded_string += part
    return decoded_string

async def connect_imap(email_addr: str, password: str, imap_config: IMAPConfig):
    """Connect to IMAP server"""
    try:
        # Set socket timeout to 10 seconds for faster debugging
        import socket
        original_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(10)
        
        if imap_config.use_ssl:
            mail = imaplib.IMAP4_SSL(imap_config.host, imap_config.port)
        else:
            mail = imaplib.IMAP4(imap_config.host, imap_config.port)
        
        socket.setdefaulttimeout(original_timeout)
        mail.login(email_addr, password)
        return mail
    except socket.timeout:
        logger.error(f"IMAP connection timeout: {imap_config.host}:{imap_config.port}")
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail=f"Connection timeout. Port {imap_config.port} may be blocked by firewall. Try port 993 (SSL)"
        )
    except Exception as e:
        logger.error(f"IMAP connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"IMAP connection failed: {str(e)}"
        )

def parse_email_message(msg_data, user_id: str, folder: str = "INBOX") -> Optional[EmailMessage]:
    """Parse email message from IMAP"""
    try:
        msg = email.message_from_bytes(msg_data)
        
        # Extract basic info
        subject = decode_mime_words(msg.get("Subject", "No Subject"))
        from_addr = clean_email_address(msg.get("From", ""))
        to_addr = msg.get("To", "")
        to_list = [clean_email_address(addr.strip()) for addr in to_addr.split(",")] if to_addr else []
        cc_addr = msg.get("Cc", "")
        cc_list = [clean_email_address(addr.strip()) for addr in cc_addr.split(",")] if cc_addr else []
        
        date_str = msg.get("Date")
        try:
            date = email.utils.parsedate_to_datetime(date_str) if date_str else datetime.utcnow()
        except:
            date = datetime.utcnow()
        
        message_id = msg.get("Message-ID", str(uuid.uuid4()))
        
        # Extract body
        body_text = ""
        body_html = ""
        attachments = []
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                
                try:
                    if "attachment" in content_disposition:
                        filename = part.get_filename()
                        if filename:
                            filename = decode_mime_words(filename)
                            file_data = part.get_payload(decode=True)
                            if file_data:
                                attachments.append(EmailAttachment(
                                    filename=filename,
                                    content=base64.b64encode(file_data).decode(),
                                    content_type=content_type,
                                    size=len(file_data)
                                ))
                    elif content_type == "text/plain" and not body_text:
                        body_text = part.get_payload(decode=True).decode(errors='ignore')
                    elif content_type == "text/html" and not body_html:
                        body_html = part.get_payload(decode=True).decode(errors='ignore')
                except Exception as e:
                    logger.warning(f"Error parsing email part: {str(e)}")
                    continue
        else:
            content_type = msg.get_content_type()
            payload = msg.get_payload(decode=True)
            if payload:
                if content_type == "text/html":
                    body_html = payload.decode(errors='ignore')
                else:
                    body_text = payload.decode(errors='ignore')
        
        return EmailMessage(
            id=str(uuid.uuid4()),
            message_id=message_id,
            subject=subject,
            from_address=from_addr,
            to_address=to_list,
            cc_address=cc_list,
            body_text=body_text,
            body_html=body_html,
            attachments=attachments,
            folder=folder,
            is_read=False,
            date=date,
            user_id=user_id
        )
    except Exception as e:
        logger.error(f"Error parsing email: {str(e)}")
        return None

# ==================== API ROUTES ====================

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Authenticate user with IMAP/SMTP credentials
    """
    try:
        # Test IMAP connection
        mail = await connect_imap(
            request.email,
            request.password,
            request.imap_config
        )
        mail.logout()
        
        # Check if user exists
        user = await db.users.find_one({"email": request.email})
        
        user_data = {
            "email": request.email,
            "encrypted_password": encrypt_password(request.password),
            "imap_config": request.imap_config.dict(),
            "smtp_config": request.smtp_config.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        if user:
            # Update existing user
            await db.users.update_one(
                {"email": request.email},
                {"$set": user_data}
            )
            user_id = str(user["_id"])
        else:
            # Create new user
            result = await db.users.insert_one(user_data)
            user_id = str(result.inserted_id)
        
        return LoginResponse(
            user_id=user_id,
            email=request.email,
            message="Login successful"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@api_router.post("/emails/sync")
async def sync_emails(request: SyncRequest):
    """
    Sync emails from IMAP server to local database
    """
    try:
        # Get user
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(request.user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Connect to IMAP
        password = decrypt_password(user["encrypted_password"])
        imap_config = IMAPConfig(**user["imap_config"])
        mail = await connect_imap(user["email"], password, imap_config)
        
        # Select folder
        mail.select(request.folder)
        
        # Search for emails
        _, message_numbers = mail.search(None, "ALL")
        message_list = message_numbers[0].split()
        
        # Get latest emails (limit)
        latest_messages = message_list[-request.limit:] if len(message_list) > request.limit else message_list
        
        # Fetch all existing message_ids for this user upfront (optimization to avoid N+1 queries)
        existing_messages = await db.emails.find(
            {"user_id": request.user_id, "folder": request.folder},
            {"message_id": 1}
        ).to_list(None)
        existing_message_ids = {msg["message_id"] for msg in existing_messages}
        
        synced_count = 0
        for num in reversed(latest_messages):
            _, msg_data = mail.fetch(num, "(RFC822)")
            email_message = parse_email_message(msg_data[0][1], request.user_id, request.folder)
            
            if email_message:
                # Check if email already exists (using in-memory set for O(1) lookup)
                if email_message.message_id not in existing_message_ids:
                    await db.emails.insert_one(email_message.dict())
                    synced_count += 1
        
        mail.logout()
        
        return {
            "message": f"Synced {synced_count} new emails",
            "synced_count": synced_count
        }
    except Exception as e:
        logger.error(f"Sync error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}"
        )

@api_router.get("/emails/search")
async def search_emails(
    user_id: str,
    query: str,
    limit: int = 50
):
    """
    Search emails by subject, from, or body
    """
    try:
        # Create text search
        search_filter = {
            "user_id": user_id,
            "$or": [
                {"subject": {"$regex": query, "$options": "i"}},
                {"from_address": {"$regex": query, "$options": "i"}},
                {"body_text": {"$regex": query, "$options": "i"}}
            ]
        }
        
        emails = await db.emails.find(search_filter).sort("date", -1).limit(limit).to_list(limit)
        
        return [EmailMessage(**email) for email in emails]
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )

@api_router.get("/emails", response_model=List[EmailMessage])
async def get_emails(
    user_id: str,
    folder: str = "INBOX",
    limit: int = 50,
    skip: int = 0
):
    """
    Get cached emails from database
    """
    try:
        emails = await db.emails.find(
            {"user_id": user_id, "folder": folder}
        ).sort("date", -1).skip(skip).limit(limit).to_list(limit)
        
        return [EmailMessage(**email) for email in emails]
    except Exception as e:
        logger.error(f"Get emails error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get emails: {str(e)}"
        )

@api_router.get("/emails/{email_id}", response_model=EmailMessage)
async def get_email_detail(email_id: str, user_id: str):
    """
    Get email details
    """
    try:
        email_doc = await db.emails.find_one({
            "id": email_id,
            "user_id": user_id
        })
        
        if not email_doc:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return EmailMessage(**email_doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get email detail error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get email: {str(e)}"
        )

@api_router.put("/emails/{email_id}/read")
async def update_read_status(email_id: str, user_id: str, request: UpdateReadRequest):
    """
    Update email read status
    """
    try:
        result = await db.emails.update_one(
            {"id": email_id, "user_id": user_id},
            {"$set": {"is_read": request.is_read}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {"message": "Read status updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update read status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update status: {str(e)}"
        )

@api_router.delete("/emails/{email_id}")
async def delete_email(email_id: str, user_id: str):
    """
    Delete email from local cache
    """
    try:
        result = await db.emails.delete_one({
            "id": email_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Email not found")
        
        return {"message": "Email deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete email error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete email: {str(e)}"
        )

@api_router.post("/emails/send")
async def send_email(request: SendEmailRequest):
    """
    Send email via SMTP
    """
    try:
        # Get user
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(request.user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Attempting to send email from {user['email']}")
        
        # Prepare email
        msg = MIMEMultipart()
        msg['From'] = user["email"]
        msg['To'] = ", ".join(request.to)
        if request.cc:
            msg['Cc'] = ", ".join(request.cc)
        msg['Subject'] = request.subject
        msg['Date'] = email.utils.formatdate(localtime=True)
        
        # Add body
        msg.attach(MIMEText(request.body, 'plain'))
        
        # Add attachments
        if request.attachments:
            for attachment in request.attachments:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(base64.b64decode(attachment.content))
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename={attachment.filename}'
                )
                msg.attach(part)
        
        # Get SMTP config and password
        smtp_config = SMTPConfig(**user["smtp_config"])
        password = decrypt_password(user["encrypted_password"])
        
        logger.info(f"SMTP Config: host={smtp_config.host}, port={smtp_config.port}, use_tls={smtp_config.use_tls}")
        
        recipients = request.to + (request.cc if request.cc else [])
        
        # Port 465 requires use_ssl=True (implicit TLS), not start_tls
        # Port 587 requires start_tls=True (explicit TLS)
        use_tls = smtp_config.use_tls if smtp_config.port == 587 else False
        use_ssl = True if smtp_config.port == 465 else False
        
        logger.info(f"Connecting with use_tls={use_tls}, use_ssl={use_ssl}")
        
        try:
            if use_ssl:
                # Port 465 - SSL from the start
                import ssl
                context = ssl.create_default_context()
                
                # Use smtplib for better SSL support on port 465
                import smtplib
                with smtplib.SMTP_SSL(smtp_config.host, smtp_config.port, timeout=60, context=context) as server:
                    logger.info("Connected to SMTP server with SSL")
                    server.set_debuglevel(1)  # Enable verbose logging
                    server.login(user["email"], password)
                    logger.info("Login successful")
                    server.sendmail(user["email"], recipients, msg.as_string())
                    logger.info("Email sent successfully")
            else:
                # Port 587 - use aiosmtplib with STARTTLS
                await aiosmtplib.send(
                    msg,
                    hostname=smtp_config.host,
                    port=smtp_config.port,
                    username=user["email"],
                    password=password,
                    start_tls=True,
                    timeout=60
                )
                logger.info("Email sent via STARTTLS")
        except Exception as smtp_error:
            logger.error(f"SMTP connection error: {type(smtp_error).__name__}: {str(smtp_error)}")
            logger.error(traceback.format_exc())
            raise
        
        return {"message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Send email error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

@api_router.get("/folders", response_model=List[FolderInfo])
async def get_folders(user_id: str):
    """
    Get available folders from IMAP
    """
    try:
        # Get user
        from bson import ObjectId
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Connect to IMAP
        password = decrypt_password(user["encrypted_password"])
        imap_config = IMAPConfig(**user["imap_config"])
        mail = await connect_imap(user["email"], password, imap_config)
        
        # List folders
        _, folder_list = mail.list()
        folders = []
        
        # Standard folders to look for
        standard_folders = {
            'INBOX': 'INBOX',
            'Sent': 'Sent',
            'Drafts': 'Drafts', 
            'Trash': 'Trash',
            'Spam': 'Spam',
            'Junk': 'Spam'
        }
        
        found_folders = set()
        
        for folder_info in folder_list:
            try:
                # Parse folder name - handle different formats
                folder_str = folder_info.decode('utf-8', errors='ignore')
                
                # Extract folder name from IMAP response
                # Format: (\\HasNoChildren) "/" "FolderName"
                parts = folder_str.split('"')
                if len(parts) >= 3:
                    folder_name = parts[-2]
                else:
                    # Fallback parsing
                    folder_name = folder_str.split()[-1].strip('"')
                
                # Try to select folder and get count
                try:
                    mail.select(folder_name, readonly=True)
                    _, message_numbers = mail.search(None, "ALL")
                    count = len(message_numbers[0].split()) if message_numbers[0] else 0
                    
                    # Map to standard folder names
                    display_name = folder_name
                    for standard, mapped in standard_folders.items():
                        if standard.lower() in folder_name.lower():
                            display_name = mapped
                            break
                    
                    if display_name not in found_folders:
                        folders.append(FolderInfo(
                            name=display_name,
                            message_count=count
                        ))
                        found_folders.add(display_name)
                except:
                    continue
            except Exception as e:
                logger.warning(f"Error parsing folder: {e}")
                continue
        
        mail.logout()
        
        # Ensure INBOX is first
        folders.sort(key=lambda x: (x.name != 'INBOX', x.name))
        
        return folders
    except Exception as e:
        logger.error(f"Get folders error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get folders: {str(e)}"
        )

@api_router.get("/contacts")
async def get_contacts(user_id: str, limit: int = 100):
    """
    Get contact list extracted from emails
    """
    try:
        from bson import ObjectId
        
        # Get unique email addresses from sent and received emails
        emails = await db.emails.find(
            {"user_id": user_id}
        ).limit(500).to_list(500)
        
        contacts = set()
        for email_doc in emails:
            # Add recipients
            if email_doc.get("to_address"):
                for addr in email_doc["to_address"]:
                    if addr and '@' in addr:
                        contacts.add(addr)
            # Add CC
            if email_doc.get("cc_address"):
                for addr in email_doc["cc_address"]:
                    if addr and '@' in addr:
                        contacts.add(addr)
            # Add sender
            if email_doc.get("from_address") and '@' in email_doc.get("from_address", ""):
                contacts.add(email_doc["from_address"])
        
        # Remove current user's email
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            contacts.discard(user["email"])
        
        # Convert to sorted list
        contact_list = sorted(list(contacts))[:limit]
        
        return {"contacts": contact_list}
    except Exception as e:
        logger.error(f"Get contacts error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get contacts: {str(e)}"
        )

@api_router.get("/")
async def root():
    return {"message": "Mail API is running"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
