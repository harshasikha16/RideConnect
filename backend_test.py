#!/usr/bin/env python3
"""
RideConnect Backend API Testing Suite
Tests all backend endpoints for the RideConnect app
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from frontend env
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://carpoolconnect-4.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class RideConnectTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_id = None
        self.test_users = []
        self.test_rides = []
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if not success:
            print()
    
    def make_request(self, method, endpoint, data=None, headers=None, use_auth=True):
        """Make HTTP request with optional authentication"""
        url = f"{API_BASE}{endpoint}"
        
        request_headers = {}
        if use_auth and self.session_token:
            request_headers["Authorization"] = f"Bearer {self.session_token}"
        
        if headers:
            request_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=request_headers, timeout=10)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, timeout=10)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=request_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except requests.exceptions.Timeout:
            print(f"Request timeout for {method} {url}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    def test_root_endpoint(self):
        """Test the root API endpoint"""
        response = self.make_request('GET', '/', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            success = data.get('message') == 'RideConnect API'
            self.log_test("Root endpoint", success, f"Response: {data}")
            return success
        else:
            self.log_test("Root endpoint", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_user_registration(self):
        """Test user registration with email/password"""
        test_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "TestPassword123!",
            "name": "Test User",
            "auth_type": "email"
        }
        
        response = self.make_request('POST', '/auth/register', test_data, use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'user_id' in data and 'session_token' in data:
                self.session_token = data['session_token']
                self.user_id = data['user_id']
                self.test_users.append({
                    'email': test_email,
                    'password': test_data['password'],
                    'user_id': data['user_id'],
                    'name': data['name']
                })
                self.log_test("User Registration", True, f"User ID: {data['user_id']}")
                return True
            else:
                self.log_test("User Registration", False, f"Missing fields in response: {data}")
                return False
        else:
            self.log_test("User Registration", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_user_login(self):
        """Test user login with email/password"""
        if not self.test_users:
            self.log_test("User Login", False, "No test user available")
            return False
            
        user = self.test_users[0]
        login_data = {
            "email": user['email'],
            "password": user['password']
        }
        
        response = self.make_request('POST', '/auth/login', login_data, use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'session_token' in data and data['user_id'] == user['user_id']:
                self.session_token = data['session_token']
                self.log_test("User Login", True, f"Logged in as: {data['name']}")
                return True
            else:
                self.log_test("User Login", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("User Login", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_guest_login(self):
        """Test guest login"""
        response = self.make_request('POST', '/auth/guest', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'user_id' in data and 'session_token' in data and data['user_id'].startswith('guest_'):
                guest_token = data['session_token']
                self.log_test("Guest Login", True, f"Guest ID: {data['user_id']}")
                return True
            else:
                self.log_test("Guest Login", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("Guest Login", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # Make sure we're using the original user's session
        if self.test_users:
            user = self.test_users[0]
            login_data = {"email": user['email'], "password": user['password']}
            login_response = self.make_request('POST', '/auth/login', login_data, use_auth=False)
            if login_response and login_response.status_code == 200:
                self.session_token = login_response.json()['session_token']
                self.user_id = user['user_id']
        
        response = self.make_request('GET', '/auth/me')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'user_id' in data and data['user_id'] == self.user_id:
                self.log_test("Get Current User", True, f"User: {data.get('name', 'Unknown')}")
                return True
            else:
                self.log_test("Get Current User", False, f"User ID mismatch: expected {self.user_id}, got {data.get('user_id')}")
                return False
        else:
            self.log_test("Get Current User", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_update_profile(self):
        """Test updating user profile"""
        update_data = {
            "name": "Updated Test User",
            "bio": "This is my test bio",
            "profile_type": "rider",
            "is_public": False
        }
        
        response = self.make_request('PUT', '/users/me', update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('name') == update_data['name'] and data.get('bio') == update_data['bio']:
                self.log_test("Update Profile", True, f"Updated: {data['name']}")
                return True
            else:
                self.log_test("Update Profile", False, f"Update failed: {data}")
                return False
        else:
            self.log_test("Update Profile", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_search_users(self):
        """Test user search"""
        response = self.make_request('GET', '/users?q=test', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Search Users", True, f"Found {len(data)} users")
                return True
            else:
                self.log_test("Search Users", False, f"Invalid response format: {data}")
                return False
        else:
            self.log_test("Search Users", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_create_second_user(self):
        """Create a second user for follow testing"""
        test_email = f"testuser2_{uuid.uuid4().hex[:8]}@example.com"
        test_data = {
            "email": test_email,
            "password": "TestPassword456!",
            "name": "Test User 2",
            "auth_type": "email"
        }
        
        response = self.make_request('POST', '/auth/register', test_data, use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            self.test_users.append({
                'email': test_email,
                'password': test_data['password'],
                'user_id': data['user_id'],
                'name': data['name']
            })
            self.log_test("Create Second User", True, f"User 2 ID: {data['user_id']}")
            return True
        else:
            self.log_test("Create Second User", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_follow_user(self):
        """Test following another user"""
        if len(self.test_users) < 2:
            self.log_test("Follow User", False, "Need 2 users for follow test")
            return False
        
        # Ensure we're logged in as the first user
        user = self.test_users[0]
        login_data = {"email": user['email'], "password": user['password']}
        login_response = self.make_request('POST', '/auth/login', login_data, use_auth=False)
        if login_response and login_response.status_code == 200:
            self.session_token = login_response.json()['session_token']
            self.user_id = user['user_id']
            
        target_user_id = self.test_users[1]['user_id']
        follow_data = {"following_id": target_user_id}
        
        response = self.make_request('POST', '/follow', follow_data)
        
        if response:
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_test("Follow User", True, f"Message: {data['message']}")
                    return True
                else:
                    self.log_test("Follow User", False, f"Invalid response: {data}")
                    return False
            elif response.status_code == 400:
                # Check if it's because already following
                try:
                    error_data = response.json()
                    if "Already following" in error_data.get('detail', ''):
                        self.log_test("Follow User", True, f"Already following: {error_data['detail']}")
                        return True
                    else:
                        self.log_test("Follow User", False, f"Bad request: {error_data.get('detail', 'Unknown error')}")
                        return False
                except:
                    self.log_test("Follow User", False, f"Bad request: Status {response.status_code}")
                    return False
            else:
                self.log_test("Follow User", False, f"Status: {response.status_code}")
                return False
        else:
            self.log_test("Follow User", False, "No response (timeout)")
            return False
    
    def test_follow_status(self):
        """Test checking follow status"""
        if len(self.test_users) < 2:
            self.log_test("Follow Status", False, "Need 2 users for follow status test")
            return False
            
        target_user_id = self.test_users[1]['user_id']
        response = self.make_request('GET', f'/follow/status/{target_user_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'is_following' in data and 'status' in data:
                self.log_test("Follow Status", True, f"Following: {data['is_following']}, Status: {data['status']}")
                return True
            else:
                self.log_test("Follow Status", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("Follow Status", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_get_followers(self):
        """Test getting followers list"""
        response = self.make_request('GET', f'/followers/{self.user_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Followers", True, f"Followers count: {len(data)}")
                return True
            else:
                self.log_test("Get Followers", False, f"Invalid response format: {data}")
                return False
        else:
            self.log_test("Get Followers", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_create_ride(self):
        """Test creating a ride"""
        # Ensure we're logged in as the first user
        if self.test_users:
            user = self.test_users[0]
            login_data = {"email": user['email'], "password": user['password']}
            login_response = self.make_request('POST', '/auth/login', login_data, use_auth=False)
            if login_response and login_response.status_code == 200:
                self.session_token = login_response.json()['session_token']
                self.user_id = user['user_id']
        
        future_date = datetime.now() + timedelta(days=7)
        ride_data = {
            "origin": "New York",
            "destination": "Boston", 
            "date_time": future_date.isoformat(),
            "available_seats": 3,
            "ride_type": "offering",
            "price": 25.00,
            "car_details": "White Toyota Camry",
            "preferences": "No smoking"
        }
        
        response = self.make_request('POST', '/rides', ride_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'ride_id' in data and data['user_id'] == self.user_id:
                self.test_rides.append(data)
                self.log_test("Create Ride", True, f"Ride ID: {data['ride_id']}")
                return True
            else:
                self.log_test("Create Ride", False, f"Invalid response: expected user_id {self.user_id}, got {data.get('user_id')}")
                return False
        else:
            self.log_test("Create Ride", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_get_rides(self):
        """Test getting rides list"""
        response = self.make_request('GET', '/rides', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get Rides", True, f"Found {len(data)} rides")
                return True
            else:
                self.log_test("Get Rides", False, f"Invalid response format: {data}")
                return False
        else:
            self.log_test("Get Rides", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_get_my_rides(self):
        """Test getting current user's rides"""
        response = self.make_request('GET', '/rides/my')
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_test("Get My Rides", True, f"My rides count: {len(data)}")
                return True
            else:
                self.log_test("Get My Rides", False, f"Invalid response format: {data}")
                return False
        else:
            self.log_test("Get My Rides", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_get_ride_details(self):
        """Test getting specific ride details"""
        if not self.test_rides:
            self.log_test("Get Ride Details", False, "No test rides available")
            return False
            
        ride_id = self.test_rides[0]['ride_id']
        response = self.make_request('GET', f'/rides/{ride_id}', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('ride_id') == ride_id:
                self.log_test("Get Ride Details", True, f"Ride: {data['origin']} → {data['destination']}")
                return True
            else:
                self.log_test("Get Ride Details", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("Get Ride Details", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_update_ride(self):
        """Test updating a ride"""
        if not self.test_rides:
            self.log_test("Update Ride", False, "No test rides available")
            return False
            
        ride_id = self.test_rides[0]['ride_id']
        update_data = {
            "price": 30.00,
            "preferences": "No smoking, no pets"
        }
        
        response = self.make_request('PUT', f'/rides/{ride_id}', update_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('price') == update_data['price']:
                self.log_test("Update Ride", True, f"Updated price to ${data['price']}")
                return True
            else:
                self.log_test("Update Ride", False, f"Update failed: {data}")
                return False
        else:
            self.log_test("Update Ride", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_ride_request_flow(self):
        """Test ride request creation and management"""
        if not self.test_rides or len(self.test_users) < 2:
            self.log_test("Ride Request Flow", False, "Need rides and 2 users")
            return False
        
        # Ensure we start with user 1 (ride owner) logged in
        user1 = self.test_users[0]
        user2 = self.test_users[1]
        
        # Login as user 1 first to ensure we have the right session
        login_data1 = {"email": user1['email'], "password": user1['password']}
        login_response1 = self.make_request('POST', '/auth/login', login_data1, use_auth=False)
        if not login_response1 or login_response1.status_code != 200:
            self.log_test("Ride Request Flow", False, "Failed to login as user 1")
            return False
        
        user1_token = login_response1.json()['session_token']
        
        # Switch to second user to request the ride
        login_data2 = {"email": user2['email'], "password": user2['password']}
        login_response2 = self.make_request('POST', '/auth/login', login_data2, use_auth=False)
        if not login_response2 or login_response2.status_code != 200:
            self.log_test("Ride Request Flow", False, "Failed to login as user 2")
            return False
            
        # Update session token to user 2
        self.session_token = login_response2.json()['session_token']
        self.user_id = user2['user_id']
        
        # Request the ride
        ride_id = self.test_rides[0]['ride_id']
        request_data = {
            "ride_id": ride_id,
            "message": "Hi, I'd like to join your ride!"
        }
        
        response = self.make_request('POST', '/rides/request', request_data)
        
        success = False
        request_id = None
        
        if response and response.status_code == 200:
            data = response.json()
            if 'request_id' in data:
                request_id = data['request_id']
                print(f"    Created request: {request_id}")
                
                # Test getting my requests (as user 2)
                my_requests = self.make_request('GET', '/rides/requests/my')
                if my_requests and my_requests.status_code == 200:
                    print(f"    My requests: {len(my_requests.json())} found")
                    
                    # Switch back to user 1 (ride owner) to check received requests
                    self.session_token = user1_token
                    self.user_id = user1['user_id']
                    
                    received_requests = self.make_request('GET', '/rides/requests/received')
                    if received_requests and received_requests.status_code == 200:
                        received_data = received_requests.json()
                        print(f"    Received requests: {len(received_data)} found")
                        
                        if len(received_data) > 0:
                            # Accept the request (as user 1, the ride owner)
                            accept_response = self.make_request('PUT', f'/rides/requests/{request_id}?action=accept')
                            if accept_response and accept_response.status_code == 200:
                                print(f"    Request accepted successfully")
                                success = True
                            else:
                                print(f"    Failed to accept request: {accept_response.status_code if accept_response else 'No response'}")
                                if accept_response:
                                    try:
                                        error_data = accept_response.json()
                                        print(f"    Accept error: {error_data}")
                                    except:
                                        print(f"    Accept response text: {accept_response.text}")
                        else:
                            print(f"    No received requests found for ride owner")
                    else:
                        print(f"    Failed to get received requests: {received_requests.status_code if received_requests else 'No response'}")
                else:
                    print(f"    Failed to get my requests: {my_requests.status_code if my_requests else 'No response'}")
            else:
                print(f"    Request creation response missing request_id: {data}")
        else:
            print(f"    Failed to create request: {response.status_code if response else 'No response'}")
            if response:
                try:
                    error_data = response.json()
                    print(f"    Error details: {error_data}")
                except:
                    print(f"    Response text: {response.text}")
        
        # Restore original session (user 1)
        self.session_token = user1_token
        self.user_id = user1['user_id']
        
        if success:
            self.log_test("Ride Request Flow", True, "Request created and accepted")
            return True
        else:
            self.log_test("Ride Request Flow", False, "Request flow failed")
            return False
    
    def test_user_stats(self):
        """Test getting user statistics"""
        response = self.make_request('GET', f'/stats/{self.user_id}', use_auth=False)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'followers' in data and 'following' in data and 'rides' in data:
                self.log_test("User Stats", True, f"Stats: {data['followers']} followers, {data['following']} following, {data['rides']} rides")
                return True
            else:
                self.log_test("User Stats", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("User Stats", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def test_logout(self):
        """Test user logout"""
        response = self.make_request('POST', '/auth/logout')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'message' in data:
                self.log_test("User Logout", True, f"Message: {data['message']}")
                return True
            else:
                self.log_test("User Logout", False, f"Invalid response: {data}")
                return False
        else:
            self.log_test("User Logout", False, f"Status: {response.status_code if response else 'No response'}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("RIDECONNECT BACKEND API TESTING")
        print("=" * 60)
        
        test_results = []
        
        # Basic connectivity
        test_results.append(self.test_root_endpoint())
        
        # Auth flow
        test_results.append(self.test_user_registration())
        test_results.append(self.test_user_login())
        test_results.append(self.test_guest_login())
        test_results.append(self.test_get_current_user())
        
        # User management
        test_results.append(self.test_update_profile())
        test_results.append(self.test_search_users())
        
        # Follow system
        test_results.append(self.test_create_second_user())
        test_results.append(self.test_follow_user())
        test_results.append(self.test_follow_status())
        test_results.append(self.test_get_followers())
        
        # Ride management
        test_results.append(self.test_create_ride())
        test_results.append(self.test_get_rides())
        test_results.append(self.test_get_my_rides())
        test_results.append(self.test_get_ride_details())
        test_results.append(self.test_update_ride())
        
        # Ride requests
        test_results.append(self.test_ride_request_flow())
        
        # Stats
        test_results.append(self.test_user_stats())
        
        # Cleanup
        test_results.append(self.test_logout())
        
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(test_results)
        total = len(test_results)
        
        print(f"Tests passed: {passed}/{total}")
        print(f"Success rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED!")
        else:
            print(f"⚠️  {total - passed} tests failed")
        
        return passed == total

if __name__ == "__main__":
    tester = RideConnectTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)