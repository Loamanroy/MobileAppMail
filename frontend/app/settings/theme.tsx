import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeScreen() {
  const router = useRouter();
  const { theme: currentTheme, themes, setTheme } = useTheme();

  const handleSelectTheme = async (themeId: string) => {
    await setTheme(themeId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Тема оформления</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>ВЫБЕРИТЕ ТЕМУ</Text>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.id}
            style={styles.themeItem}
            onPress={() => handleSelectTheme(theme.id)}
          >
            <View style={styles.themeLeft}>
              <View style={[styles.colorPreview, { backgroundColor: theme.colors.primary }]} />
              <View style={styles.themeInfo}>
                <Text style={styles.themeName}>{theme.name}</Text>
                <View style={styles.colorRow}>
                  <View style={[styles.colorDot, { backgroundColor: theme.colors.primary }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.colors.card }]} />
                  <View style={[styles.colorDot, { backgroundColor: theme.colors.text }]} />
                </View>
              </View>
            </View>
            {currentTheme.id === theme.id && (
              <Ionicons name="checkmark-circle" size={28} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.infoText}>
            Выбранная тема будет применена ко всему приложению и сохранится после перезапуска.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
    paddingBottom: 8,
  },
  themeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 1,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  colorRow: {
    flexDirection: 'row',
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
