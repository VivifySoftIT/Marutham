import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, StatusBar } from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import { LanguageProvider } from './service/LanguageContext';
import styles from './styles/styles'; // Use the imported styles

export default function App() {
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
