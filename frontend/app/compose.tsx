import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ComposeScreen() {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [contacts, setContacts] = useState<string[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/contacts?user_id=${user?.userId}&limit=100`
      );
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleToChange = (text: string) => {
    setTo(text);
    
    // Filter contacts
    if (text.length > 0) {
      const filtered = contacts.filter(contact => 
        contact.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContacts(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectContact = (contact: string) => {
    setTo(contact);
    setShowSuggestions(false);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);

    try {
      const toList = to.split(',').map(email => email.trim());
      const ccList = cc ? cc.split(',').map(email => email.trim()) : [];

      const response = await fetch(`${BACKEND_URL}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.userId,
          to: toList,
          cc: ccList,
          subject,
          body,
          attachments: [],
        }),
      });

      if (response.ok) {
        Alert.alert('Успех', 'Письмо отправлено', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Ошибка', data.detail || 'Не удалось отправить письмо');
      }
    } catch (error) {
      console.error('Send failed:', error);
      Alert.alert('Ошибка', 'Не удалось отправить письмо');
    } finally {
      setLoading(false);
    }
  };

  const styles = createStyles(theme.colors);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Новое письмо</Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading}
          style={styles.sendButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="send" size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Кому:</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={to}
            onChangeText={handleToChange}
            placeholder="email@example.com"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {showSuggestions && (
          <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.card }]}>
            {filteredContacts.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, { borderBottomColor: theme.colors.border }]}
                onPress={() => selectContact(contact)}
              >
                <Ionicons name="person-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{contact}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!showCc && (
          <TouchableOpacity
            style={styles.ccButton}
            onPress={() => setShowCc(true)}
          >
            <Text style={[styles.ccButtonText, { color: theme.colors.primary }]}>Добавить CC</Text>
          </TouchableOpacity>
        )}

        {showCc && (
          <>
            <View style={[styles.inputRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>CC:</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                value={cc}
                onChangeText={setCc}
                placeholder="email@example.com"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </>
        )}

        <View style={[styles.inputRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Тема:</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={subject}
            onChangeText={setSubject}
            placeholder="Тема письма"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <TextInput
          style={[styles.bodyInput, { color: theme.colors.text, backgroundColor: theme.colors.card }]}
          value={body}
          onChangeText={setBody}
          placeholder="Текст письма..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    marginTop: 40,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sendButton: {
    padding: 8,
  },
  form: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
    width: 70,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  ccButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ccButtonText: {
    fontSize: 14,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    minHeight: 300,
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    marginLeft: 8,
  },
});
