export interface User {
  user_id: string;
  email?: string;
  phone?: string;
  name: string;
  profile_picture?: string;
  bio?: string;
  profile_type: 'rider' | 'passenger';
  is_public: boolean;
  auth_type: 'google' | 'phone' | 'email' | 'guest';
  created_at?: string;
}

export interface Ride {
  ride_id: string;
  user_id: string;
  origin: string;
  destination: string;
  date_time: string;
  available_seats: number;
  price?: number;
  car_details?: string;
  preferences?: string;
  ride_type: 'offering' | 'requesting';
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  user?: User;
}

export interface RideRequest {
  request_id: string;
  ride_id: string;
  requester_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
  requester?: User;
  ride?: Ride;
}

export interface Follow {
  follow_id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  follower?: User;
}

export interface UserStats {
  followers: number;
  following: number;
  rides: number;
}
