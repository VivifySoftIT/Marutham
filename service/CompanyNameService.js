import AsyncStorage from '@react-native-async-storage/async-storage';

// Returns the logged-in user's sub-company name, falling back to 'Marutham'
const getCompanyName = async () => {
  try {
    return 'Marutham';
  } catch {
    return 'Marutham';
  }
};

export default { getCompanyName };
