import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function HelpScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const styles = createStyles(theme.colors);

  const sendEmail = () => {
    Linking.openURL('mailto:support@example.com?subject=Вопрос по приложению Почта');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Помощь</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Ionicons name="help-circle" size={64} color={theme.colors.primary} style={styles.icon} />
          
          <Text style={[styles.title, { color: theme.colors.text }]}>Нужна помощь?</Text>
          
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            В случае возникновения вопросов и предложений по улучшению приложения обращайтесь к Баркину Тимуру Михайловичу.
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Часто задаваемые вопросы</Text>
            
            <View style={styles.faqItem}>
              <Text style={[styles.question, { color: theme.colors.text }]}>Как синхронизировать письма?</Text>
              <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>
                Потяните список писем вниз (pull-to-refresh) для синхронизации с сервером.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={[styles.question, { color: theme.colors.text }]}>Как изменить тему оформления?</Text>
              <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>
                Перейдите в Настройки → Тема и выберите понравившийся вариант.
              </Text>
            </View>

            <View style={styles.faqItem}>
              <Text style={[styles.question, { color: theme.colors.text }]}>Работает ли приложение офлайн?</Text>
              <Text style={[styles.answer, { color: theme.colors.textSecondary }]}>
                Да! Все синхронизированные письма доступны без интернета.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
            onPress={sendEmail}
          >
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Связаться с поддержкой</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    borderBottomColor: colors.border,
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 20,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
