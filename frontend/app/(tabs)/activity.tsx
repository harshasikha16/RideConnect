import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { RideRequest, Follow } from '../../src/types';
import { format } from 'date-fns';

export default function Activity() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rides' | 'follows'>('rides');
  const [rideRequests, setRideRequests] = useState<any[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'rides') {
        const response = await api.get('/rides/requests/received');
        setRideRequests(response.data);
      } else {
        const response = await api.get('/follow/requests');
        setFollowRequests(response.data);
      }
    } catch (error) {
      console.log('Error fetching activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRideRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.put(`/rides/requests/${requestId}?action=${action}`);
      fetchData();
    } catch (error) {
      console.log('Error handling ride request:', error);
    }
  };

  const handleFollowRequest = async (followId: string, action: 'accept' | 'reject') => {
    try {
      await api.put(`/follow/requests/${followId}?action=${action}`);
      fetchData();
    } catch (error) {
      console.log('Error handling follow request:', error);
    }
  };

  const renderRideRequest = ({ item }: { item: any }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.userName}>{item.requester?.name || 'Unknown'}</Text>
            <Text style={styles.requestTime}>
              {format(new Date(item.created_at), 'MMM dd, HH:mm')}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, 
          item.status === 'pending' && styles.pendingBadge,
          item.status === 'accepted' && styles.acceptedBadge,
          item.status === 'rejected' && styles.rejectedBadge
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.rideInfo}>
        <Text style={styles.rideRoute}>
          {item.ride?.origin} → {item.ride?.destination}
        </Text>
        {item.message && (
          <Text style={styles.message}>"{item.message}"</Text>
        )}
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleRideRequest(item.request_id, 'accept')}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleRideRequest(item.request_id, 'reject')}
          >
            <Ionicons name="close" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFollowRequest = ({ item }: { item: any }) => (
    <View style={styles.requestCard}>
      <TouchableOpacity 
        style={styles.requestHeader}
        onPress={() => router.push(`/user/${item.follower?.user_id}`)}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.userName}>{item.follower?.name || 'Unknown'}</Text>
            <Text style={styles.requestTime}>wants to follow you</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleFollowRequest(item.follow_id, 'accept')}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleFollowRequest(item.follow_id, 'reject')}
        >
          <Ionicons name="close" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rides' && styles.tabActive]}
          onPress={() => setActiveTab('rides')}
        >
          <Ionicons 
            name="car" 
            size={18} 
            color={activeTab === 'rides' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'rides' && styles.tabTextActive]}>
            Ride Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'follows' && styles.tabActive]}
          onPress={() => setActiveTab('follows')}
        >
          <Ionicons 
            name="person-add" 
            size={18} 
            color={activeTab === 'follows' ? '#3B82F6' : '#6B7280'} 
          />
          <Text style={[styles.tabText, activeTab === 'follows' && styles.tabTextActive]}>
            Follow Requests
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'rides' ? rideRequests : followRequests}
          renderItem={activeTab === 'rides' ? renderRideRequest : renderFollowRequest}
          keyExtractor={(item) => activeTab === 'rides' ? item.request_id : item.follow_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No {activeTab === 'rides' ? 'ride' : 'follow'} requests</Text>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
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
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  acceptedBadge: {
    backgroundColor: '#D1FAE5',
  },
  rejectedBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  rideInfo: {
    marginBottom: 12,
  },
  rideRoute: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
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
