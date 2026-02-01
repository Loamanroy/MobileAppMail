import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface EmailAttachment {
  filename: string;
  content: string;
  content_type: string;
  size: number;
}

interface EmailDetail {
  id: string;
  subject: string;
  from_address: string;
  to_address: string[];
  cc_address?: string[];
  date: string;
  body_text?: string;
  body_html?: string;
  attachments: EmailAttachment[];
  is_read: boolean;
}

export default function EmailDetailScreen() {
  const { id } = useLocalSearchParams();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();

  useEffect(() => {
    loadEmail();
  }, [id]);

  const loadEmail = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/emails/${id}?user_id=${user?.userId}`
      );
      const data = await response.json();
      setEmail(data);

      // Mark as read
      if (!data.is_read) {
        await fetch(`${BACKEND_URL}/api/emails/${id}/read?user_id=${user?.userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_read: true }),
        });
        // Update local state to reflect read status
        setEmail({...data, is_read: true});
      }
    } catch (error) {
      console.error('Failed to load email:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить письмо');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить письмо',
      'Вы уверены?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${BACKEND_URL}/api/emails/${id}?user_id=${user?.userId}`, {
                method: 'DELETE',
              });
              router.back();
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить письмо');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!email) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Письмо не найдено</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subject}>{email.subject || '(Без темы)'}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.infoLabel}>От:</Text>
            <Text style={styles.infoValue}>{email.from_address}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color="#666" />
            <Text style={styles.infoLabel}>Кому:</Text>
            <Text style={styles.infoValue}>{email.to_address.join(', ')}</Text>
          </View>

          {email.cc_address && email.cc_address.length > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="copy" size={20} color="#666" />
              <Text style={styles.infoLabel}>CC:</Text>
              <Text style={styles.infoValue}>{email.cc_address.join(', ')}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time" size={20} color="#666" />
            <Text style={styles.infoLabel}>Дата:</Text>
            <Text style={styles.infoValue}>{formatDate(email.date)}</Text>
          </View>
        </View>

        {email.attachments && email.attachments.length > 0 && (
          <View style={styles.attachmentsSection}>
            <Text style={styles.attachmentsTitle}>
              Вложения ({email.attachments.length})
            </Text>
            {email.attachments.map((attachment, index) => (
              <View key={index} style={styles.attachmentItem}>
                <Ionicons name="document" size={24} color="#007AFF" />
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName}>{attachment.filename}</Text>
                  <Text style={styles.attachmentSize}>
                    {formatFileSize(attachment.size)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bodySection}>
          {email.body_html ? (
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: email.body_html }}
              tagsStyles={{
                body: { color: '#000', fontSize: 16, lineHeight: 24 },
                p: { marginBottom: 12 },
                a: { color: '#007AFF' },
              }}
            />
          ) : (
            <Text style={styles.bodyText}>
              {email.body_text || 'Пустое письмо'}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  subject: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    padding: 16,
    paddingBottom: 8,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  attachmentsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  attachmentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bodySection: {
    padding: 16,
  },
  bodyText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});
