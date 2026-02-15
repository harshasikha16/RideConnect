import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { api } from '../src/services/api';
import { Ride } from '../src/types';
import { useAuth } from '../src/context/AuthContext';

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    fetchRide();
  }, [id]);

  const fetchRide = async () => {
    try {
      const response = await api.get(`/rides/${id}`);
      setRide(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRide = async () => {
    setRequesting(true);
    try {
      await api.post('/rides/request', {
        ride_id: id,
        message: message || null,
      });
      Alert.alert('Success', 'Ride request sent!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to request ride');
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelRide = async () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/rides/${id}`, { status: 'cancelled' });
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel ride');
          }
        },
      },
    ]);
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

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Ride not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = ride.user_id === user?.user_id;
  const dateTime = new Date(ride.date_time);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userSection}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={() => router.push(`/user/${ride.user?.user_id}`)}
          >
            {ride.user?.profile_picture ? (
              <Image source={{ uri: ride.user.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={28} color="#fff" />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{ride.user?.name}</Text>
              <Text style={styles.userType}>
                {ride.user?.profile_type === 'rider' ? 'Driver' : 'Passenger'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.badge, ride.ride_type === 'offering' ? styles.offeringBadge : styles.requestingBadge]}>
            <Text style={styles.badgeText}>
              {ride.ride_type === 'offering' ? 'Offering Ride' : 'Requesting Ride'}
            </Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeIconContainer}>
              <View style={[styles.routeDot, { backgroundColor: '#4CAF50' }]} />
              <View style={styles.routeLine} />
              <View style={[styles.routeDot, { backgroundColor: '#F44336' }]} />
            </View>
            <View style={styles.routeTextContainer}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>From</Text>
                <Text style={styles.locationText}>{ride.origin}</Text>
              </View>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>To</Text>
                <Text style={styles.locationText}>{ride.destination}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={22} color="#3B82F6" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{format(dateTime, 'EEEE, MMM dd, yyyy')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time" size={22} color="#3B82F6" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{format(dateTime, 'HH:mm')}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="people" size={22} color="#3B82F6" />
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Available Seats</Text>
                <Text style={styles.detailValue}>{ride.available_seats}</Text>
              </View>
            </View>
          </View>

          {ride.price && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cash" size={22} color="#3B82F6" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Price per Seat</Text>
                  <Text style={styles.detailValue}>${ride.price}</Text>
                </View>
              </View>
            </View>
          )}

          {ride.car_details && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="car-sport" size={22} color="#3B82F6" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Car</Text>
                  <Text style={styles.detailValue}>{ride.car_details}</Text>
                </View>
              </View>
            </View>
          )}

          {ride.preferences && (
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="list" size={22} color="#3B82F6" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Preferences</Text>
                  <Text style={styles.detailValue}>{ride.preferences}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {showRequestForm && !isOwner && (
          <View style={styles.requestForm}>
            <Text style={styles.requestFormTitle}>Send a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Hi, I'd like to join your ride..."
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={handleCancelRide}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        ) : ride.available_seats > 0 && ride.status === 'active' ? (
          showRequestForm ? (
            <TouchableOpacity
              style={[styles.footerButton, styles.requestButton]}
              onPress={handleRequestRide}
              disabled={requesting}
            >
              {requesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.requestButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.footerButton, styles.requestButton]}
              onPress={() => setShowRequestForm(true)}
            >
              <Text style={styles.requestButtonText}>Request to Join</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={[styles.footerButton, styles.disabledButton]}>
            <Text style={styles.disabledButtonText}>
              {ride.status !== 'active' ? 'Ride not available' : 'No seats available'}
            </Text>
          </View>
        )}
      </View>
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
  content: {
    padding: 16,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  userType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  offeringBadge: {
    backgroundColor: '#D1FAE5',
  },
  requestingBadge: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  routeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
  },
  routeIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeLine: {
    width: 2,
    height: 50,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  routeTextContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationItem: {
    paddingVertical: 8,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTextContainer: {
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 2,
  },
  requestForm: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  requestFormTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  messageInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButton: {
    backgroundColor: '#3B82F6',
  },
  requestButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});
