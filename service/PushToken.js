import API_BASE_URL from '../apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';

const API_URL = `${API_BASE_URL}/api/Notifications/PushToken`; // Replace with your actual .NET Core API URL

// Function to get the JWT token from AsyncStorage
const fetchToken = async () => {
  try {
    const token = await AsyncStorage.getItem('jwt_token');
    if (!token) {
        
    Alert.alert("Exception on token generation", 'Token not found');
      throw new Error('Token not found');
    }
    return token;
  } catch (error) {
    console.error('Error fetching token:', error);
    throw error;
  }
};

// Function to register the push token
export async function registerPushToken(expoPushToken) {
  try {
    const jwtToken = await fetchToken(); // Ensure we fetch the token before using it
    Alert.alert("pushToken", expoPushToken);
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: expoPushToken }),
    });

    const data = await response.json();
    //Alert.alert("Exception on token generation",data.statusDesc);
    return data;
  } catch (error) {
    Alert.alert("Exception on token generation", error.message);
    console.error("Error registering push token:", error);
  }
}
