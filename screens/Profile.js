import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  StatusBar,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker from '@react-native-community/datetimepicker';
import API_BASE_URL from "../apiConfig";
import useHardwareBack from '../service/useHardwareBack';
import { useLanguage } from '../service/LanguageContext';

const MyProfile = () => {
  const { t } = useLanguage();
  
  // Translation functions for stored data
  const translateGender = (gender) => {
    if (!gender) return '';
    const genderTranslations = {
      'Male': t('male'),
      'Female': t('female'),
      'Other': t('other'),
    };
    return genderTranslations[gender] || gender;
  };

  const translateStatus = (status) => {
    if (!status) return '';
    const statusTranslations = {
      'Active': t('active'),
      'Inactive': t('inactive'),
      'Pending': t('pending'),
      'Approved': t('approved'),
      'Rejected': t('rejected'),
      'Completed': t('completed'),
    };
    return statusTranslations[status] || status;
  };

  const [profile, setProfile] = useState({
    name: "",
    employeeNo: "",
    designation: "",
    gender: "",
    email: "",
    contactNumber: "",
    contactAddress: "",
    profileImage: null,
    status: "",
    joinDate: "",
    dob: "",
    subCompanyId: null,
  });

  const [activeTab, setActiveTab] = useState("personal");
  const [editingField, setEditingField] = useState(null);
  const [tempImage, setTempImage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null);

  const navigation = useNavigation();
  useHardwareBack(navigation);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const memberId = await getCurrentUserMemberId();
        
        if (!memberId) {
          console.log('Member ID not found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}`);
        
        if (!response.ok) {
          console.error('Failed to fetch member details');
          setLoading(false);
          return;
        }

        const memberData = await response.json();
        console.log('Member details loaded:', memberData);

        const savedImage = await AsyncStorage.getItem("profileImage");

        // Helper to format date for display (YYYY/MM/DD format)
        const formatDateForDisplay = (dateString) => {
          if (!dateString) return "";
          try {
            // Handle both ISO format and YYYY-MM-DD format from API
            let date;
            if (dateString.includes('T')) {
              // ISO format - extract just the date part to avoid timezone issues
              const datePart = dateString.split('T')[0];
              const [year, month, day] = datePart.split('-');
              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (dateString.includes('-')) {
              // YYYY-MM-DD format
              const [year, month, day] = dateString.split('-');
              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
              date = new Date(dateString);
            }
            
            if (isNaN(date.getTime())) return "";
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}/${month}/${day}`;
          } catch (error) {
            return dateString;
          }
        };

        setProfile({
          name: memberData.name || "",
          employeeNo: memberData.memberId || memberData.id?.toString() || "",
          designation: memberData.business || "",
          gender: memberData.gender || "",
          email: memberData.email || "",
          contactNumber: memberData.phone || "",
          contactAddress: memberData.address || "",
          profileImage: savedImage,
          status: memberData.status || "",
          joinDate: formatDateForDisplay(memberData.joinDate),
          dob: formatDateForDisplay(memberData.dob),
          subCompanyId: memberData.subCompanyId || null,
        });
      } catch (error) {
        console.error("Error fetching member profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const getCurrentUserMemberId = async () => {
    try {
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('Member ID found in storage:', storedMemberId);
        return parseInt(storedMemberId);
      }

      console.log('Member ID not in storage, attempting to look up...');
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          console.log('Trying GetByUserId with userId:', userId);
          const response = await fetch(`${API_BASE_URL}/api/Members/GetByUserId/${userId}`);
          if (response.ok) {
            const memberData = await response.json();
            if (memberData && memberData.id) {
              await AsyncStorage.setItem('memberId', memberData.id.toString());
              console.log('Member found via GetByUserId:', memberData.id);
              return memberData.id;
            }
          }
        } catch (error) {
          console.log('GetByUserId failed, trying name search:', error);
        }
      }

      if (fullName) {
        try {
          console.log('Searching members by name:', fullName);
          const response = await fetch(`${API_BASE_URL}/api/Members`);
          if (response.ok) {
            const members = await response.json();
            const member = members.find(m => 
              m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase()
            );

            if (member) {
              await AsyncStorage.setItem('memberId', member.id.toString());
              console.log('Member found by name:', member.id);
              return member.id;
            }
          }
        } catch (error) {
          console.log('Name search failed:', error);
        }
      }

      console.log('Could not find member ID');
      return null;
    } catch (error) {
      console.error('Error getting member ID:', error);
      return null;
    }
  };

  const handleSave = (field) => {
    if (field === "contactNumber" && profile[field].length < 10) {
      alert(t('phoneNumberMustBe10Digits'));
      return;
    }
    setEditingField(null);
  };

  const handleUpdate = async () => {
    console.log('Current profile state before update:', profile);
    
    // Validate phone numbers before update
    if (profile.contactNumber && profile.contactNumber.length !== 10) {
      alert(t('contactNumberMustBe10Digits'));
      return;
    }

    try {
      const memberId = await getCurrentUserMemberId();
      if (!memberId) {
        alert(t('memberIdNotFound'));
        return;
      }

      // Helper function to format date to ISO string or null
      const formatDate = (dateString) => {
        console.log('Formatting date for API:', dateString);
        if (!dateString || dateString.trim() === "") return null;
        
        try {
          // Handle YYYY/MM/DD format
          if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
              const [year, month, day] = parts;
              // Create date in local timezone and format as YYYY-MM-DD for API
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (!isNaN(date.getTime())) {
                // Format as YYYY-MM-DD without timezone conversion
                const formattedDate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log('Date formatted for API:', formattedDate);
                return formattedDate;
              }
            }
          }
          
          // Try to parse the date normally and format as YYYY-MM-DD
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const formattedDate = `${year}-${month}-${day}`;
          console.log('Date formatted for API (fallback):', formattedDate);
          return formattedDate;
        } catch (error) {
          console.log("Error formatting date:", dateString, error);
          return null;
        }
      };

      // Prepare update data matching UpdateMemberDto
      // Only send fields that the API accepts
      const updateData = {
        Name: profile.name || null,
        Phone: profile.contactNumber || null,
        Email: profile.email || null,
        Gender: profile.gender || null,
        DOB: formatDate(profile.dob),
        JoinDate: formatDate(profile.joinDate),
        Address: profile.contactAddress || null,
        Business: profile.designation || null,
        Status: profile.status || null,
        ProfileImage: profile.profileImage || null,
        SubCompanyId: profile.subCompanyId || null,
      };

      console.log("Updating member profile:", JSON.stringify(updateData, null, 2));

      const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Profile updated successfully:', result);
        alert(t('profileUpdatedSuccessfully'));
        
        // Refresh profile data using correct endpoint
        const updatedResponse = await fetch(`${API_BASE_URL}/api/Members/${memberId}`);
        if (updatedResponse.ok) {
          const memberData = await updatedResponse.json();
          const savedImage = await AsyncStorage.getItem("profileImage");
          
          // Helper to format date for display (keep YYYY/MM/DD format)
          const formatDateForDisplay = (dateString) => {
            if (!dateString) return "";
            try {
              // Handle both ISO format and YYYY-MM-DD format from API
              let date;
              if (dateString.includes('T')) {
                // ISO format - extract just the date part to avoid timezone issues
                const datePart = dateString.split('T')[0];
                const [year, month, day] = datePart.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else if (dateString.includes('-')) {
                // YYYY-MM-DD format
                const [year, month, day] = dateString.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              } else {
                date = new Date(dateString);
              }
              
              if (isNaN(date.getTime())) return "";
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}/${month}/${day}`;
            } catch (error) {
              return dateString;
            }
          };
          
          setProfile({
            name: memberData.name || "",
            employeeNo: memberData.memberId || memberData.id?.toString() || "",
            designation: memberData.business || "",
            gender: memberData.gender || "",
            email: memberData.email || "",
            contactNumber: memberData.phone || "",
            contactAddress: memberData.address || "",
            profileImage: savedImage,
            status: memberData.status || "",
            joinDate: formatDateForDisplay(memberData.joinDate),
            dob: formatDateForDisplay(memberData.dob),
            subCompanyId: memberData.subCompanyId || null,
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Update failed:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          alert(`${t('failedToUpdateProfile')}: ${errorJson.title || t('unknownError')}`);
        } catch (e) {
          alert(t('failedToUpdateProfileTryAgain'));
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(t('errorOccurredUpdatingProfile'));
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert(t('permissionMediaLibraryRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setTempImage(result.assets[0].uri);
      setShowModal(true);
    }
  };

  const removeImage = async () => {
    Alert.alert(
      t('removePhoto'),
      t('areYouSureRemovePhoto'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('remove'),
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("profileImage");
              setProfile((prev) => ({ ...prev, profileImage: null }));
              await handleUpdate();
            } catch (error) {
              console.error("Error removing image:", error);
            }
          }
        }
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      t('profilePhoto'),
      t('chooseAnOption'),
      [
        { text: t('cancel'), style: "cancel" },
        { text: t('changePhoto'), onPress: pickImage },
        ...(profile.profileImage ? [{ text: t('removePhoto'), style: "destructive", onPress: removeImage }] : [])
      ]
    );
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "";
    try {
      // Handle both ISO format and YYYY-MM-DD format from API
      let date;
      if (dateString.includes('T')) {
        // ISO format - extract just the date part to avoid timezone issues
        const datePart = dateString.split('T')[0];
        const [year, month, day] = datePart.split('-');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else if (dateString.includes('-')) {
        // YYYY-MM-DD format
        const [year, month, day] = dateString.split('-');
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch (error) {
      return dateString;
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && datePickerField) {
      // Format the selected date properly
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}/${month}/${day}`;
      
      console.log('Date selected:', selectedDate, 'Formatted:', formattedDate, 'Field:', datePickerField);
      setProfile((prev) => ({ ...prev, [datePickerField]: formattedDate }));
    }
    setDatePickerField(null);
  };

  const showDatePickerModal = (fieldName) => {
    setDatePickerField(fieldName);
    setShowDatePicker(true);
  };

  const setImage = async () => {
    if (tempImage) {
      try {
        await AsyncStorage.setItem("profileImage", tempImage);
        setProfile((prev) => ({ ...prev, profileImage: tempImage }));
        await handleUpdate();
      } catch (error) {
        console.error("Error saving image:", error);
      }
    }
    setTempImage(null);
    setShowModal(false);
  };

  const cancelImage = () => {
    setTempImage(null);
    setShowModal(false);
  };

  const handleLongPress = () => {
    if (profile.profileImage || profile.photoPath) {
      setFullScreenImage(profile.profileImage || profile.photoPath);
    }
  };

  const renderEditableField = (label, fieldName, value, isMultiline = false) => {
    const isEditing = editingField === fieldName;
    const isNumberField = fieldName === "contactNumber";
    const isDateField = fieldName === "joinDate" || fieldName === "dob";
    const isGenderField = fieldName === "gender";
    const isStatusField = fieldName === "status";

    // Get display value (translated for certain fields)
    const getDisplayValue = () => {
      if (isGenderField) {
        return translateGender(value);
      }
      if (isStatusField) {
        return translateStatus(value);
      }
      return value;
    };

    // Gender dropdown options
    if (isGenderField) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.editLabel}>{label}</Text>
          <View style={styles.inputWithIcon}>
            <View style={styles.genderPickerContainer}>
              {[
                { key: 'Male', label: t('male') },
                { key: 'Female', label: t('female') },
                { key: 'Other', label: t('other') }
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.genderOption,
                    profile.gender === option.key && styles.genderOptionSelected
                  ]}
                  onPress={() => setProfile((prev) => ({ ...prev, gender: option.key }))}
                >
                  <Icon 
                    name={profile.gender === option.key ? "radiobox-marked" : "radiobox-blank"} 
                    size={20} 
                    color={profile.gender === option.key ? "#4A90E2" : "#999"} 
                  />
                  <Text style={[
                    styles.genderOptionText,
                    profile.gender === option.key && styles.genderOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }

    // Date field with calendar picker
    if (isDateField) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.editLabel}>{label}</Text>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => showDatePickerModal(fieldName)}
          >
            <Text style={[styles.datePickerText, !value && styles.datePickerPlaceholder]}>
              {value || t('selectDate')}
            </Text>
            <Icon name="calendar" size={20} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      );
    }

    // For all other fields, show translated display value
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.editLabel}>{label}</Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            value={getDisplayValue()}
            onChangeText={(text) => {
              if (isNumberField) {
                const sanitizedText = text.replace(/\D/g, "");
                if (sanitizedText.length > 10) {
                  alert(t('inputCannotExceed10Digits'));
                  return;
                }
                setProfile((prev) => ({ ...prev, [fieldName]: sanitizedText }));
              } else {
                setProfile((prev) => ({ ...prev, [fieldName]: text }));
              }
            }}
            editable={!isStatusField} // Status field is read-only
            multiline={isMultiline}
            keyboardType={isNumberField ? "numeric" : "default"}
            maxLength={isNumberField ? 10 : undefined}
            style={[
              styles.input, 
              isMultiline && styles.inputMultiline,
              isStatusField && { color: '#666' }
            ]}
          />
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave(fieldName) : setEditingField(fieldName))}
            style={styles.iconContainer}
            disabled={isStatusField}
          >
            <Icon
              name={isStatusField ? "lock" : (isEditing ? "check" : "pencil")}
              size={20}
              color={isStatusField ? "#999" : (isEditing ? "#28A745" : "#4A90E2")}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('loadingProfile')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />
        
        <LinearGradient
          colors={['#4A90E2', '#87CEEB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('myProfile')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ChangePassword")}>
              <Icon name="lock-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={showImageOptions} onLongPress={handleLongPress}>
              {profile.profileImage || profile.photoPath ? (
                <Image
                  source={{ uri: profile.profileImage || profile.photoPath }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="account-circle" size={60} color="#4A90E2" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileHint}>{t('tapToChangeLongPressToView')}</Text>
          </View>

          <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
            <View style={styles.fullScreenContainer}>
              <TouchableOpacity onPress={() => setFullScreenImage(null)} style={styles.closeButton}>
                <Icon name="close" size={30} color="#FFF" />
              </TouchableOpacity>
              <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} />
            </View>
          </Modal>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "personal" && styles.activeTab]}
              onPress={() => setActiveTab("personal")}
            >
              <Text style={[styles.tabText, activeTab === "personal" && styles.activeTabText]}>
                {t('personal')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "professional" && styles.activeTab]}
              onPress={() => setActiveTab("professional")}
            >
              <Text style={[styles.tabText, activeTab === "professional" && styles.activeTabText]}>
                {t('professional')}
              </Text>
            </TouchableOpacity>
          </View>
       
          {activeTab === "personal" && (
            <View style={styles.formSection}>
              {renderEditableField(t('name'), "name", profile.name)}
              {renderEditableField(t('gender'), "gender", profile.gender)}
              {renderEditableField(t('email'), "email", profile.email)}
              {renderEditableField(t('contactNumber'), "contactNumber", profile.contactNumber)}
              {renderEditableField(t('dateOfBirth'), "dob", profile.dob)}
              {renderEditableField(t('address'), "contactAddress", profile.contactAddress, true)}
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>{t('saveChanges')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "professional" && (
            <View style={styles.formSection}>
              {renderEditableField(t('memberID'), "employeeNo", profile.employeeNo)}
              {renderEditableField(t('business'), "designation", profile.designation)}
              {renderEditableField(t('status'), "status", profile.status)}
              {renderEditableField(t('joinDate'), "joinDate", profile.joinDate)}
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>{t('saveChanges')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('setProfilePicture')}</Text>
              <TouchableOpacity onPress={cancelImage}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: tempImage }} style={styles.modalImage} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={setImage} style={styles.modalButtonPrimary}>
                <Icon name="check" size={20} color="#FFF" />
                <Text style={styles.modalButtonText}>{t('confirm')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelImage} style={styles.modalButtonSecondary}>
                <Icon name="close" size={20} color="#4A90E2" />
                <Text style={styles.modalButtonTextSecondary}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={
            datePickerField && profile[datePickerField] 
              ? (() => {
                  try {
                    // Parse YYYY/MM/DD format
                    if (profile[datePickerField].includes('/')) {
                      const [year, month, day] = profile[datePickerField].split('/');
                      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    }
                    // Fallback to parsing as string
                    const parsedDate = new Date(profile[datePickerField]);
                    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
                  } catch (error) {
                    console.log('Error parsing date for picker:', error);
                    return new Date();
                  }
                })()
              : new Date()
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FC",
  },
  headerGradient: {
    paddingHorizontal: 15,
    paddingVertical: 12, // Reduced from paddingTop with StatusBar.currentHeight
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40, // Fixed height for consistent header
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  profileImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B0E0E6',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4A90E2',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E1E66',
    marginTop: 8,
  },
  profileHint: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#E8F4F8',
    borderWidth: 1,
    borderColor: '#B0E0E6',
  },
  activeTab: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFF',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 10,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 6,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B0E0E6',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  inputMultiline: {
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  iconContainer: {
    padding: 6,
    marginLeft: 6,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#B0E0E6',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    height: 40,
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  datePickerPlaceholder: {
    color: '#999',
  },
  updateButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E66',
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonPrimary: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalButtonTextSecondary: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FC',
  },
  genderPickerContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F5F9FC',
  },
  genderOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  genderOptionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  genderOptionTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});

export default MyProfile;