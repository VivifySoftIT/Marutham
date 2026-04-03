import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, StatusBar } from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import { LanguageProvider } from './service/LanguageContext';
import MemberIdService from './service/MemberIdService';
import PermissionService from './service/PermissionService';
import styles from './styles/styles';

export default function App() {
  useEffect(() => {
    MemberIdService.initializeMemberId();
    // Request camera, mic, location on first launch
    PermissionService.requestStartupPermissions();
  }, []);

  return (
    <LanguageProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container}> 
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <StackNavigator />
        </SafeAreaView>
      </NavigationContainer>
    </LanguageProvider>
  );
}
