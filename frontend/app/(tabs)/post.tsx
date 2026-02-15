import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';

export default function Post() {
  const router = useRouter();
  const { user } = useAuth();
  const [rideType, setRideType] = useState<'offering' | 'requesting'>(
    user?.profile_type === 'rider' ? 'offering' : 'requesting'
  );
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState('1');
  const [price, setPrice] = useState('');
  const [carDetails, setCarDetails] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePost = async () => {
    if (!origin || !destination) {
      Alert.alert('Error', 'Please fill in origin and destination');
      return;
    }

    if (parseInt(seats) < 1) {
      Alert.alert('Error', 'Please enter at least 1 seat');
      return;
    }

    setLoading(true);
    try {
      const rideData = {
        origin,
        destination,
        date_time: dateTime.toISOString(),
        available_seats: parseInt(seats),
        ride_type: rideType,
        price: price ? parseFloat(price) : null,
        car_details: carDetails || null,
        preferences: preferences || null,
      };

      await api.post('/rides', rideData);
      Alert.alert('Success', 'Ride posted successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
      
      // Reset form
      setOrigin('');
      setDestination('');
      setSeats('1');
      setPrice('');
      setCarDetails('');
      setPreferences('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to post ride');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateTime(selectedDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(newDateTime);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Post a Ride</Text>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeOption, rideType === 'offering' && styles.typeOptionActive]}
              onPress={() => setRideType('offering')}
            >
              <Ionicons
                name="car"
                size={24}
                color={rideType === 'offering' ? '#fff' : '#6B7280'}
              />
              <Text style={[styles.typeOptionText, rideType === 'offering' && styles.typeOptionTextActive]}>
                I'm Offering
              </Text>
              <Text style={[styles.typeOptionSubtext, rideType === 'offering' && styles.typeOptionSubtextActive]}>
                I have a car
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeOption, rideType === 'requesting' && styles.typeOptionActive]}
              onPress={() => setRideType('requesting')}
            >
              <Ionicons
                name="hand-left"
                size={24}
                color={rideType === 'requesting' ? '#fff' : '#6B7280'}
              />
              <Text style={[styles.typeOptionText, rideType === 'requesting' && styles.typeOptionTextActive]}>
                I Need a Ride
              </Text>
              <Text style={[styles.typeOptionSubtext, rideType === 'requesting' && styles.typeOptionSubtextActive]}>
                Looking for ride
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>From</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location" size={20} color="#4CAF50" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter pickup location"
                  placeholderTextColor="#9CA3AF"
                  value={origin}
                  onChangeText={setOrigin}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>To</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="navigate" size={20} color="#F44336" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter destination"
                  placeholderTextColor="#9CA3AF"
                  value={destination}
                  onChangeText={setDestination}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.dateText}>
                    {dateTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time" size={20} color="#6B7280" />
                  <Text style={styles.dateText}>
                    {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Available Seats</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people" size={20} color="#6B7280" />
                <TextInput
                  style={styles.input}
                  placeholder="Number of seats"
                  placeholderTextColor="#9CA3AF"
                  value={seats}
                  onChangeText={setSeats}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedToggleText}>Advanced Options</Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Price (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="cash" size={20} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter price per seat"
                      placeholderTextColor="#9CA3AF"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Car Details (Optional)</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="car-sport" size={20} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., White Toyota Camry"
                      placeholderTextColor="#9CA3AF"
                      value={carDetails}
                      onChangeText={setCarDetails}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferences (Optional)</Text>
                  <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <Ionicons name="list" size={20} color="#6B7280" />
                    <TextInput
                      style={[styles.input, { height: 60 }]}
                      placeholder="e.g., No smoking, pets allowed"
                      placeholderTextColor="#9CA3AF"
                      value={preferences}
                      onChangeText={setPreferences}
                      multiline
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.postButton}
              onPress={handlePost}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.postButtonText}>Post Ride</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={dateTime}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={dateTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  typeOptionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  typeOptionSubtextActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  advancedSection: {
    gap: 16,
  },
  postButton: {
    backgroundColor: '#3B82F6',
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
