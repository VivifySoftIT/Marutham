import React, { useEffect, useState } from 'react';
import { View, Text, Image, Alert, Modal, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../apiConfig';
import styles from '../styles/styles';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const CustomDrawerContent = (props) => {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeDesignation, setEmployeeDesignation] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/Dashboard/GetDashboardInfo`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch dashboard info');

        const data = await response.json();
        if (data && data.result) {
          setEmployeeName(data.result.name || 'No Name');
          setEmployeeDesignation(data.result.designation || 'No Designation');
          setProfileImage(data.result.photoPath);
        }
      } catch (error) {
        console.error('Error fetching dashboard info:', error);
      }
    };

    fetchDashboardInfo();
  }, []);

const handleSignOut = async () => {
  Alert.alert(
    'Confirm Sign Out',
    'Are you sure you want to sign out?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // ✅ Clear ALL saved credentials
            await AsyncStorage.removeItem('jwt_token');
            await AsyncStorage.removeItem('username');
            await AsyncStorage.removeItem('password');

            // ✅ Reset navigation to Login screen
            props.navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            console.error('Error during sign out:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]
  );
};
  const menuItems = [
    // { label: 'Home', screen: 'InventoryForm', icon: 'home' },
    { label: 'Members Dashboard', screen: 'MemberDashboard', icon: 'home' },
    { label: 'Mark Attendance', screen: 'Attendance', icon: 'event-available' },
     { label: 'MembersList', screen: 'MembersList', icon: 'description' },
    
    { label: 'Reports', icon: 'folder', isReports: true },
    { label: 'Sign Out', icon: 'exit-to-app', isSignOut: true },
  ];

  const reportItems = [
   
    { label: 'Biometric Report', screen: 'BiometricReport', icon: 'fingerprint' },
    
  ];

  
  return (
    <DrawerContentScrollView {...props} style={styles.drawerBackground}>
      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <Image 
          source={profileImage ? { uri: profileImage } : require('../assets/Profile.png')} 
          style={styles.profileImage} 
        />
        <View style={styles.profileDetails}>
          <Text style={styles.profileName}>{employeeName || 'Loading...'}</Text>
          <Text style={styles.profileDesignation}>{employeeDesignation || 'Loading...'}</Text>
        </View>
      </View>

      {/* Menu Items */}
      {menuItems.map((item, index) => (
        <DrawerItem
          key={index}
          label={() => <Text style={styles.drawerItemLabel}>{item.label}</Text>}
          icon={() => <MaterialIcons name={item.icon} size={22} color="#212c62" />}
          onPress={item.isSignOut 
            ? handleSignOut 
            : item.isReports 
              ? () => setShowReportsModal(true) 
              : item.isSafety
                ? () => setShowSafetyModal(true)
                : () => props.navigation.navigate(item.screen)}
          style={styles.customDrawerItemContainer}
        />
      ))}

      {/* Reports Modal */}
      <Modal
        visible={showReportsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Report</Text>
              <TouchableOpacity onPress={() => setShowReportsModal(false)}>
                <MaterialIcons name="close" size={24} color="#212c62" />
              </TouchableOpacity>
            </View>
            
            {reportItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalItem}
                onPress={() => {
                  setShowReportsModal(false);
                  props.navigation.navigate(item.screen);
                }}
              >
                <MaterialIcons name={item.icon} size={20} color="#212c62" style={styles.modalIcon} />
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Safety Modal */}
      <Modal
        visible={showSafetyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSafetyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Safety Track</Text>
              <TouchableOpacity onPress={() => setShowSafetyModal(false)}>
                <MaterialIcons name="close" size={24} color="#212c62" />
              </TouchableOpacity>
            </View>
            
          
          </View>
        </View>
      </Modal>
    </DrawerContentScrollView>
  );
};

export default CustomDrawerContent;