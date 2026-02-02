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
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface Folder {
  name: string;
  message_count: number;
}

const FOLDER_ICONS: { [key: string]: string } = {
  'INBOX': 'mail',
  'Sent': 'paper-plane',
  'Drafts': 'document-text',
  'Trash': 'trash',
  'Spam': 'alert-circle',
};

export default function FoldersScreen() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { theme } = useTheme();
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

  const styles = createStyles(theme.colors);

  const renderFolderItem = ({ item }: { item: Folder }) => (
    <TouchableOpacity style={[styles.folderItem, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
      <View style={styles.folderContent}>
        <Ionicons name={(FOLDER_ICONS[item.name] || 'folder') as any} size={24} color={theme.colors.primary} />
        <Text style={[styles.folderName, { color: theme.colors.text }]}>{item.name}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.badgeText}>{item.message_count}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={folders}
        renderItem={renderFolderItem}
        estimatedItemSize={60}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Нет папок</Text>
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
              onPress={loadFolders}
            >
              <Text style={styles.refreshButtonText}>Обновить</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
  },
  folderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  folderName: {
    fontSize: 16,
    marginLeft: 12,
  },
  badge: {
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
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
