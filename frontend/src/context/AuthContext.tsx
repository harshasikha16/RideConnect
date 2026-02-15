import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { api } from '../services/api';

interface User {
  user_id: string;
  email?: string;
  phone?: string;
  name: string;
  profile_picture?: string;
  bio?: string;
  profile_type: string;
  is_public: boolean;
  auth_type: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.log('Not authenticated');
      await AsyncStorage.removeItem('session_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('session_token', response.data.session_token);
    await refreshUser();
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', {
      name,
      email,
      password,
      auth_type: 'email'
    });
    await AsyncStorage.setItem('session_token', response.data.session_token);
    await refreshUser();
  };

  const loginWithGoogle = async () => {
    try {
      const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const redirectUrl = Platform.OS === 'web'
        ? `${BACKEND_URL}/`
        : Linking.createURL('/');

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        let sessionId: string | null = null;

        // Check hash first, then query params
        const hashMatch = url.match(/#session_id=([^&]+)/);
        const queryMatch = url.match(/[?&]session_id=([^&]+)/);

        if (hashMatch) sessionId = hashMatch[1];
        else if (queryMatch) sessionId = queryMatch[1];

        if (sessionId) {
          const response = await api.post('/auth/google/callback', { session_id: sessionId });
          await AsyncStorage.setItem('session_token', response.data.session_token);
          await refreshUser();
        }
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const loginAsGuest = async () => {
    const response = await api.post('/auth/guest');
    await AsyncStorage.setItem('session_token', response.data.session_token);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.log('Logout error:', error);
    }
    await AsyncStorage.removeItem('session_token');
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    const response = await api.put('/users/me', updates);
    setUser(response.data);
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        loginAsGuest,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
