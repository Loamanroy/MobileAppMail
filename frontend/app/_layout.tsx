import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(drawer)" />
            <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
            <Stack.Screen name="email-detail" />
            <Stack.Screen name="folder/[name]" />
            <Stack.Screen name="settings/help" />
            <Stack.Screen name="settings/theme" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/autosync" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
