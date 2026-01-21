import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaView, StatusBar } from 'react-native';
import StackNavigator from './navigation/StackNavigator';
import styles from './styles/styles'; // Use the imported styles

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}> 
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <StackNavigator />
      </SafeAreaView>
    </NavigationContainer>
  );
}
