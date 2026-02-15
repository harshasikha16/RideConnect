import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/services/api';
import { User, UserStats, Ride } from '../src/types';
import { useAuth } from '../src/context/AuthContext';
import { RideCard } from '../src/components/RideCard';
import { UserCard } from '../src/components/UserCard';

export default function UserProfile() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activeTab, setActiveTab] = useState(tab || 'rides');
  const [rides, setRides] = useState<Ride[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    if (profile && !isPrivate) {
      fetchTabData();
    }
  }, [activeTab, profile, isPrivate]);

  const fetchProfile = async () => {
    try {
      const [userRes, statsRes, statusRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/stats/${id}`),
        api.get(`/follow/status/${id}`),
      ]);

      if (userRes.data.is_private) {
        setIsPrivate(true);
      }
      setProfile(userRes.data);
      setStats(statsRes.data);
      setFollowStatus(statusRes.data.status);
    } catch (error) {
      console.log('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    try {
      if (activeTab === 'rides') {
        const response = await api.get('/rides', { params: { limit: 20 } });
        // Filter rides by this user
        const userRides = response.data.filter((r: Ride) => r.user_id === id);
        setRides(userRides);
      } else if (activeTab === 'followers') {
        const response = await api.get(`/followers/${id}`);
        setFollowers(response.data);
      } else if (activeTab === 'following') {
        const response = await api.get(`/following/${id}`);
        setFollowing(response.data);
      }
    } catch (error) {
      console.log('Error fetching tab data:', error);
    }
  };

  const handleFollow = async () => {
    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        await api.delete(`/follow/${id}`);
        setFollowStatus(null);
        if (stats) setStats({ ...stats, followers: stats.followers - 1 });
      } else {
        const response = await api.post('/follow', { following_id: id });
        setFollowStatus(response.data.status);
        if (response.data.status === 'accepted' && stats) {
          setStats({ ...stats, followers: stats.followers + 1 });
        }
      }
    } catch (error) {
      console.log('Follow error:', error);
    }
  };

  const getFollowButtonText = () => {
    if (followStatus === 'pending') return 'Requested';
    if (followStatus === 'accepted') return 'Following';
    return 'Follow';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = currentUser?.user_id === id;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {profile.profile_picture ? (
            <Image source={{ uri: profile.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          )}

          <View style={styles.nameRow}>
            <Text style={styles.userName}>{profile.name}</Text>
            {!profile.is_public && (
              <Ionicons name="lock-closed" size={16} color="#6B7280" style={{ marginLeft: 6 }} />
            )}
          </View>

          <View style={styles.typeContainer}>
            <View style={[styles.typeBadge, profile.profile_type === 'rider' ? styles.riderBadge : styles.passengerBadge]}>
              <Text style={styles.typeBadgeText}>
                {profile.profile_type === 'rider' ? 'Driver' : 'Passenger'}
              </Text>
            </View>
          </View>

          {profile.bio && <Text style={styles.userBio}>{profile.bio}</Text>}

          {!isOwnProfile && (
            <TouchableOpacity
              style={[
                styles.followButton,
                followStatus === 'accepted' && styles.followingButton,
                followStatus === 'pending' && styles.pendingButton
              ]}
              onPress={handleFollow}
            >
              <Text style={[
                styles.followButtonText,
                (followStatus === 'accepted' || followStatus === 'pending') && styles.followingButtonText
              ]}>
                {getFollowButtonText()}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setActiveTab('followers')}
            >
              <Text style={styles.statNumber}>{stats?.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setActiveTab('following')}
            >
              <Text style={styles.statNumber}>{stats?.following || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => setActiveTab('rides')}
            >
              <Text style={styles.statNumber}>{stats?.rides || 0}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isPrivate && !isOwnProfile && followStatus !== 'accepted' ? (
          <View style={styles.privateContainer}>
            <Ionicons name="lock-closed" size={48} color="#D1D5DB" />
            <Text style={styles.privateTitle}>This account is private</Text>
            <Text style={styles.privateText}>Follow to see their rides and activity</Text>
          </View>
        ) : (
          <>
            <View style={styles.tabContainer}>
              {(['rides', 'followers', 'following'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, activeTab === t && styles.tabActive]}
                  onPress={() => setActiveTab(t)}
                >
                  <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.tabContent}>
              {activeTab === 'rides' && (
                rides.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="car-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No rides posted</Text>
                  </View>
                ) : (
                  rides.map((ride) => (
                    <RideCard
                      key={ride.ride_id}
                      ride={ride}
                      onPress={() => router.push(`/ride/${ride.ride_id}`)}
                    />
                  ))
                )
              )}

              {activeTab === 'followers' && (
                followers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No followers yet</Text>
                  </View>
                ) : (
                  followers.map((u) => (
                    <UserCard
                      key={u.user_id}
                      user={u}
                      onPress={() => router.push(`/user/${u.user_id}`)}
                      showFollowButton={false}
                    />
                  ))
                )
              )}

              {activeTab === 'following' && (
                following.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyText}>Not following anyone</Text>
                  </View>
                ) : (
                  following.map((u) => (
                    <UserCard
                      key={u.user_id}
                      user={u}
                      onPress={() => router.push(`/user/${u.user_id}`)}
                      showFollowButton={false}
                    />
                  ))
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  typeContainer: {
    marginTop: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riderBadge: {
    backgroundColor: '#DBEAFE',
  },
  passengerBadge: {
    backgroundColor: '#F3E8FF',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  userBio: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  followButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  followingButton: {
    backgroundColor: '#E5E7EB',
  },
  pendingButton: {
    backgroundColor: '#FEF3C7',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  followingButtonText: {
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  privateContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  privateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
