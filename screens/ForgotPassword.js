import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, BackHandler } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';

const ForgotPassword = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [empNo, setEmpNo] = useState(''); // EmpNo field
  const [isLoading, setIsLoading] = useState(false);

  // Fetch employee number from AsyncStorage (optional if needed)
  const getEmpNoFromStorage = async () => {
    const empNoFromStorage = await AsyncStorage.getItem('emp_no');
    if (empNoFromStorage) {
      setEmpNo(empNoFromStorage); // Optionally set it from AsyncStorage if you store EmpNo
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !empNo) {
      Alert.alert('Error', 'Please enter both your email and employee number.');
      return;
    }

    // Email format validation
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailPattern.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    // Employee number validation (check if it's a number)
    if (isNaN(empNo)) {
      Alert.alert('Error', 'Employee number must be a valid number.');
      return;
    }

    setIsLoading(true);

    try {
      // Construct the full API URL with query parameters
      const url = `${API_BASE_URL}/api/Security/ForgotPassword?EmailId=${email}&EmpNo=${empNo}`;

      // Send the GET request to the API
      const response = await axios.get(url);

      // Log the response for debugging
      console.log('API Response:', response.data);

      // Check if the API response is successful
      if (response.status === 200 && response.data.result) {
        // Assuming the API response includes a 'result' field and 'statusDesc' field
        const successMessage = response.data.statusDesc || 'Password reset link has been sent to your email!';
        Alert.alert('Success', successMessage);
        // Navigate to the login screen only on success (status code 200)
        navigation.replace('Login');
      } else {
        // Handle failure response (invalid email or employee number)
        Alert.alert('Error', response.data.statusDesc || 'Invalid email or employee number. Please check and try again.');
        // Do NOT navigate, stay on the same screen
      }
    } catch (error) {
      console.error('Error sending reset link:', error);
      Alert.alert('Error', 'Unable to send reset link. Please try again later.');
      // Do NOT navigate, stay on the same screen
    } finally {
      setIsLoading(false);
    }
  };

  // Optionally load the employee number on component mount
  React.useEffect(() => {
    getEmpNoFromStorage();

    // Prevent back button press on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.replace('Login');  // Navigate to Login screen when back is pressed
      return true;  // Prevent the default back action
    });

    // Cleanup listener on unmount
    return () => backHandler.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logoicon.png')}
        style={styles.logo}
      />

      <View style={styles.formContainer}>
        <Text style={styles.title}>Forgot Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter Official Email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter Employee Number"
          keyboardType="numeric"
          value={empNo}
          onChangeText={setEmpNo}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleForgotPassword}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image below the formContainer */}
      <Image
        source={require('../assets/ForgotPwd2.jpg')}
        style={styles.forgotPwdImage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffff',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 30,
    marginTop: -100,
  },
  formContainer: {
    marginTop: -10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#212c62',
    borderRadius: 10,
    backgroundColor: 'rgb(255, 255, 255)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: 'darkblue',
  },
  input: {
    borderWidth: 1,
    borderColor: 'darkblue',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: 'rgba(230, 34, 41, 0.84)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotPwdImage: {
    width: '100%',
    height: 250, // Adjust the height as necessary
    marginBottom: -120,
    resizeMode: 'contain', // Adjust image scaling
    marginTop:10,
  },
});

export default ForgotPassword;
