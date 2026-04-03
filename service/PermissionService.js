import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

// Request all required permissions on app startup
const requestStartupPermissions = async () => {
  try {
    // 1. Camera & Photo Library
    const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
    const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // 2. Microphone
    const audioResult = await Audio.requestPermissionsAsync();

    // 3. Location
    const locationResult = await Location.requestForegroundPermissionsAsync();

    // Warn if any critical permission denied
    const denied = [];
    if (cameraResult.status !== 'granted') denied.push('Camera');
    if (audioResult.status !== 'granted') denied.push('Microphone');
    if (locationResult.status !== 'granted') denied.push('Location');

    if (denied.length > 0) {
      Alert.alert(
        'Permissions Required',
        `${denied.join(', ')} permission${denied.length > 1 ? 's are' : ' is'} needed for full functionality. You can enable ${denied.length > 1 ? 'them' : 'it'} in Settings.`,
        [{ text: 'OK' }]
      );
    }
  } catch (e) {
    console.log('Permission request error:', e.message);
  }
};

// Request mic permission before voice input
const requestMicPermission = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Microphone Permission',
      'Microphone access is required for voice search. Please enable it in Settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

// Request camera permission before camera use
const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera Permission',
      'Camera access is required to take photos. Please enable it in Settings.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

export default { requestStartupPermissions, requestMicPermission, requestCameraPermission };
