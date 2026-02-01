import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    notification: string;
  };
  backgroundImage?: string;
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'Классическая',
    colors: {
      primary: '#007AFF',
      background: '#f5f5f5',
      card: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      border: '#e0e0e0',
      notification: '#FF3B30',
    },
  },
  {
    id: 'dark',
    name: 'Тёмная',
    colors: {
      primary: '#0A84FF',
      background: '#000000',
      card: '#1C1C1E',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      border: '#38383A',
      notification: '#FF453A',
    },
  },
  {
    id: 'ocean',
    name: 'Океан',
    colors: {
      primary: '#00CED1',
      background: '#E0F7FA',
      card: '#FFFFFF',
      text: '#004D40',
      textSecondary: '#00796B',
      border: '#B2DFDB',
      notification: '#FF6F61',
    },
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 'sunset',
    name: 'Закат',
    colors: {
      primary: '#FF6B6B',
      background: '#FFF5F5',
      card: '#FFFFFF',
      text: '#2D3748',
      textSecondary: '#718096',
      border: '#FFE4E1',
      notification: '#E53E3E',
    },
    backgroundImage: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 'forest',
    name: 'Лес',
    colors: {
      primary: '#48BB78',
      background: '#F0FFF4',
      card: '#FFFFFF',
      text: '#22543D',
      textSecondary: '#2F855A',
      border: '#C6F6D5',
      notification: '#FC8181',
    },
    backgroundImage: 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
  },
  {
    id: 'purple',
    name: 'Фиолетовая',
    colors: {
      primary: '#9F7AEA',
      background: '#FAF5FF',
      card: '#FFFFFF',
      text: '#44337A',
      textSecondary: '#6B46C1',
      border: '#E9D8FD',
      notification: '#F56565',
    },
    backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
];

interface ThemeContextType {
  theme: Theme;
  themes: Theme[];
  setTheme: (themeId: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedThemeId = await AsyncStorage.getItem('theme');
      if (savedThemeId) {
        const theme = themes.find((t) => t.id === savedThemeId);
        if (theme) {
          setCurrentTheme(theme);
        }
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (themeId: string) => {
    try {
      const theme = themes.find((t) => t.id === themeId);
      if (theme) {
        await AsyncStorage.setItem('theme', themeId);
        setCurrentTheme(theme);
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themes, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
