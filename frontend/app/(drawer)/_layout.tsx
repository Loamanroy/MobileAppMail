import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

function DrawerContent() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const folders = [
    { name: 'INBOX', icon: 'mail', label: 'Входящие' },
    { name: 'Sent', icon: 'paper-plane', label: 'Отправленные' },
    { name: 'Drafts', icon: 'document-text', label: 'Черновики' },
    { name: 'Trash', icon: 'trash', label: 'Корзина' },
    { name: 'Spam', icon: 'alert-circle', label: 'Спам' },
  ];

  return (
    <View style={[styles.drawerContainer, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="mail" size={40} color="#fff" />
        <Text style={styles.headerText}>Почта</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
      </View>

      <View style={styles.folders}>
        {folders.map((folder) => (
          <TouchableOpacity
            key={folder.name}
            style={styles.folderItem}
            onPress={() => router.push(`/folder/${folder.name}`)}
          >
            <Ionicons name={folder.icon as any} size={24} color={theme.colors.primary} />
            <Text style={[styles.folderLabel, { color: theme.colors.text }]}>{folder.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.settingsItem}
          onPress={() => router.push('/settings/notifications')}
        >
          <Ionicons name="settings" size={24} color={theme.colors.textSecondary} />
          <Text style={[styles.settingsText, { color: theme.colors.textSecondary }]}>Настройки</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const { theme } = useTheme();

  return (
    <Drawer
      drawerContent={() => <DrawerContent />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
        drawerStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Drawer.Screen
        name="inbox"
        options={{
          title: 'Входящие',
          drawerIcon: ({ color }) => <Ionicons name="mail" size={24} color={color} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  headerEmail: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9,
  },
  folders: {
    flex: 1,
    paddingTop: 16,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingLeft: 24,
  },
  folderLabel: {
    fontSize: 16,
    marginLeft: 16,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 16,
  },
});
