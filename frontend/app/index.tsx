import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import * as Linking from 'expo-linking';
import { api } from '../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    handleAuthRedirect();
  }, []);

  useEffect(() => {
    if (!loading && !checking) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, checking]);

  const handleAuthRedirect = async () => {
    try {
      // Check for session_id in URL (Google OAuth callback)
      let sessionId: string | null = null;

      if (Platform.OS === 'web') {
        const hash = window.location.hash;
        const search = window.location.search;
        
        const hashMatch = hash.match(/session_id=([^&]+)/);
        const searchMatch = search.match(/session_id=([^&]+)/);
        
        if (hashMatch) sessionId = hashMatch[1];
        else if (searchMatch) sessionId = searchMatch[1];

        // Clean URL
        if (sessionId) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        const url = await Linking.getInitialURL();
        if (url) {
          const hashMatch = url.match(/#session_id=([^&]+)/);
          const queryMatch = url.match(/[?&]session_id=([^&]+)/);
          if (hashMatch) sessionId = hashMatch[1];
          else if (queryMatch) sessionId = queryMatch[1];
        }
      }

      if (sessionId) {
        // Exchange session_id for session_token
        const response = await api.post('/auth/google/callback', { session_id: sessionId });
        await AsyncStorage.setItem('session_token', response.data.session_token);
        await refreshUser();
      }
    } catch (error) {
      console.log('Auth redirect error:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>RideConnect</Text>
        <Text style={styles.tagline}>Share rides, save money</Text>
      </View>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
});
