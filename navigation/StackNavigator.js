import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { View, ActivityIndicator } from 'react-native'; // 👈 ADDED

// Import Screens
import LoginScreen from '../screens/LoginScreen';

import NewMember from '../screens/NewMember';
import BulkMemberImport from '../screens/BulkMemberImport';
import MemberDashboard from '../screens/MemberDashboard';
import MembersList from '../screens/MembersList';
import MemberDetails from '../screens/MemberDetails';
import DrawerNavigator from './DrawerNavigator';
import UserDashboard from '../screens/UserDashboard';
import ChangePassword from '../screens/ChangePassword';
import TYFCBSlip from '../screens/TYFCBSlip';
import ReferralSlip from '../screens/ReferralSlip';
import OneToOneSlip from '../screens/OneToOneSlip';
import MyFeed from '../screens/MyFeed';
import MyPayments from '../screens/MyPayments';
import MembersDirectory from '../screens/MembersDirectory';
import AdminMeeting from '../screens/AdminMeeting';
import NotificationsScreen from '../screens/NotificationsScreen';
import MyCEUs from '../screens/MyCEUs';
import Visitors from '../screens/Visitors';

const Stack = createNativeStackNavigator();

const StackNavigator = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [notificationScreen, setNotificationScreen] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        const username = await AsyncStorage.getItem('username');
        const password = await AsyncStorage.getItem('password');

        console.log('=== AUTO-LOGIN DEBUG ===');
        console.log('Token:', token);
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('IsLoggedIn:', !!token && !!username && !!password);

        setIsLoggedIn(!!token && !!username && !!password);
      } catch (error) {
        console.error('Error reading AsyncStorage:', error);
        setIsLoggedIn(false);
      }
    };

    const handleNotificationResponse = (response) => {
      console.log("App Opened via Notification:", response);
      const screen = response?.notification?.request?.content?.data?.screen;
      if (screen) {
        setNotificationScreen(screen);
      }
    };

    checkLoginStatus();

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
    };
  }, []);

  // ✅ Show loader while checking — BETTER UX
  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7FB' }}>
        <ActivityIndicator size="large" color="#212c62" />
      </View>
    );
  }

  // ✅ MAGIC LINE: Dynamically set starting screen
  const initialRouteName = isLoggedIn ? 'DrawerNavigator' : 'Login';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName} // 👈 THIS IS THE FIX — WAS MISSING!
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen 
        name="Login"
        component={LoginScreen}
        initialParams={{ notificationScreen }}
      />
      <Stack.Screen 
        name="DrawerNavigator"
        component={DrawerNavigator}
        initialParams={{ screen: notificationScreen || "MemberDashboard" }}
      />
      <Stack.Screen 
        name="UserDashboard"
        component={UserDashboard}
      />
      <Stack.Screen 
        name="ChangePassword"
        component={ChangePassword}
      />
      <Stack.Screen 
        name="TYFCBSlip"
        component={TYFCBSlip}
      />
      <Stack.Screen 
        name="ReferralSlip"
        component={ReferralSlip}
      />
      <Stack.Screen 
        name="OneToOneSlip"
        component={OneToOneSlip}
      />
      <Stack.Screen 
        name="MyFeed"
        component={MyFeed}
      />
      <Stack.Screen 
        name="MyPayments"
        component={MyPayments}
      />
      <Stack.Screen 
        name="MembersDirectory"
        component={MembersDirectory}
      />
      <Stack.Screen 
        name="AdminMeeting"
        component={AdminMeeting}
      />
      <Stack.Screen 
        name="NotificationsScreen"
        component={NotificationsScreen}
      />
      <Stack.Screen 
        name="MyCEUs"
        component={MyCEUs}
      />
      {/* <Stack.Screen name="ForgotPassword" component={ForgotPassword} /> */}
      <Stack.Screen 
        name="BulkMemberImport"
        component={BulkMemberImport}
      />
      <Stack.Screen 
        name="MemberDetails"
        component={MemberDetails}
      />
      <Stack.Screen 
        name="Visitors"
        component={Visitors}
      />
    
    </Stack.Navigator>
  );
};

export default StackNavigator;