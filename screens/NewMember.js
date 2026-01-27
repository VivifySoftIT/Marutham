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
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../service/api';
import MemberIdService from '../service/MemberIdService';

const NewMember = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { member, isEditing } = route.params || {};

  const [formData, setFormData] = useState({
    memberName: "",
    mobileNum: "",
    email: "",
    joiningDate: "",
    dateOfBirth: "",
    business: "",
    address: "",
    batch: "",
    subCompanyId: null,
    gender: "", // Male or Female
  });

  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);
  const [showDOBDatePicker, setShowDOBDatePicker] = useState(false);
  const [selectedJoiningDate, setSelectedJoiningDate] = useState(new Date());
  const [selectedDOBDate, setSelectedDOBDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Company data
  const [mainCompanies, setMainCompanies] = useState([]);
  const [subCompanies, setSubCompanies] = useState([]);
  const [loadingMainCompanies, setLoadingMainCompanies] = useState(false);
  const [loadingSubCompanies, setLoadingSubCompanies] = useState(false);
  const [showMainCompanyDropdown, setShowMainCompanyDropdown] = useState(false);
  const [showSubCompanyDropdown, setShowSubCompanyDropdown] = useState(false);
  const [selectedMainCompanyId, setSelectedMainCompanyId] = useState(null);

  // Load member data if editing
  useEffect(() => {
    if (isEditing && member) {
      console.log('NewMember - Loading member data for editing:', member);
      setFormData({
        memberName: member.name || "",
        mobileNum: member.phone || "",
        email: member.email || "",
        joiningDate: member.joinDate || "",
        dateOfBirth: member.dateOfBirth || "",
        business: member.business || "",
        address: member.address || "",
        batch: member.batch || "",
        subCompanyId: member.subCompanyId || null,
        gender: member.gender || "",
      });
      
      // Set the joining date if available
      if (member.joinDate) {
        try {
          setSelectedJoiningDate(new Date(member.joinDate));
        } catch (error) {
          console.error('Error parsing joining date:', error);
        }
      }
      
      // Set the date of birth if available
      if (member.dateOfBirth) {
        try {
          setSelectedDOBDate(new Date(member.dateOfBirth));
        } catch (error) {
          console.error('Error parsing date of birth:', error);
        }
      }
    }
  }, [isEditing, member]);

  // Load companies on component mount
  useEffect(() => {
    loadMainCompanies();
  }, []);

  // Load sub-companies when main company is selected
  useEffect(() => {
    if (selectedMainCompanyId) {
      loadSubCompanies(selectedMainCompanyId);
    } else {
      setSubCompanies([]);
      setFormData(prev => ({ ...prev, subCompanyId: null }));
    }
  }, [selectedMainCompanyId]);

  const loadMainCompanies = async () => {
    try {
      setLoadingMainCompanies(true);
      const mainCompaniesData = await ApiService.getMainCompanies();
      setMainCompanies(mainCompaniesData || []);
      
      // If no main company selected and there's a default company, select it
      if (!selectedMainCompanyId && mainCompaniesData && mainCompaniesData.length > 0) {
        const defaultMainCompany = mainCompaniesData.find(c => c.companyCode === 'ALAIGAL') || mainCompaniesData[0];
        setSelectedMainCompanyId(defaultMainCompany.id);
      }
    } catch (error) {
      console.error('Error loading main companies:', error);
      Alert.alert('Error', 'Failed to load main companies');
    } finally {
      setLoadingMainCompanies(false);
    }
  };

  const loadSubCompanies = async (mainCompanyId) => {
    try {
      setLoadingSubCompanies(true);
      const subCompaniesData = await ApiService.getSubCompaniesByMainCompany(mainCompanyId);
      setSubCompanies(subCompaniesData || []);
      
      // If no sub-company selected and there's a default sub-company, select it
      if (!formData.subCompanyId && subCompaniesData && subCompaniesData.length > 0) {
        const defaultSubCompany = subCompaniesData.find(sc => sc.subCompanyCode === 'MAIN') || subCompaniesData[0];
        setFormData(prev => ({ ...prev, subCompanyId: defaultSubCompany.id }));
      }
    } catch (error) {
      console.error('Error loading sub-companies:', error);
      Alert.alert('Error', 'Failed to load sub-companies');
    } finally {
      setLoadingSubCompanies(false);
    }
  };

  // Get current user's member ID using MemberIdService
  const getCurrentUserMemberId = async () => {
    return await MemberIdService.getCurrentUserMemberId();
  };

  const initialFormState = {
    memberName: "",
    mobileNum: "",
    email: "",
    joiningDate: "",
    dateOfBirth: "",
    business: "",
    address: "",
    batch: "",
    subCompanyId: null,
  };

  const handleInputChange = (field, value) => {
    if (field === "mobileNum") {
      const sanitized = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [field]: sanitized }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleJoiningDateChange = (_, date) => {
    setShowJoiningDatePicker(false);
    
    if (date) {
      setSelectedJoiningDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData((prev) => ({ ...prev, joiningDate: formattedDate }));
      console.log("Joining Date selected from calendar:", formattedDate);
    }
  };

  const handleDOBDateChange = (_, date) => {
    setShowDOBDatePicker(false);
    
    if (date) {
      setSelectedDOBDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData((prev) => ({ ...prev, dateOfBirth: formattedDate }));
      console.log("Date of Birth selected from calendar:", formattedDate);
    }
  };

  const openJoiningDatePicker = () => {
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
            setSelectedJoiningDate(parsedDate);
          }
        }
      } catch (error) {
        console.log("Error parsing joining date:", error);
      }
    }
    
    setShowJoiningDatePicker(true);
  };

  const openDOBDatePicker = () => {
    Keyboard.dismiss();
    
    if (formData.dateOfBirth) {
      try {
        const dateParts = formData.dateOfBirth.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDOBDate(parsedDate);
          }
        }
      } catch (error) {
        console.log("Error parsing date of birth:", error);
      }
    }
    
    setShowDOBDatePicker(true);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedJoiningDate(new Date());
    setSelectedDOBDate(new Date());
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
    
    if (!formData.subCompanyId) {
      Alert.alert("Validation Error", "Sub Company selection is required.");
      return;
    }
    
    if (!isValidDate(joiningDate)) {
      Alert.alert(
        "Invalid Date Format", 
        "Please enter date in YYYY-MM-DD format or use calendar picker.",
        [
          {
            text: "Use Calendar",
            onPress: openJoiningDatePicker
          },
          {
            text: "OK",
            style: "default"
          }
        ]
      );
      return;
    }

    // Validate date of birth if provided
    if (formData.dateOfBirth && !isValidDate(formData.dateOfBirth)) {
      Alert.alert(
        "Invalid Date of Birth Format", 
        "Please enter date in YYYY-MM-DD format or use calendar picker.",
        [
          {
            text: "Use Calendar",
            onPress: openDOBDatePicker
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
          dateOfBirth: formData.dateOfBirth || '',
          status: 'Active',
          feesStatus: 'Unpaid',
          address: formData.address || '',
          batch: formData.batch || '',
          business: business,
          subCompanyId: formData.subCompanyId,
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
        // Get admin member ID using robust 3-tier lookup
        const adminMemberId = await getCurrentUserMemberId();
        if (!adminMemberId) {
          Alert.alert("Error", "Admin member ID not found. Please login again.");
          setLoading(false);
          return;
        }

        const memberData = {
          Name: memberName,
          MemberId: `MEM${Date.now().toString().slice(-6)}`,
          Phone: mobileNum,
          Email: formData.email || '',
          DOB: formData.dateOfBirth || null,
          Address: formData.address || '',
          Batch: formData.batch || '',
          Business: business,
          BusinessCategory: formData.businessCategory || null,
          MembershipType: formData.membershipType || null,
          ReferenceId: formData.referenceId || null,
          Gender: formData.gender || null, // Add Gender field
          CreatedBy: parseInt(adminMemberId), // Pass admin member ID as integer
        };

        console.log('Creating new member with admin ID:', adminMemberId);
        console.log('Member data:', memberData);
        await ApiService.createMember(memberData);
        
        // Clear all form fields
        setFormData(initialFormState);
        setSelectedJoiningDate(new Date());
        setSelectedDOBDate(new Date());
        
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

        {/* Gender Radio Buttons */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => handleInputChange("gender", "Male")}
              disabled={loading}
            >
              <View style={[styles.radioCircle, formData.gender === "Male" && styles.radioCircleSelected]}>
                {formData.gender === "Male" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Male</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => handleInputChange("gender", "Female")}
              disabled={loading}
            >
              <View style={[styles.radioCircle, formData.gender === "Female" && styles.radioCircleSelected]}>
                {formData.gender === "Female" && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date of Birth with Calendar Icon INSIDE the input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <Text style={styles.dateHelperText}>Format: YYYY-MM-DD</Text>
          <View style={styles.inputContainer}>
            <Icon name="cake" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.dateOfBirth}
              onChangeText={(text) => handleInputChange("dateOfBirth", text)}
              placeholderTextColor="#999"
              editable={!loading}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <TouchableOpacity 
              style={[styles.calendarIconInside, loading && styles.disabledButton]}
              onPress={openDOBDatePicker}
              disabled={loading}
            >
              <Icon name="calendar-month" size={20} color="#4A90E2" />
            </TouchableOpacity>
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
              onPress={openJoiningDatePicker}
              disabled={loading}
            >
              <Icon name="calendar-month" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
        </View>

        {showDOBDatePicker && (
          <DateTimePicker
            value={selectedDOBDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDOBDateChange}
          />
        )}

        {showJoiningDatePicker && (
          <DateTimePicker
            value={selectedJoiningDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleJoiningDateChange}
          />
        )}

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <View style={styles.inputContainer}>
            <Icon name="map-marker" size={18} color="#4A90E2" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter address"
              value={formData.address}
              onChangeText={(text) => handleInputChange("address", text)}
              placeholderTextColor="#999"
              editable={!loading}
              multiline
              numberOfLines={3}
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

        {/* Main Company Dropdown */}
       

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
  disabledButton: {
    opacity: 0.5,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
    paddingHorizontal: 12,
    minHeight: 45,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#87CEEB',
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedDropdownItem: {
    backgroundColor: '#E3F2FD',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  dropdownItemSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Radio button styles
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    paddingVertical: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#4A90E2',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4A90E2',
  },
  radioLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});

export default NewMember;