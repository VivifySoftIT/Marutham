import { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Voice from '@react-native-voice/voice';

/**
 * SpeechToTextInput - A TextInput component with enhanced Google Web Speech API
 * 
 * Props:
 * - value: Current text value
 * - onChangeText: Function to handle text changes
 * - placeholder: Placeholder text
 * - style: Custom styles for the input
 * - multiline: Whether the input is multiline
 * - numberOfLines: Number of lines for multiline input
 * - editable: Whether the input is editable (default: true)
 * - fieldType: Type of field for smart processing ('amount', 'rating', 'text')
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
  inputStyle,
  fieldType = 'text',
  ...textInputProps
}) => {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      setIsListening(false);
      if (Platform.OS !== 'web') {
        Voice.destroy().then(Voice.removeAllListeners);
      }
    };
  }, []);

  // Helper function to convert spoken numbers to digits
  const convertSpokenNumbersToDigits = (text) => {
    const numberWords = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000'
    };

    let result = text.toLowerCase();
    
    // Replace number words with digits
    Object.keys(numberWords).forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, numberWords[word]);
    });

    // Extract numbers from the result
    const numberMatch = result.match(/\d+/);
    return numberMatch ? numberMatch[0] : text;
  };

  // Enhanced voice input for both web and mobile
  const startListening = async () => {
    // For Web Platform - Enhanced Google Web Speech API
    if (Platform.OS === 'web') {
      // Check for Web Speech API support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        Alert.alert(
          'Voice Input Not Supported',
          'Your browser does not support voice recognition. Please use Chrome, Edge, or Safari.',
          [{ text: 'OK' }]
        );
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Enhanced configuration for better accuracy
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN'; // Indian English for better recognition
      recognition.maxAlternatives = 1;
      
      // Set listening state
      setIsListening(true);

      recognition.onstart = () => {
        console.log('Voice recognition started');
      };

      recognition.onresult = (event) => {
        const results = event.results;
        if (results.length > 0) {
          const spokenText = results[0][0].transcript.trim();
          console.log('Voice input received:', spokenText);
          
          // Process the text based on field type
          let processedText = spokenText;
          
          // Special processing for amount field
          if (fieldType === 'amount') {
            processedText = convertSpokenNumbersToDigits(spokenText);
          }
          
          // Special processing for rating field
          if (fieldType === 'rating') {
            const ratingMatch = spokenText.match(/(\d+)/);
            if (ratingMatch) {
              const rating = parseInt(ratingMatch[1]);
              if (rating >= 1 && rating <= 5) {
                processedText = rating.toString();
              }
            }
          }
          
          // Append or replace text based on multiline
          if (multiline && value) {
            onChangeText(`${value} ${processedText}`);
          } else {
            onChangeText(processedText);
          }
          
          setIsListening(false);
        }
      };

      recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        setIsListening(false);
        
        let errorMessage = 'Voice recognition error. Please try again.';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please speak clearly and try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your microphone connection.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your internet connection.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service not allowed. Please try again.';
            break;
          default:
            errorMessage = `Voice recognition error: ${event.error}. Please try again.`;
        }
        
        Alert.alert('Voice Input Error', errorMessage);
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setIsListening(false);
        Alert.alert('Error', 'Could not start voice recognition. Please try again.');
      }
    } 
    // For Mobile Platform - React Native Voice
    else {
      try {
        await Voice.destroy();
        Voice.removeAllListeners();

        setIsListening(true);

        Voice.onSpeechStart = () => {
          console.log('Mobile voice recognition started');
        };

        Voice.onSpeechEnd = () => {
          console.log('Mobile voice recognition ended');
          setIsListening(false);
        };

        Voice.onSpeechError = (error) => {
          console.error('Mobile voice recognition error:', error);
          setIsListening(false);
          Alert.alert('Voice Input Error', 'Voice recognition failed. Please try again.');
        };

        Voice.onSpeechResults = (event) => {
          console.log('Mobile voice results:', event.value);
          if (event.value && event.value.length > 0) {
            const spokenText = event.value[0].trim();
            console.log('Mobile voice input received:', spokenText);
            
            // Process the text based on field type
            let processedText = spokenText;
            
            // Special processing for amount field
            if (fieldType === 'amount') {
              processedText = convertSpokenNumbersToDigits(spokenText);
            }
            
            // Special processing for rating field
            if (fieldType === 'rating') {
              const ratingMatch = spokenText.match(/(\d+)/);
              if (ratingMatch) {
                const rating = parseInt(ratingMatch[1]);
                if (rating >= 1 && rating <= 5) {
                  processedText = rating.toString();
                }
              }
            }
            
            // Append or replace text based on multiline
            if (multiline && value) {
              onChangeText(`${value} ${processedText}`);
            } else {
              onChangeText(processedText);
            }
          }
        };

        await Voice.start('en-IN');
      } catch (error) {
        console.error('Error starting mobile voice recognition:', error);
        setIsListening(false);
        Alert.alert('Voice Input Error', 'Could not start voice recognition. Please try again.');
      }
    }
  };

  const stopListening = async () => {
    setIsListening(false);
    if (Platform.OS !== 'web') {
      try {
        await Voice.stop();
      } catch (error) {
        console.error('Error stopping voice recognition:', error);
      }
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
          inputStyle,
        ]}
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={editable}
        {...textInputProps}
      />

      {/* Enhanced Microphone Button */}
      <TouchableOpacity
        style={[
          styles.micButton,
          isListening && styles.listeningButton,
          !editable && styles.disabledButton,
        ]}
        onPress={isListening ? stopListening : startListening}
        disabled={!editable}
      >
        <Icon
          name={isListening ? 'microphone' : 'microphone-outline'}
          size={18}
          color={isListening ? '#FF4444' : '#C9A84C'}
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingRight: 50, // Make space for mic button
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
    transform: [{ translateY: -18 }], // Center vertically
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C9A84C',
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
