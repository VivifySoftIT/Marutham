import AsyncStorage from '@react-native-async-storage/async-storage';

// Returns the logged-in user's sub-company name, falling back to 'Alaigal'
const getCompanyName = async () => {
  try {
    const name = await AsyncStorage.getItem('subCompanyName');
    return name || 'Marutham';
  } catch {
    return 'Marutham';
  }
};

export default { getCompanyName };
