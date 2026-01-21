import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import ApiService from '../service/api';

const NewMember = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member, isEditing } = route.params || {};

  const [formData, setFormData] = useState({
    memberName: "",
    mobileNum: "",
    email: "",
    joiningDate: "",
    business: "",
    address: "",
    batch: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // Load member data if editing
  useEffect(() => {
    if (isEditing && member) {
      console.log('NewMember - Loading member data for editing:', member);
      setFormData({
        memberName: member.name || "",
        mobileNum: member.phone || "",
        email: member.email || "",
        joiningDate: member.joinDate || "",
        business: member.business || "",
        address: member.address || "",
        batch: member.batch || "",
      });
      
      // Set the date if available
      if (member.joinDate) {
        try {
          setSelectedDate(new Date(member.joinDate));
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
    }
  }, [isEditing, member]);

  const initialFormState = {
    memberName: "",
    mobileNum: "",
    email: "",
    joiningDate: "",
    business: "",
    address: "",
    batch: "",
  };

  const handleInputChange = (field, value) => {
    if (field === "mobileNum") {
      const sanitized = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [field]: sanitized }));
    } else if (field === "joiningDate") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    
    if (date) {
      setSelectedDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData((prev) => ({ ...prev, joiningDate: formattedDate }));
      console.log("Date selected from calendar:", formattedDate);
    }
  };

  const openDatePicker = () => {
    Keyboard.dismiss();
    
    if (formData.joiningDate) {
      try {
        const dateParts = formData.joiningDate.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate);
          }
        }
      } catch (error) {
        console.log("Error parsing date:", error);
      }
    }
    
    setShowDatePicker(true);
  };

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedDate(new Date());
    setProfilePhoto(null);
    Keyboard.dismiss();
    
    if (Platform.OS === 'web' && document.activeElement) {
      document.activeElement.blur();
    }
  };

  const isValidDate = (dateString) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  };

  const handleAddMember = async () => {
    const { memberName, mobileNum, joiningDate, business } = formData;

    if (!memberName.trim()) {
      Alert.alert("Validation Error", "Member Name is required.");
      return;
    }
    if (mobileNum.length !== 10) {
      Alert.alert("Validation Error", "Mobile Number must be exactly 10 digits.");
      return;
    }
    if (!joiningDate.trim()) {
      Alert.alert("Validation Error", "Joining Date is required.");
      return;
    }
    
    if (!isValidDate(joiningDate)) {
      Alert.alert(
        "Invalid Date Format", 
        "Please enter date in YYYY-MM-DD format or use calendar picker.",
        [
          {
            text: "Use Calendar",
            onPress: openDatePicker
          },
          {
            text: "OK",
            style: "default"
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      if (isEditing && member) {
        // Update existing member
        const memberData = {
          id: member.id,
          name: memberName,
          phone: mobileNum,
          email: formData.email || '',
          joinDate: joiningDate,
          status: 'Active',
          feesStatus: 'Unpaid',
          address: formData.address || '',
          batch: formData.batch || '',
          business: business,
          updatedBy: 'Admin',
        };

        console.log('Updating member:', memberData);
        await ApiService.updateMember(member.id, memberData);
        
        Alert.alert("Success", "Member updated successfully!", [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        // Create new member
        const memberData = {
          name: memberName,
          memberId: `MEM${Date.now().toString().slice(-6)}`,
          phone: mobileNum,
          email: formData.email || '',
          joinDate: joiningDate,
          status: 'Active',
          feesStatus: 'Unpaid',
          address: formData.address || '',
          batch: formData.batch || '',
          business: business,
          createdBy: 'Admin',
          profilePhoto: profilePhoto || null,
        };

        console.log('Creating new member:', memberData);
        await ApiService.createMember(memberData);
        
        // Clear all form fields
        setFormData({
          memberName: "",
          mobileNum: "",
          email: "",
          joiningDate: "",
          business: "",
          address: "",
          batch: "",
        });
        setProfilePhoto(null);
        setSelectedDate(new Date());
        
        Alert.alert("Success", "Member added successfully!", [
          {
            text: "OK",
            onPress: () => {},
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save member");
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
      
      {/* Header - MembersDirectory Style */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Member' : 'Add New Member'}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetForm}
            disabled={loading}
          >
            <Icon name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.excelButton}
            onPress={() => navigation.navigate('BulkMemberImport')}
            disabled={loading}
          >
            <Icon name="file-excel" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Member Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Member Name *</Text>
          <View style={styles.inputContainer}>
            <Icon name="account" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter member name"
              value={formData.memberName}
              onChangeText={(text) => handleInputChange("memberName", text)}
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View>

        {/* Mobile Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number *</Text>
          <View style={styles.inputContainer}>
            <Icon name="phone" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              value={formData.mobileNum}
              onChangeText={(text) => handleInputChange("mobileNum", text)}
              keyboardType="phone-pad"
              maxLength={10}
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Icon name="email" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              value={formData.email}
              onChangeText={(text) => handleInputChange("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View>

        {/* Joining Date with Calendar Icon INSIDE the input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Joining Date *</Text>
          <Text style={styles.dateHelperText}>Format: YYYY-MM-DD</Text>
          <View style={styles.inputContainer}>
            <Icon name="calendar" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.joiningDate}
              onChangeText={(text) => handleInputChange("joiningDate", text)}
              placeholderTextColor="#999"
              editable={!loading}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <TouchableOpacity 
              style={[styles.calendarIconInside, loading && styles.disabledButton]}
              onPress={openDatePicker}
              disabled={loading}
            >
              <Icon name="calendar-month" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputContainer}>
            <Icon name="map-marker" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter address"
              value={formData.address}
              onChangeText={(text) => handleInputChange("address", text)}
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View>

        {/* Business */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business/Occupation</Text>
          <View style={styles.inputContainer}>
            <Icon name="briefcase" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter business or occupation"
              value={formData.business}
              onChangeText={(text) => handleInputChange("business", text)}
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View>

        {/* Batch */}
        {/* <View style={styles.inputGroup}>
          <Text style={styles.label}>Batch</Text>
          <View style={styles.inputContainer}>
            <Icon name="clock" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Morning, Evening, etc."
              value={formData.batch}
              onChangeText={(text) => handleInputChange("batch", text)}
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View>
        </View> */}

        {/* Buttons Container */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.resetFormButton, loading && styles.disabledButton]}
            onPress={resetForm}
            disabled={loading}
          >
            <Icon name="refresh" size={18} color="#4A90E2" />
            <Text style={styles.resetButtonText}>Reset Form</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, loading && styles.disabledButton]}
            onPress={handleAddMember}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name={isEditing ? "pencil" : "account-plus"} size={18} color="#FFF" />
                <Text style={styles.addButtonText}>{isEditing ? 'Update Member' : 'Add Member'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* <TouchableOpacity
          style={styles.clearAllButton}
          onPress={resetForm}
          disabled={loading}
        >
          <Icon name="close-circle" size={18} color="#FF6B6B" />
          <Text style={styles.clearAllButtonText}>Clear All Fields</Text>
        </TouchableOpacity> */}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 15,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#FFF',
    textAlign: 'center',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetButton: {
    padding: 8,
    opacity: 0.9,
  },
  excelButton: {
    padding: 8,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 4,
  },
  dateHelperText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontStyle: 'italic',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
    paddingHorizontal: 12,
    minHeight: 45,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
  },
  calendarIconInside: {
    padding: 5,
    marginLeft: 5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  resetFormButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#4A90E2',
  },
  resetButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addButton: {
    flex: 2,
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  clearAllButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default NewMember;