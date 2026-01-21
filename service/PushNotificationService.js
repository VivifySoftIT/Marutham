import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import API_BASE_URL from '../apiConfig';
import Constants from 'expo-constants';

const API_URL = `${API_BASE_URL}/api/Notifications/PushToken`;

class PushNotificationService {
  static async registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission Denied', 'Push notification permission not granted!');
      return;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

    if (!projectId) {
      Alert.alert('Error', 'Project ID not found.');
      return;
    }

    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log('Expo Push Token:', pushTokenString);

      if (!pushTokenString) {
        console.warn('Failed to get Expo push token.');
        return;
      }

      await this.registerPushToken(pushTokenString);
      return pushTokenString;
    } catch (e) {
      Alert.alert('Error', e.message || 'Unknown error while retrieving push token.');
    }
  }

  static async fetchToken() {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) {
        console.warn('Token not found in storage');
        return null;
      }
      return token;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  }

  static async registerPushToken(expoPushToken) {
    try {
      if (!expoPushToken) {
        console.warn('Expo push token is missing, skipping registration.');
        return;
      }

      const jwtToken = await this.fetchToken();
      if (!jwtToken) {
        console.warn('Skipping push token registration: No JWT token found');
        return;
      }

      console.log('Sending push token to backend:', expoPushToken);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: expoPushToken }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register push token: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Push Token Registration Response:', data);
      return data;
    } catch (error) {
      console.error('Error registering push token:', error);
      Alert.alert('Push Token Registration Error', error.message || 'Unknown error');
    }
  }
}

export default PushNotificationService;
