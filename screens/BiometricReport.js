import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialCommunityIcons } from 'react-native-vector-icons';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import API_BASE_URL from '../apiConfig';
import useHardwareBack from '../service/useHardwareBack';
const BiometricScreen = ({ navigation }) => {
  const [biometricDetails, setBiometricDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(null);
const [toDate, setToDate] = useState(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [numColumns, setNumColumns] = useState(1);

  useFocusEffect(
    React.useCallback(() => {
      setBiometricDetails(null);
      setFromDate('');
      setToDate('');
      setLoading(false);
    }, [])
  );
  useHardwareBack(navigation);
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const fetchBiometricDetails = async (fromDate, toDate) => {
    try {
      setLoading(true);
  
      // Prepare query parameters
      const queryParams = new URLSearchParams();
    if (fromDate) {
  queryParams.append('fromDate', formatDateForApi(fromDate));
}
if (toDate) {
  queryParams.append('toDate', formatDateForApi(toDate));
}

      const token = await AsyncStorage.getItem('jwt_token');
      if (!token) {
        Alert.alert('Error', 'User is not logged in. Please log in again.');
        return;
      }
  
      // Construct the API URL with optional query parameters
      const url = `${API_BASE_URL}/api/Biometric/BiometricHistory?${queryParams.toString()}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.data && response.data.result) {
        if (response.data.result.length === 0) {
          Alert.alert('No Data', 'No biometric records found for the selected date range.');
        }
        setBiometricDetails(response.data.result);
      } else {
        Alert.alert('Error', 'Unable to load biometric details.');
      }
    } catch (error) {
      console.error('Error fetching biometric details:', error);
      Alert.alert('Error', 'Failed to fetch biometric details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
 const formatDateForApi = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${year}-${month}-${day}`;
};

  
  const handleSearch = () => {
    // Remove the validation for fromDate and toDate
    fetchBiometricDetails(fromDate, toDate);
  };

 const renderItem = ({ item }) => {
  const formattedDate = formatDate(new Date(item.attendanceDate));
  const formattedCheckInTime = item.checkInTime ? formatDate(new Date(item.checkInTime)) + ' ' + formatTime(new Date(item.checkInTime)) : 'N/A';
  const isInvalidCheckOut = item.checkOutTime === '1900-01-01T00:00:00';
  const formattedCheckOutTime = isInvalidCheckOut 
    ? '-' 
    : formatDate(new Date(item.checkOutTime)) + ' ' + formatTime(new Date(item.checkOutTime));

    return (
      <View style={styles.gridItemContainer}>
        <View style={styles.itemContainer}>
          <Text style={styles.itemDate}>📅 Date: {formattedDate}</Text>
          {/* <View style={styles.empNoContainer}>
            <Ionicons name="person-circle" size={18} color="#007bff" style={styles.empNoIcon} />
            <Text style={styles.empNoText}>Emp No: {item.empNo}</Text>
          </View> */}
          <Text style={styles.checkInText}>
            <MaterialCommunityIcons name="account-check" size={20} color="#28A745" /> Check-In: {formattedCheckInTime}
          </Text>
          <Text style={styles.checkOutText}>
            <MaterialCommunityIcons name="logout-variant" size={20} color="#F44336" /> Check-Out: {formattedCheckOutTime}
          </Text>
        </View>
      </View>
    );
  };

  const showFromDatepicker = () => setShowFromDatePicker(true);
  const showToDatepicker = () => setShowToDatePicker(true);

  const onFromDateChange = (event, selectedDate) => {
  setShowFromDatePicker(false);
  if (event.type === 'dismissed') {
    setFromDate(null); // Clear the date if cancelled
  } else if (selectedDate) {
    setFromDate(selectedDate);
  }
};

const onToDateChange = (event, selectedDate) => {
  setShowToDatePicker(false);
  if (event.type === 'dismissed') {
    setToDate(null); // Clear the date if cancelled
  } else if (selectedDate) {
    setToDate(selectedDate);
  }
};

  return (
    <View style={styles.container}>
      {/* Date Selection Row - Updated to match AdvanceReport */}
      <View style={styles.dateSelectionRow}>
        {/* From Date */}
        <TouchableOpacity 
          style={styles.dateInput} 
          onPress={showFromDatepicker}
        >
          <Ionicons name="calendar" size={16} color="rgb(26, 53, 117)" style={styles.dateIcon} />
          <Text style={styles.dateInputText}>
  {fromDate ? formatDate(fromDate) : 'From Date'}
</Text>
        </TouchableOpacity>

        {/* To Date */}
        <TouchableOpacity 
          style={styles.dateInput} 
          onPress={showToDatepicker}
        >
          <Ionicons name="calendar" size={16} color="rgb(26, 53, 117)" style={styles.dateIcon} />
          <Text style={styles.dateInputText}>
  {toDate ? formatDate(toDate) : 'To Date'}
</Text>
        </TouchableOpacity>

        {/* Search Icon Button */}
        <TouchableOpacity 
          style={styles.searchIconButton} 
          onPress={handleSearch}
          disabled={loading}
        >
          <View style={{ position: 'relative' }}>
                      <Ionicons 
                        name="search" 
                        size={20} 
                        color="rgb(26, 53, 117)" 
                        style={{ position: 'absolute', left: 0.5, top: 0.5 }} 
                      />
                      <Ionicons 
                        name="search" 
                        size={22} 
                        color="rgb(26, 53, 117)" 
                      />
                    </View>
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      {showFromDatePicker && (
  <DateTimePicker 
    value={fromDate || new Date()}
    mode="date" 
    display="default" 
    onChange={onFromDateChange} 
  />
)}

{showToDatePicker && (
  <DateTimePicker 
    value={toDate || new Date()}
    mode="date" 
    display="default" 
    onChange={onToDateChange} 
  />
)}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      )}

      {/* Biometric Data Section */}
      {biometricDetails?.length > 0 ? (
        <View style={styles.Belowcontainer}>
          <FlatList
            key={numColumns.toString()}
            data={biometricDetails}
            renderItem={renderItem}
            keyExtractor={(item, index) => index.toString()}
            numColumns={numColumns}
            contentContainerStyle={styles.scrollViewContent}
          />
        </View>
      ) : (
        !loading && (
          <View style={styles.errorContainer}>
           
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    paddingTop: 45,
  },
  dateSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgb(26, 53, 117)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    flex: 1,
    marginHorizontal: 3,
  },
  dateIcon: {
    marginRight: 5,
    fontSize: 15,
    color: 'rgb(26, 53, 117)'
  },
  dateInputText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  searchIconButton: {
    backgroundColor: '#ffffff',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
    borderWidth: 1.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
  gridItemContainer: {
    flex: 1,
    padding: 5,
  },
  itemContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemDate: {
    fontSize: 16,
    color: '#004085',
    marginBottom: 8,
    fontWeight: '600',
  },
  checkInText: {
    fontSize: 14,
    color: '#28A745',
    marginBottom: 8,
  },
  checkOutText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 8,
  },
  empNoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  empNoIcon: {
    marginRight: 5,
  },
  empNoText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  Belowcontainer: {
    backgroundColor: '#f0f4f8',
    marginTop: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'darkblue',
    borderRadius: 8,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
});

export default BiometricScreen;