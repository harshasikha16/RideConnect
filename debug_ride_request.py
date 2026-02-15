#!/usr/bin/env python3
"""
Debug ride request issue
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

def make_request(method, endpoint, data=None, headers=None, session_token=None):
    """Make HTTP request with optional authentication"""
    url = f"{API_BASE}{endpoint}"
    
    request_headers = {}
    if session_token:
        request_headers["Authorization"] = f"Bearer {session_token}"
    
    if headers:
        request_headers.update(headers)
        
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=request_headers, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=request_headers, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, headers=request_headers, timeout=10)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=request_headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except requests.exceptions.Timeout:
        print(f"Request timeout for {method} {url}")
        return None
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

# Create two users
print("Creating user 1...")
user1_data = {
    "email": f"debuguser1_{uuid.uuid4().hex[:8]}@example.com",
    "password": "TestPassword123!",
    "name": "Debug User 1",
    "auth_type": "email"
}

response = make_request('POST', '/auth/register', user1_data)
if response and response.status_code == 200:
    user1_info = response.json()
    print(f"User 1 created: {user1_info['user_id']}")
else:
    print(f"Failed to create user 1: {response.status_code if response else 'No response'}")
    exit(1)

print("Creating user 2...")
user2_data = {
    "email": f"debuguser2_{uuid.uuid4().hex[:8]}@example.com",
    "password": "TestPassword456!",
    "name": "Debug User 2",
    "auth_type": "email"
}

response = make_request('POST', '/auth/register', user2_data)
if response and response.status_code == 200:
    user2_info = response.json()
    print(f"User 2 created: {user2_info['user_id']}")
else:
    print(f"Failed to create user 2: {response.status_code if response else 'No response'}")
    exit(1)

# Login as user 1 and create a ride
print("\nLogging in as user 1...")
login_response = make_request('POST', '/auth/login', {
    "email": user1_data['email'],
    "password": user1_data['password']
})

if login_response and login_response.status_code == 200:
    user1_token = login_response.json()['session_token']
    print(f"User 1 logged in")
else:
    print("Failed to login as user 1")
    exit(1)

print("Creating ride as user 1...")
future_date = datetime.now() + timedelta(days=7)
ride_data = {
    "origin": "Debug City A",
    "destination": "Debug City B", 
    "date_time": future_date.isoformat(),
    "available_seats": 2,
    "ride_type": "offering",
    "price": 20.00,
    "car_details": "Debug Car",
    "preferences": "Debug preferences"
}

ride_response = make_request('POST', '/rides', ride_data, session_token=user1_token)
if ride_response and ride_response.status_code == 200:
    ride_info = ride_response.json()
    print(f"Ride created: {ride_info['ride_id']}")
else:
    print(f"Failed to create ride: {ride_response.status_code if ride_response else 'No response'}")
    exit(1)

# Login as user 2 and request the ride
print("\nLogging in as user 2...")
login_response2 = make_request('POST', '/auth/login', {
    "email": user2_data['email'],
    "password": user2_data['password']
})

if login_response2 and login_response2.status_code == 200:
    user2_token = login_response2.json()['session_token']
    print(f"User 2 logged in")
else:
    print("Failed to login as user 2")
    exit(1)

print("Creating ride request as user 2...")
request_data = {
    "ride_id": ride_info['ride_id'],
    "message": "Debug request message"
}

request_response = make_request('POST', '/rides/request', request_data, session_token=user2_token)
if request_response and request_response.status_code == 200:
    request_info = request_response.json()
    print(f"Request created: {request_info['request_id']}")
else:
    print(f"Failed to create request: {request_response.status_code if request_response else 'No response'}")
    if request_response:
        print(f"Response: {request_response.text}")
    exit(1)

# Check requests as user 2
print("\nChecking my requests as user 2...")
my_requests_response = make_request('GET', '/rides/requests/my', session_token=user2_token)
if my_requests_response and my_requests_response.status_code == 200:
    my_requests = my_requests_response.json()
    print(f"User 2 has {len(my_requests)} requests")
    for req in my_requests:
        print(f"  Request {req['request_id']}: {req['status']}")
else:
    print(f"Failed to get my requests: {my_requests_response.status_code if my_requests_response else 'No response'}")

# Check received requests as user 1
print("\nChecking received requests as user 1...")
received_requests_response = make_request('GET', '/rides/requests/received', session_token=user1_token)
if received_requests_response and received_requests_response.status_code == 200:
    received_requests = received_requests_response.json()
    print(f"User 1 has {len(received_requests)} received requests")
    for req in received_requests:
        print(f"  Request {req['request_id']}: {req['status']} from {req.get('requester', {}).get('name', 'Unknown')}")
else:
    print(f"Failed to get received requests: {received_requests_response.status_code if received_requests_response else 'No response'}")
    if received_requests_response:
        print(f"Response: {received_requests_response.text}")

# Check user 1's rides
print("\nChecking user 1's rides...")
my_rides_response = make_request('GET', '/rides/my', session_token=user1_token)
if my_rides_response and my_rides_response.status_code == 200:
    my_rides = my_rides_response.json()
    print(f"User 1 has {len(my_rides)} rides")
    for ride in my_rides:
        print(f"  Ride {ride['ride_id']}: {ride['origin']} -> {ride['destination']}")
else:
    print(f"Failed to get my rides: {my_rides_response.status_code if my_rides_response else 'No response'}")

print("\nDebug complete!")