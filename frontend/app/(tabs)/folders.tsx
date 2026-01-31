import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Folder {
  name: string;
  message_count: number;
}

export default function FoldersScreen() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/folders?user_id=${user?.userId}`
      );
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('Failed to load folders:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить папки');
    } finally {
      setLoading(false);
    }
  };

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity style={styles.folderItem}>
      <View style={styles.folderContent}>
        <Ionicons name="folder-outline" size={24} color="#007AFF" />
        <Text style={styles.folderName}>{item.name}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.message_count}</Text>
      </View>
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
        data={folders}
        renderItem={renderFolderItem}
        estimatedItemSize={60}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Нет папок</Text>
          </View>
        }
      />
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
  folderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  },
});
