import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/services/api';
import { UserStats, Ride } from '@/src/types';

export default function Profile() {
  const router = useRouter();
  const { user, logout, updateUser, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, ridesRes] = await Promise.all([
        api.get(`/stats/${user?.user_id}`),
        api.get('/rides/my'),
      ]);
      setStats(statsRes.data);
      setMyRides(ridesRes.data);
    } catch (error) {
      console.log('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await updateUser({ profile_picture: base64Image });
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile picture');
      }
    }
  };

  const handleToggleProfileType = async () => {
    const newType = user?.profile_type === 'rider' ? 'passenger' : 'rider';
    try {
      await updateUser({ profile_type: newType });
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile type');
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      await updateUser({ is_public: !user?.is_public });
    } catch (error) {
      Alert.alert('Error', 'Failed to update privacy setting');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateUser({ name: editName, bio: editBio });
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
            {user?.profile_picture ? (
              <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#fff" />
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email || user?.phone || 'Guest User'}</Text>

          {user?.bio && <Text style={styles.userBio}>{user.bio}</Text>}

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setEditName(user?.name || '');
              setEditBio(user?.bio || '');
              setEditModalVisible(true);
            }}
          >
            <Ionicons name="pencil" size={16} color="#3B82F6" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <View style={styles.statsContainer}>
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => user && router.push(`/user/${user.user_id}?tab=followers`)}
            >
              <Text style={styles.statNumber}>{stats?.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => user && router.push(`/user/${user.user_id}?tab=following`)}
            >
              <Text style={styles.statNumber}>{stats?.following || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.rides || 0}</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="car" size={22} color="#3B82F6" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Profile Type</Text>
                <Text style={styles.settingValue}>
                  {user?.profile_type === 'rider' ? 'Driver (Rider)' : 'Passenger'}
                </Text>
              </View>
            </View>
            <Switch
              value={user?.profile_type === 'rider'}
              onValueChange={handleToggleProfileType}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={user?.profile_type === 'rider' ? '#3B82F6' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons 
                name={user?.is_public ? 'globe-outline' : 'lock-closed-outline'} 
                size={22} 
                color="#3B82F6" 
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Profile Privacy</Text>
                <Text style={styles.settingValue}>
                  {user?.is_public ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>
            <Switch
              value={user?.is_public}
              onValueChange={handleTogglePrivacy}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={user?.is_public ? '#3B82F6' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.ridesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Rides</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/post')}>
              <Text style={styles.seeAllText}>Post New</Text>
            </TouchableOpacity>
          </View>

          {myRides.length === 0 ? (
            <View style={styles.emptyRides}>
              <Ionicons name="car-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No rides posted yet</Text>
            </View>
          ) : (
            myRides.slice(0, 3).map((ride) => (
              <TouchableOpacity
                key={ride.ride_id}
                style={styles.rideItem}
                onPress={() => router.push(`/ride/${ride.ride_id}`)}
              >
                <View style={styles.rideInfo}>
                  <Text style={styles.rideRoute}>
                    {ride.origin} → {ride.destination}
                  </Text>
                  <Text style={styles.rideDate}>
                    {new Date(ride.date_time).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.rideBadge,
                  ride.status === 'active' && styles.activeBadge,
                  ride.status === 'completed' && styles.completedBadge,
                ]}>
                  <Text style={styles.rideBadgeText}>{ride.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
              />

              <Text style={styles.inputLabel}>Bio</Text>
              <TextInput
                style={[styles.modalInput, styles.bioInput]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
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
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
  },
  editButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
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
  settingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  settingValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  ridesSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyRides: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  rideItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rideInfo: {
    flex: 1,
  },
  rideRoute: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  rideDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  completedBadge: {
    backgroundColor: '#DBEAFE',
  },
  rideBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalForm: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
