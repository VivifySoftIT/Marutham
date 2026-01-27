import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import API_BASE_URL from "../apiConfig";
import useHardwareBack from '../service/useHardwareBack';

const MyProfile = () => {
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

        const response = await fetch(`${API_BASE_URL}/api/Members/GetMemberDetails/${memberId}`);
        
        if (!response.ok) {
          console.error('Failed to fetch member details');
          setLoading(false);
          return;
        }

        const memberData = await response.json();
        console.log('Member details loaded:', memberData);

        const savedImage = await AsyncStorage.getItem("profileImage");

        setProfile({
          name: memberData.name || "",
          employeeNo: memberData.memberId || memberData.id?.toString() || "",
          designation: memberData.business || "",
          gender: "",
          email: memberData.email || "",
          contactNumber: memberData.phone || "",
          contactAddress: memberData.address || "",
          profileImage: savedImage,
          status: memberData.status || "",
          joinDate: memberData.joinDate || "",
          dob: memberData.dob || "",
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
      alert("Phone number must be exactly 10 digits.");
      return;
    }
    setEditingField(null);
  };

  const handleUpdate = async () => {
    // Validate phone numbers before update
    if (profile.contactNumber.length !== 10) {
      alert("Contact number must be exactly 10 digits.");
      return;
    }

    try {
      const memberId = await getCurrentUserMemberId();
      if (!memberId) {
        alert("Member ID not found. Please try logging in again.");
        return;
      }

      // Helper function to format date to ISO string or null
      const formatDate = (dateString) => {
        if (!dateString || dateString.trim() === "") return null;
        
        try {
          // Try to parse the date
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return date.toISOString();
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
        alert("Profile updated successfully!");
        
        // Refresh profile data using GetMemberDetails
        const updatedResponse = await fetch(`${API_BASE_URL}/api/Members/GetMemberDetails/${memberId}`);
        if (updatedResponse.ok) {
          const memberData = await updatedResponse.json();
          const savedImage = await AsyncStorage.getItem("profileImage");
          
          // Helper to format date for display
          const formatDateForDisplay = (dateString) => {
            if (!dateString) return "";
            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return "";
              return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
            } catch (error) {
              return dateString;
            }
          };
          
          setProfile({
            name: memberData.name || "",
            employeeNo: memberData.memberId || memberData.id?.toString() || "",
            designation: memberData.business || "",
            gender: "",
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
          alert(`Failed to update profile: ${errorJson.title || 'Unknown error'}`);
        } catch (e) {
          alert("Failed to update profile. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("An error occurred while updating the profile.");
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access media library is required!");
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

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.editLabel}>{label}</Text>
        <View style={styles.inputWithIcon}>
          {isDateField && isEditing ? (
            <TextInput
              value={value}
              onChangeText={(text) => {
                setProfile((prev) => ({ ...prev, [fieldName]: text }));
              }}
              placeholder="YYYY-MM-DD or DD/MM/YYYY"
              placeholderTextColor="#999"
              style={[styles.input, isMultiline && styles.inputMultiline]}
            />
          ) : (
            <TextInput
              value={value}
              onChangeText={(text) => {
                if (isNumberField) {
                  const sanitizedText = text.replace(/\D/g, "");
                  if (sanitizedText.length > 10) {
                    alert("Input cannot exceed 10 digits.");
                    return;
                  }
                  setProfile((prev) => ({ ...prev, [fieldName]: sanitizedText }));
                } else {
                  setProfile((prev) => ({ ...prev, [fieldName]: text }));
                }
              }}
              editable={true}
              multiline={isMultiline}
              keyboardType={isNumberField ? "numeric" : "default"}
              maxLength={isNumberField ? 10 : undefined}
              placeholder={isDateField ? "Enter date (YYYY-MM-DD)" : ""}
              placeholderTextColor={isDateField ? "#999" : undefined}
              style={[styles.input, isMultiline && styles.inputMultiline]}
            />
          )}
          <TouchableOpacity
            onPress={() => (isEditing ? handleSave(fieldName) : setEditingField(fieldName))}
            style={styles.iconContainer}
          >
            <Icon
              name={isEditing ? "check" : "pencil"}
              size={20}
              color={isEditing ? "#28A745" : "#4A90E2"}
            />
          </TouchableOpacity>
        </View>
        {isDateField && !isEditing && value && (
          <Text style={styles.dateHint}>
            Format as YYYY-MM-DD when editing
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
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
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity onPress={() => navigation.navigate("ChangePassword")}>
              <Icon name="lock-outline" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={pickImage} onLongPress={handleLongPress}>
              {profile.profileImage || profile.photoPath ? (
                <Image
                  source={{ uri: profile.profileImage || profile.photoPath }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="account-circle" size={80} color="#4A90E2" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileHint}>Tap photo to change</Text>
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
                Personal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "professional" && styles.activeTab]}
              onPress={() => setActiveTab("professional")}
            >
              <Text style={[styles.tabText, activeTab === "professional" && styles.activeTabText]}>
                Professional
              </Text>
            </TouchableOpacity>
          </View>
       
          {activeTab === "personal" && (
            <View style={styles.formSection}>
              {renderEditableField("Name", "name", profile.name)}
              {renderEditableField("Gender", "gender", profile.gender)}
              {renderEditableField("Email", "email", profile.email)}
              {renderEditableField("Contact Number", "contactNumber", profile.contactNumber)}
              {renderEditableField("Date of Birth", "dob", profile.dob)}
              {renderEditableField("Address", "contactAddress", profile.contactAddress, true)}
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === "professional" && (
            <View style={styles.formSection}>
              {renderEditableField("Member ID", "employeeNo", profile.employeeNo)}
              {renderEditableField("Business", "designation", profile.designation)}
              {renderEditableField("Status", "status", profile.status)}
              {renderEditableField("Join Date", "joinDate", profile.joinDate)}
              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Profile Picture</Text>
              <TouchableOpacity onPress={cancelImage}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: tempImage }} style={styles.modalImage} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={setImage} style={styles.modalButtonPrimary}>
                <Icon name="check" size={20} color="#FFF" />
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelImage} style={styles.modalButtonSecondary}>
                <Icon name="close" size={20} color="#4A90E2" />
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 12,
    paddingTop: StatusBar.currentHeight || 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E66',
    marginTop: 10,
  },
  profileHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 25,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FFF',
  },
  formSection: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B0E0E6',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  iconContainer: {
    padding: 8,
    marginLeft: 8,
  },
  dateHint: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  updateButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 25,
    marginBottom: 10,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
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
});

export default MyProfile;