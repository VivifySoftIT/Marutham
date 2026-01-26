import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, StatusBar } from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import { LanguageProvider } from './service/LanguageContext';
import MemberIdService from './service/MemberIdService';
import styles from './styles/styles'; // Use the imported styles

export default function App() {
  useEffect(() => {
    // Initialize MemberIdService on app startup
    MemberIdService.initializeMemberId();
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
