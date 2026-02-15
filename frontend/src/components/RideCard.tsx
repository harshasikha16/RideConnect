import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Ride } from '../types';

interface RideCardProps {
  ride: Ride;
  onPress?: () => void;
}

export function RideCard({ ride, onPress }: RideCardProps) {
  const dateTime = new Date(ride.date_time);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {ride.user?.profile_picture ? (
            <Image source={{ uri: ride.user.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{ride.user?.name || 'Unknown'}</Text>
            <Text style={styles.userType}>
              {ride.user?.profile_type === 'rider' ? 'Driver' : 'Passenger'}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, ride.ride_type === 'offering' ? styles.offeringBadge : styles.requestingBadge]}>
          <Text style={styles.badgeText}>
            {ride.ride_type === 'offering' ? 'Offering' : 'Requesting'}
          </Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={18} color="#4CAF50" />
          <Text style={styles.locationText}>{ride.origin}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.locationRow}>
          <Ionicons name="navigate" size={18} color="#F44336" />
          <Text style={styles.locationText}>{ride.destination}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.detailText}>{format(dateTime, 'MMM dd, yyyy')}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.detailText}>{format(dateTime, 'HH:mm')}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people" size={16} color="#666" />
          <Text style={styles.detailText}>{ride.available_seats} seats</Text>
        </View>
        {ride.price && (
          <View style={styles.detailItem}>
            <Ionicons name="cash" size={16} color="#666" />
            <Text style={styles.detailText}>${ride.price}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
  userType: {
    fontSize: 12,
    color: '#6B7280',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offeringBadge: {
    backgroundColor: '#E8F5E9',
  },
  requestingBadge: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  route: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 8,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#6B7280',
  },
});
