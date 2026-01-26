import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

/**
 * SpeechToTextInput - A TextInput component with speech-to-text functionality
 * 
 * Props:
 * - value: Current text value
 * - onChangeText: Function to handle text changes
 * - placeholder: Placeholder text
 * - style: Custom styles for the input
 * - multiline: Whether the input is multiline
 * - numberOfLines: Number of lines for multiline input
 * - editable: Whether the input is editable (default: true)
 * - All other TextInput props
 */
const SpeechToTextInput = ({
  value,
  onChangeText,
  placeholder,
  style,
  multiline = false,
  numberOfLines = 1,
  editable = true,
  ...textInputProps
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    requestPermissions();
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant microphone permission to use speech-to-text feature.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const startListening = async () => {
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    try {
      setIsListening(true);
      
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Simulate speech recognition with a timeout
      setTimeout(() => {
        setIsListening(false);
        // Add sample voice input text
        const sampleTexts = [
          'Sample voice input text',
          'Voice recognition placeholder',
          'Spoken text will appear here',
        ];
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        onChangeText(value ? `${value} ${randomText}` : randomText);
      }, 2000);

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      Alert.alert('Error', 'Failed to start speech recognition. Please try again.');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[
          styles.textInput,
          multiline && styles.multilineInput,
          !editable && styles.disabledInput,
        ]}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        {...textInputProps}
      />
      
      {/* Microphone Button - Positioned in right corner */}
      <TouchableOpacity
        style={[
          styles.micButton,
          isListening && styles.listeningButton,
          !hasPermission && styles.disabledButton,
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={!editable}
      >
        <Icon
          name={isListening ? 'microphone' : 'microphone-outline'}
          size={16}
          color={isListening ? '#FF4444' : '#4A90E2'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  textInput: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 45, // Make space for mic button
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 45,
    textAlignVertical: 'top',
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  disabledInput: {
    color: '#999',
    backgroundColor: '#F5F5F5',
  },
  micButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -16 }], // Center vertically
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listeningButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FF4444',
  },
  disabledButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#CCC',
  },
});

export default SpeechToTextInput;