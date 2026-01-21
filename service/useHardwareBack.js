import React from 'react'; 
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const useHardwareBack = (navigation) => {
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack(); 
        return true; 
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        subscription.remove(); 
      };
    }, [navigation])
  );
};

export default useHardwareBack;