import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { RideCard } from '../../src/components/RideCard';
import { UserCard } from '../../src/components/UserCard';
import { Ride, User } from '../../src/types';
import { useAuth } from '../../src/context/AuthContext';

export default function Search() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'rides' | 'users'>('rides');
  const [rides, setRides] = useState<Ride[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [followStatuses, setFollowStatuses] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounce = setTimeout(() => {
        search();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setRides([]);
      setUsers([]);
    }
  }, [searchQuery, searchType]);

  const search = async () => {
    setLoading(true);
    try {
      if (searchType === 'rides') {
        const response = await api.get('/rides', {
          params: { origin: searchQuery, destination: searchQuery }
        });
        setRides(response.data);
      } else {
        const response = await api.get('/users', {
          params: { q: searchQuery }
        });
        setUsers(response.data);
        
        // Fetch follow statuses
        const statuses: Record<string, string | null> = {};
        for (const u of response.data) {
          if (u.user_id !== currentUser?.user_id) {
            try {
              const statusRes = await api.get(`/follow/status/${u.user_id}`);
              statuses[u.user_id] = statusRes.data.status;
            } catch {
              statuses[u.user_id] = null;
            }
          }
        }
        setFollowStatuses(statuses);
      }
    } catch (error) {
      console.log('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      if (followStatuses[userId] === 'accepted' || followStatuses[userId] === 'pending') {
        await api.delete(`/follow/${userId}`);
        setFollowStatuses(prev => ({ ...prev, [userId]: null }));
      } else {
        const response = await api.post('/follow', { following_id: userId });
        setFollowStatuses(prev => ({ ...prev, [userId]: response.data.status }));
      }
    } catch (error) {
      console.log('Follow error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder={searchType === 'rides' ? 'Search rides...' : 'Search users...'}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, searchType === 'rides' && styles.typeButtonActive]}
            onPress={() => setSearchType('rides')}
          >
            <Ionicons name="car" size={18} color={searchType === 'rides' ? '#fff' : '#6B7280'} />
            <Text style={[styles.typeText, searchType === 'rides' && styles.typeTextActive]}>Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, searchType === 'users' && styles.typeButtonActive]}
            onPress={() => setSearchType('users')}
          >
            <Ionicons name="people" size={18} color={searchType === 'users' ? '#fff' : '#6B7280'} />
            <Text style={[styles.typeText, searchType === 'users' && styles.typeTextActive]}>Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={searchType === 'rides' ? rides : users}
          renderItem={({ item }) =>
            searchType === 'rides' ? (
              <RideCard
                ride={item as Ride}
                onPress={() => router.push(`/ride/${(item as Ride).ride_id}`)}
              />
            ) : (
              <UserCard
                user={item as User}
                onPress={() => router.push(`/user/${(item as User).user_id}`)}
                isFollowing={followStatuses[(item as User).user_id] === 'accepted'}
                followStatus={followStatuses[(item as User).user_id] as any}
                onFollow={() => handleFollow((item as User).user_id)}
                showFollowButton={(item as User).user_id !== currentUser?.user_id}
              />
            )
          }
          keyExtractor={(item) => (searchType === 'rides' ? (item as Ride).ride_id : (item as User).user_id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery.length >= 2 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Start typing to search</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  typeContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
});
