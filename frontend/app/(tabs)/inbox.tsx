import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Email {
  id: string;
  subject: string;
  from_address: string;
  date: string;
  is_read: boolean;
  body_text?: string;
}

export default function InboxScreen() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const router = useRouter();

  // Reload emails when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadEmails();
    }, [])
  );

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/emails?user_id=${user?.userId}&folder=INBOX&limit=50`
      );
      const data = await response.json();
      setEmails(data);
      
      // Count unread emails
      const unread = data.filter((email: Email) => !email.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load emails:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить письма');
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/emails/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.userId,
          folder: 'INBOX',
          limit: 50,
        }),
      });

      if (response.ok) {
        await loadEmails();
      }
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Ошибка', 'Не удалось синхронизировать письма');
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Вчера';
    } else if (days < 7) {
      return `${days} дн. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  const renderEmailItem = ({ item }: { item: Email }) => (
    <TouchableOpacity
      style={styles.emailItem}
      onPress={() => router.push(`/email-detail?id=${item.id}`)}
    >
      <View style={styles.emailHeader}>
        <View style={styles.fromContainer}>
          {!item.is_read && <View style={styles.unreadDot} />}
          <Text style={[styles.from, !item.is_read && styles.unreadText]} numberOfLines={1}>
            {item.from_address}
          </Text>
        </View>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
      </View>
      <Text style={[styles.subject, !item.is_read && styles.unreadText]} numberOfLines={1}>
        {item.subject || '(Без темы)'}
      </Text>
      <Text style={styles.preview} numberOfLines={2}>
        {item.body_text || ''}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={emails}
        renderItem={renderEmailItem}
        estimatedItemSize={100}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={syncEmails} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет писем</Text>
            <TouchableOpacity style={styles.syncButton} onPress={syncEmails}>
              <Text style={styles.syncButtonText}>Синхронизировать</Text>
            </TouchableOpacity>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/compose')}
      >
        <Ionicons name="create" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emailItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  emailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fromContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  from: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  unreadText: {
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  subject: {
    fontSize: 15,
    color: '#000',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});
