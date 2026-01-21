import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import axios from 'axios';

const ResetPassword = ({ navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        'http://192.168.31.232:5041/api/ResetPassword',
        { password: newPassword }
      );

      if (response.status === 200) {
        Alert.alert('Success', 'Password changed successfully!');
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'Failed to reset password.');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', 'Unable to reset password. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/logoicon.png')}
        style={styles.logo}
      />

      <View style={styles.formContainer}>
        <Text style={styles.title}>Reset Your Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter New Password"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handlePasswordReset}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Submitting...' : 'Change Password'}
          </Text>
        </TouchableOpacity>
      </View>
      {/* Image below the formContainer */}
            <Image
              source={require('./assets/ResetPwd.jpg')} // Add this line for the image below the form
              style={styles.forgotPwdImage}
            />
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Designed by <Text style={styles.footerTextVivify}>Vivify</Text> |{' '}
          <Text style={styles.footerTextTechnocrats}>Technocrats</Text> @2025
        </Text>
      </View>
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
    height: 140,
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: -150,
  },
  formContainer: {
    marginTop: -10,
    padding: 20,
    borderWidth: 2,
    borderColor: '#212c62',
    borderRadius: 10,
    backgroundColor: '#212c62',
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
    color: 'white',
  },
  input: {
    borderWidth: 2,
    borderColor: '#212c62',
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
    height: 200, // Adjust the height as necessary
    marginBottom: -100,
    resizeMode: 'contain', // Adjust image scaling
    // alignSelf: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'black',
  },
  footerTextVivify: {
    color: 'red',
    fontWeight: 'bold',
  },
  footerTextTechnocrats: {
    color: 'darkblue',
    fontWeight: 'bold',
  },
});

export default ResetPassword;
