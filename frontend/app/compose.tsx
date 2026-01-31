import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  const router = useRouter();

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новое письмо</Text>
        <TouchableOpacity
          onPress={handleSend}
          disabled={loading}
          style={styles.sendButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="send" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.inputRow}>
          <Text style={styles.label}>Кому:</Text>
          <TextInput
            style={styles.input}
            value={to}
            onChangeText={setTo}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.divider} />

        {!showCc && (
          <TouchableOpacity
            style={styles.ccButton}
            onPress={() => setShowCc(true)}
          >
            <Text style={styles.ccButtonText}>Добавить CC</Text>
          </TouchableOpacity>
        )}

        {showCc && (
          <>
            <View style={styles.inputRow}>
              <Text style={styles.label}>CC:</Text>
              <TextInput
                style={styles.input}
                value={cc}
                onChangeText={setCc}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.divider} />
          </>
        )}

        <View style={styles.inputRow}>
          <Text style={styles.label}>Тема:</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Тема письма"
          />
        </View>

        <View style={styles.divider} />

        <TextInput
          style={styles.bodyInput}
          value={body}
          onChangeText={setBody}
          placeholder="Текст письма..."
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
  },
  label: {
    fontSize: 16,
    color: '#666',
    width: 70,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  ccButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ccButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 16,
    minHeight: 300,
  },
});
