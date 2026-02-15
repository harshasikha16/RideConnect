import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../types';

interface UserCardProps {
  user: User;
  onPress?: () => void;
  isFollowing?: boolean;
  followStatus?: 'pending' | 'accepted' | null;
  onFollow?: () => void;
  showFollowButton?: boolean;
}

export function UserCard({ user, onPress, isFollowing, followStatus, onFollow, showFollowButton = true }: UserCardProps) {
  const getFollowButtonText = () => {
    if (followStatus === 'pending') return 'Requested';
    if (isFollowing) return 'Following';
    return 'Follow';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        {user.profile_picture ? (
          <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.name}>{user.name}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, user.profile_type === 'rider' ? styles.riderBadge : styles.passengerBadge]}>
              <Text style={styles.badgeText}>
                {user.profile_type === 'rider' ? 'Driver' : 'Passenger'}
              </Text>
            </View>
            {!user.is_public && (
              <Ionicons name="lock-closed" size={14} color="#6B7280" style={{ marginLeft: 6 }} />
            )}
          </View>
        </View>
      </View>

      {showFollowButton && onFollow && (
        <TouchableOpacity
          style={[
            styles.followButton,
            isFollowing && styles.followingButton,
            followStatus === 'pending' && styles.pendingButton
          ]}
          onPress={onFollow}
        >
          <Text style={[
            styles.followButtonText,
            (isFollowing || followStatus === 'pending') && styles.followingButtonText
          ]}>
            {getFollowButtonText()}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riderBadge: {
    backgroundColor: '#DBEAFE',
  },
  passengerBadge: {
    backgroundColor: '#F3E8FF',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#374151',
  },
  followButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 13,
  },
  followingButtonText: {
    color: '#374151',
  },
});
