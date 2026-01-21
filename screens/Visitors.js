import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  ImageBackground,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import API_BASE_URL from '../apiConfig';

const { width } = Dimensions.get('window');

const Visitors = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('chapter');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [memberId, setMemberId] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  
  const [formData, setFormData] = useState({
    Region: '',
    Chapter: '',
    Country: '',
    Title: '',
    FirstName: '',
    LastName: '',
    Company: '',
    Language: '',
    TelephoneNumber: '',
    VisitorEmail: '',
    MobileNumber: '',
    VisitorCountry: '',
    VisitorAddress: '',
    VisitorCity: '',
    VisitorState: '',
    VisitorPostcode: '',
    VisitorName: '',
    VisitorPhone: '',
    VisitorBusiness: '',
    VisitDate: new Date(),
    BecameMember: false,
    MemberId: null,
    Notes: '',
    BroughtByMemberId: null,
  });

  // Get current user's member ID
  const getCurrentUserMemberId = async () => {
    try {
      // First check if memberId is already in AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('Member ID found in storage:', storedMemberId);
        const memberIdInt = parseInt(storedMemberId);
        setMemberId(memberIdInt);
        setFormData(prev => ({ 
          ...prev, 
          BroughtByMemberId: memberIdInt 
        }));
        return memberIdInt;
      }

      console.log('Member ID not in storage, attempting to look up...');

      // If not, try to get it from user ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          // Try to get member by user ID
          console.log('Trying GetByUserId with userId:', userId);
          const response = await fetch(`${API_BASE_URL}/api/Members/GetByUserId/${userId}`);
          if (response.ok) {
            const memberData = await response.json();
            if (memberData && memberData.id) {
              const memberIdInt = parseInt(memberData.id);
              await AsyncStorage.setItem('memberId', memberIdInt.toString());
              console.log('Member found via GetByUserId:', memberIdInt);
              setMemberId(memberIdInt);
              setFormData(prev => ({ 
                ...prev, 
                BroughtByMemberId: memberIdInt 
              }));
              return memberIdInt;
            }
          }
        } catch (error) {
          console.log('GetByUserId failed, trying name search:', error);
        }
      }

      // Fallback: search by name
      if (fullName) {
        try {
          console.log('Searching members by name:', fullName);
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            const member = members.find(m => 
              m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
            );
            
            if (member) {
              const memberIdInt = parseInt(member.id);
              await AsyncStorage.setItem('memberId', memberIdInt.toString());
              console.log('Member found by name:', memberIdInt);
              setMemberId(memberIdInt);
              setFormData(prev => ({ 
                ...prev, 
                BroughtByMemberId: memberIdInt 
              }));
              return memberIdInt;
            }
          }
        } catch (error) {
          console.log('Name search failed:', error);
        }
      }

      console.log('Could not find member ID');
      Alert.alert(
        'Member ID Not Found',
        'Unable to find your member information. Please contact support.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  // Get authentication token
  const getAuthToken = async () => {
    try {
      // Check all possible token storage locations
      const jwtToken = await AsyncStorage.getItem('jwt_token');
      const token = await AsyncStorage.getItem('token');
      const authToken = await AsyncStorage.getItem('authToken');
      
      // Use whichever token is available
      const availableToken = jwtToken || token || authToken;
      if (availableToken) {
        setAuthToken(availableToken);
        console.log('Auth token found, length:', availableToken.length);
        return availableToken;
      }
      
      console.log('No auth token found');
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  useEffect(() => {
    // Initialize on component mount
    const initialize = async () => {
      await getCurrentUserMemberId();
      await getAuthToken();
    };
    initialize();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, VisitDate: selectedDate }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'Country', 'Region', 'Chapter',
      'Title', 'FirstName', 'LastName', 'Company',
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please fill in the following required fields: ${missingFields.join(', ')}`,
        [{ text: 'OK' }]
      );
      return false;
    }

    if (formData.VisitorEmail && !/\S+@\S+\.\S+/.test(formData.VisitorEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return false;
    }

    // Check if member ID is available
    if (!memberId && !formData.BroughtByMemberId) {
      Alert.alert(
        'Member ID Required',
        'Unable to identify your member account. Please contact support.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  };



const handleSubmit = async () => {
  if (!validateForm()) return;

  // Ensure member ID is set
  if (!memberId && !formData.BroughtByMemberId) {
    Alert.alert(
      'Member ID Required',
      'Unable to identify your member account. Please refresh or contact support.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Prepare data - DO NOT include fields that might not exist in database
  const visitorData = {
    // Required fields for your API
    BroughtByMemberId: memberId || formData.BroughtByMemberId,
    
    // Visitor information
    VisitorName: `${formData.FirstName} ${formData.LastName}`.trim(),
    VisitorPhone: formData.MobileNumber || formData.TelephoneNumber || '',
    VisitorEmail: formData.VisitorEmail || '',
    VisitorBusiness: formData.Company || '',
    VisitDate: formData.VisitDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    
    // Optional fields
    BecameMember: formData.BecameMember || false,
    MemberId: formData.BecameMember ? (formData.MemberId || null) : null,
    Notes: formData.Notes || '',
    
    // Additional fields from your form
    Title: formData.Title || '',
    FirstName: formData.FirstName || '',
    LastName: formData.LastName || '',
    Company: formData.Company || '',
    Language: formData.Language || '',
    TelephoneNumber: formData.TelephoneNumber || '',
    MobileNumber: formData.MobileNumber || '',
    VisitorCountry: formData.VisitorCountry || '',
    VisitorAddress: formData.VisitorAddress || '',
    VisitorCity: formData.VisitorCity || '',
    VisitorState: formData.VisitorState || '',
    VisitorPostcode: formData.VisitorPostcode || '',
    Region: formData.Region || '',
    Chapter: formData.Chapter || '',
    Country: formData.Country || '',
    
    // DO NOT include these - let backend handle them:
    // Status: 1, // Remove this
    // CreatedDate: new Date().toISOString(), // Remove this
    // UpdatedDate: new Date().toISOString() // Remove this - this is causing the error
  };

  console.log('=== SUBMITTING VISITOR DATA ===');
  console.log('API URL:', `${API_BASE_URL}/api/Inventory/visitors`);
  console.log('Member ID:', memberId);
  console.log('Auth Token exists:', !!authToken);
  console.log('Visitor Data to send:', JSON.stringify(visitorData, null, 2));

  setLoading(true);
  try {
    if (!authToken) {
      throw new Error('Authentication token not available');
    }

    const response = await submitVisitorToAPI(visitorData, authToken);
    
    console.log('=== API RESPONSE ===');
    console.log('Response:', response);

    if (response.statusCode === 200 || response.visitorId) {
      setShowSuccessModal(true);
      
      setTimeout(() => {
        resetForm();
        setShowSuccessModal(false);
        Alert.alert(
          'Success',
          `Visitor ${visitorData.VisitorName} has been registered successfully!`,
          [{ text: 'OK' }]
        );
      }, 2000);
    } else {
      Alert.alert(
        'Submission Error',
        response.statusDesc || 'Failed to submit visitor information. Please try again.'
      );
    }
  } catch (error) {
    console.error('=== SUBMISSION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    
    // More specific error handling
    if (error.message.includes('Invalid column name')) {
      Alert.alert(
        'Database Schema Error',
        'There is a mismatch between the data being sent and the database structure. Please contact support.',
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Test Minimal', 
            onPress: () => testMinimalSubmission()
          }
        ]
      );
    } else if (error.message.includes('401') || error.message.includes('403')) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          { 
            text: 'Login', 
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ]
      );
    } else if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      Alert.alert(
        'Network Error',
        'Cannot connect to the server. Please check your internet connection.',
        [{ text: 'OK' }]
      );
    } else if (error.message.includes('Invalid visitor data')) {
      Alert.alert(
        'Validation Error',
        'Please ensure all required fields are filled correctly, especially Member ID.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Submission Failed',
        error.message || 'An unexpected error occurred. Please try again.'
      );
    }
  } finally {
    setLoading(false);
  }
};

const submitVisitorToAPI = async (visitorData, token) => {
  try {
    console.log('=== API REQUEST DETAILS ===');
    console.log('Endpoint:', `${API_BASE_URL}/api/Inventory/visitors`);
    console.log('Token length:', token?.length || 'No token');
    
    // Clean up the data - remove any null/undefined values
    const cleanData = {};
    Object.keys(visitorData).forEach(key => {
      if (visitorData[key] !== null && visitorData[key] !== undefined && visitorData[key] !== '') {
        cleanData[key] = visitorData[key];
      }
    });

    console.log('Cleaned Data to send:', JSON.stringify(cleanData, null, 2));

    const response = await fetch(`${API_BASE_URL}/api/Inventory/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(cleanData),
    });

    console.log('=== RAW RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Status text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      console.error('Response not OK, attempting to parse error...');
      let errorData;
      try {
        errorData = JSON.parse(responseText);
        // Add specific error messages
        if (errorData.innerError && errorData.innerError.includes('Invalid column name')) {
          errorData.message = `Database error: ${errorData.innerError}. Please contact support.`;
        }
      } catch (e) {
        errorData = { message: responseText };
      }
      throw new Error(errorData.message || errorData.statusDesc || `HTTP ${response.status}: ${response.statusText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
    }

    console.log('=== PARSED RESPONSE ===');
    console.log('Data:', data);
    
    return data;
  } catch (error) {
    console.error('=== API CALL ERROR ===');
    console.error('Error:', error);
    throw error;
  }
};

// Add a debug button to test the API connection:
const testAPIConnection = async () => {
  try {
    const testData = {
      BroughtByMemberId: memberId,
      VisitorName: "Test Visitor",
      VisitorPhone: "1234567890",
      VisitDate: new Date().toISOString().split('T')[0],
      Title: "Mr",
      FirstName: "Test",
      LastName: "Visitor",
      Company: "Test Company",
      Country: "Test Country",
      Region: "Test Region",
      Chapter: "Test Chapter"
    };

    console.log('Testing API connection with data:', testData);
    
    const response = await fetch(`${API_BASE_URL}/api/Inventory/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(testData),
    });

    console.log('Test response status:', response.status);
    const text = await response.text();
    console.log('Test response:', text);
    
    Alert.alert(
      'API Test Result',
      `Status: ${response.status}\nResponse: ${text}`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('API Test Error:', error);
    Alert.alert('API Test Failed', error.message);
  }
};
// Add this function to test with minimal required fields
const testMinimalSubmission = async () => {
  try {
    if (!memberId) {
      Alert.alert('Error', 'Member ID not found');
      return;
    }

    const minimalData = {
      BroughtByMemberId: memberId,
      VisitorName: "Test Visitor",
      VisitorPhone: "1234567890",
      VisitDate: new Date().toISOString().split('T')[0],
      Status: 1, // Include Status if your backend expects it
      CreatedDate: new Date().toISOString() // Include CreatedDate if your backend expects it
    };

    console.log('Testing with minimal data:', minimalData);
    
    const response = await fetch(`${API_BASE_URL}/api/Inventory/visitors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(minimalData),
    });

    const text = await response.text();
    console.log('Minimal test response:', text);
    
    let message = `Status: ${response.status}\n`;
    try {
      const json = JSON.parse(text);
      message += `Response: ${JSON.stringify(json, null, 2)}`;
    } catch (e) {
      message += `Response: ${text}`;
    }
    
    Alert.alert(
      'Minimal Test Result',
      message,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Minimal test error:', error);
    Alert.alert('Minimal Test Failed', error.message);
  }
};
  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      Region: '',
      Chapter: '',
      Country: '',
      Title: '',
      FirstName: '',
      LastName: '',
      Company: '',
      Language: '',
      TelephoneNumber: '',
      VisitorEmail: '',
      MobileNumber: '',
      VisitorCountry: '',
      VisitorAddress: '',
      VisitorCity: '',
      VisitorState: '',
      VisitorPostcode: '',
      VisitorName: '',
      VisitorPhone: '',
      VisitorBusiness: '',
      VisitDate: new Date(),
      BecameMember: false,
      MemberId: null,
      Notes: '',
      // Keep BroughtByMemberId from memberId
    }));
    setActiveTab('chapter');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chapter':
        return (
          <View style={styles.tabContent}>
            {memberId && (
              <View style={styles.memberInfo}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.memberInfoText}>
                  Visitor will be registered under your account (Member ID: {memberId})
                </Text>
              </View>
            )}
            <View style={styles.section}>
              <Text style={styles.label}>Country *</Text>
              <View style={styles.inputContainer}>
                <Icon name="earth" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter country"
                  value={formData.Country}
                  onChangeText={(text) => handleInputChange('Country', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Region *</Text>
              <View style={styles.inputContainer}>
                <Icon name="map" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter region"
                  value={formData.Region}
                  onChangeText={(text) => handleInputChange('Region', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Chapter *</Text>
              <View style={styles.inputContainer}>
                <Icon name="book" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter chapter"
                  value={formData.Chapter}
                  onChangeText={(text) => handleInputChange('Chapter', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Visit Date</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={20} color="#4A90E2" style={styles.icon} />
                <Text style={[styles.input, { color: formData.VisitDate ? '#333' : '#999' }]}>
                  {formData.VisitDate ? formData.VisitDate.toDateString() : 'Select visit date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.VisitDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
          </View>
        );

      case 'personal':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Title *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mr, Mrs, Ms, Dr"
                  value={formData.Title}
                  onChangeText={(text) => handleInputChange('Title', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>First Name *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  value={formData.FirstName}
                  onChangeText={(text) => handleInputChange('FirstName', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Last Name *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  value={formData.LastName}
                  onChangeText={(text) => handleInputChange('LastName', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Company *</Text>
              <View style={styles.inputContainer}>
                <Icon name="briefcase" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter company name"
                  value={formData.Company}
                  onChangeText={(text) => handleInputChange('Company', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'language':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Language</Text>
              <View style={styles.inputContainer}>
                <Icon name="translate" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter language"
                  value={formData.Language}
                  onChangeText={(text) => handleInputChange('Language', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Additional Notes</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter any additional notes about the visitor"
                  value={formData.Notes}
                  onChangeText={(text) => handleInputChange('Notes', text)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'contact':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Telephone</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter telephone"
                  value={formData.TelephoneNumber}
                  onChangeText={(text) => handleInputChange('TelephoneNumber', text)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Visitor Email</Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter visitor email"
                  value={formData.VisitorEmail}
                  onChangeText={(text) => handleInputChange('VisitorEmail', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputContainer}>
                <Icon name="cellphone" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  value={formData.MobileNumber}
                  onChangeText={(text) => handleInputChange('MobileNumber', text)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'address':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Country</Text>
              <View style={styles.inputContainer}>
                <Icon name="earth" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter visitor's country"
                  value={formData.VisitorCountry}
                  onChangeText={(text) => handleInputChange('VisitorCountry', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Address</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter address"
                  value={formData.VisitorAddress}
                  onChangeText={(text) => handleInputChange('VisitorAddress', text)}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>City</Text>
              <View style={styles.inputContainer}>
                <Icon name="city" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter city"
                  value={formData.VisitorCity}
                  onChangeText={(text) => handleInputChange('VisitorCity', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>State</Text>
              <View style={styles.inputContainer}>
                <Icon name="map" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  value={formData.VisitorState}
                  onChangeText={(text) => handleInputChange('VisitorState', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Post Code</Text>
              <View style={styles.inputContainer}>
                <Icon name="mailbox" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter post code"
                  value={formData.VisitorPostcode}
                  onChangeText={(text) => handleInputChange('VisitorPostcode', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleInputChange('BecameMember', !formData.BecameMember)}
            >
              <View style={[styles.checkbox, formData.BecameMember && styles.checkboxActive]}>
                {formData.BecameMember && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.confirmText}>Visitor became a member</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const handleNextTab = () => {
    const tabs = ['chapter', 'personal', 'language', 'contact', 'address'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const tabs = ['chapter', 'personal', 'language', 'contact', 'address'];
    const currentIndex = tabs.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register Visitor</Text>
        
        {/* Refresh button */}
        <TouchableOpacity onPress={async () => {
          await getCurrentUserMemberId();
          await getAuthToken();
        }}>
          <Icon name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabBar}
          contentContainerStyle={styles.tabBarContent}
        >
          {[
            { id: 'chapter', label: 'Chapter', icon: 'book' },
            { id: 'personal', label: 'Personal', icon: 'account' },
            { id: 'language', label: 'Language', icon: 'translate' },
            { id: 'contact', label: 'Contact', icon: 'phone' },
            { id: 'address', label: 'Address', icon: 'map-marker' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Icon
                name={tab.icon}
                size={14}
                color={activeTab === tab.id ? '#FFF' : '#4A90E2'}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Step {['chapter', 'personal', 'language', 'contact', 'address'].indexOf(activeTab) + 1} of 5
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { 
            width: `${(['chapter', 'personal', 'language', 'contact', 'address'].indexOf(activeTab) + 1) * 20}%` 
          }]} />
        </View>
      </View>

      {/* Tab Content */}
      <ImageBackground
        source={require('../assets/logoicon.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {renderTabContent()}
            
            {/* Navigation Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.navButton, styles.prevButton]}
                onPress={handlePrevTab}
                disabled={activeTab === 'chapter'}
              >
                <Icon name="chevron-left" size={20} color="#4A90E2" />
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>

              {activeTab === 'address' ? (
                <TouchableOpacity
                  style={[styles.navButton, styles.submitButton]}
                  onPress={handleSubmit}
                  disabled={loading || !memberId || !authToken}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Icon name="check" size={20} color="#FFF" />
                      <Text style={styles.submitButtonText}>
                        {!memberId ? 'No Member ID' : !authToken ? 'No Token' : 'Submit Visitor'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={handleNextTab}
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Icon name="chevron-right" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>

      {/* Success Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.successIconContainer}>
              <Icon name="check-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Visitor Registered Successfully!</Text>
            <Text style={styles.successMessage}>
              Visitor information has been saved to the system under your account.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                resetForm();
              }}
            >
              <Text style={styles.modalButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Visitors;




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    height: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  memberInfo: {
    backgroundColor: '#E8F4FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  memberInfoText: {
    fontSize: 13,
    color: '#2C5AA0',
    fontWeight: '500',
  },
  // COMPACT Tab Bar
  tabBarContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    height: 55,
  },
  tabBar: {
    flexGrow: 0,
  },
  tabBarContent: {
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 55,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginHorizontal: 5,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#E3F2FD',
    height: 38,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  tabIcon: {
    marginRight: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A90E2',
  },
  tabLabelActive: {
    color: '#FFF',
  },
  progressContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  progressText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 3,
    textAlign: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 1.5,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.08,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    minHeight: 45,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
    minHeight: 80,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#87CEEB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  confirmText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 5,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
  },
  prevButton: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  prevButtonText: {
    color: '#4A90E2',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
  nextButton: {
    backgroundColor: '#4A90E2',
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 25,
    width: '80%',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});