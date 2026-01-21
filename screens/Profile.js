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
import axios from "axios";
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
    emergencyContact: "",
    contactAddress: "",
    permanentAddress: "",
    temporaryAddress: "",
    profileImage: null,
    branch: "", // Add branch field
    photoPath: "", // Add photoPath field
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
        const token = await AsyncStorage.getItem("jwt_token");
        if (!token) {
          console.error("Authentication token not found");
          return;
        }

        const savedImage = await AsyncStorage.getItem("profileImage");

        const response = await axios.get(`${API_BASE_URL}/api/Security/GetEmployeeInfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.statusCode === 200) {
          const data = response.data.result;
          setProfile({
            name: data.name || "",
            employeeNo: data.empNo?.toString() || "",
            designation: data.designationDesc || "",
            gender: data.gender || "",
            email: data.emailID || "",
            contactNumber: data.contactNumber || "",
            emergencyContact: data.emergencyNumber || "",
            contactAddress: data.contAddress || "",
            permanentAddress: data.permAddress || "",
            temporaryAddress: "",
            profileImage: savedImage, // Set the saved profile image
            branch: data.branchDesc || "", // Extract branchDesc from API response
            photoPath: data.photoPath || "", // Extract photoPath from API response
          });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleSave = (field) => {
    if ((field === "contactNumber" || field === "emergencyContact") && profile[field].length < 10) {
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
    if (profile.emergencyContact.length !== 10) {
      alert("Emergency contact number must be exactly 10 digits.");
      return;
    }
  
    try {
      const token = await AsyncStorage.getItem("jwt_token");
      if (!token) {
        alert("Authentication token not found");
        return;
      }
  
      const formData = new FormData();
      formData.append("name", profile.name);
      formData.append("empNo", profile.employeeNo);
      formData.append("designationDesc", profile.designation);
      formData.append("contactNumber", profile.contactNumber);
      formData.append("emergencyNumber", profile.emergencyContact);
      formData.append("contAddress", profile.contactAddress);
      formData.append("permAddress", profile.permanentAddress);
      formData.append("gender", profile.gender);
      formData.append("emailID", profile.email);
  
      // Include the profile image if it exists
      if (tempImage) {
        formData.append("PhotoFilePath", {
          uri: tempImage,
          name: "profile.jpg",
          type: "image/jpeg",
        });
      } else if (profile.profileImage) {
        formData.append("PhotoFilePath", {
          uri: profile.profileImage,
          name: "profile.jpg",
          type: "image/jpeg",
        });
      }
  
      console.log("Payload being sent:", formData);
  
      const response = await axios.post(`${API_BASE_URL}/api/Security/UpdateEmpInfo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
  
      if (response.data.statusCode === 200) {
        alert(response.data.statusDesc);
  
        // Fetch updated profile data to get the new photoPath
        const updatedResponse = await axios.get(`${API_BASE_URL}/api/Security/GetEmployeeInfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (updatedResponse.data.statusCode === 200) {
          const updatedData = updatedResponse.data.result;
          setProfile((prev) => ({
            ...prev,
            photoPath: updatedData.photoPath || "", // Update photoPath
          }));
        }
      } else {
        alert("Failed to update profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response) {
        console.error("Server response:", error.response.data);
      }
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
  
        // Call handleUpdate to send the updated profile image to the server
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
    const isReadOnly =
      activeTab === "professional" ||
      fieldName === "gender" ||
      fieldName === "contactAddress" ||
      fieldName === "permanentAddress" ||
      fieldName === "email"; // Disable editing for email field
  
    const isNumberField = fieldName === "contactNumber" || fieldName === "emergencyContact";
  
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.editLabel}>{label}</Text>
        <View style={styles.inputWithIcon}>
          <TextInput
            value={value}
            onChangeText={(text) => {
              if (isNumberField) {
                // Ensure only digits are entered and limit to 10 characters
                const sanitizedText = text.replace(/\D/g, ""); // Only numbers
                if (sanitizedText.length > 10) {
                  alert("Input cannot exceed 10 digits.");
                  return; // Prevent updating state with invalid input
                }
                setProfile((prev) => ({ ...prev, [fieldName]: sanitizedText }));
              } else {
                setProfile((prev) => ({ ...prev, [fieldName]: text }));
              }
            }}
            editable={!isReadOnly}
            multiline={isMultiline}
            keyboardType={isNumberField ? "numeric" : "default"}
            maxLength={isNumberField ? 10 : undefined} // Limit to 10 digits for number fields
            style={styles.input}
          />
          {!isReadOnly && (
            <TouchableOpacity
              onPress={() => (isEditing ? handleSave(fieldName) : setEditingField(fieldName))}
              style={styles.iconContainer}
            >
              <Icon
  name={isEditing ? "check" : "pencil"}
  size={20}
  color={isEditing ? "#28A745" : "#007BFF"} // Green for "check", Blue for "pencil"
/>
            </TouchableOpacity>
          )}
        </View>
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
            {renderEditableField("Emergency Number", "emergencyContact", profile.emergencyContact)}
            {renderEditableField("Contact Address", "contactAddress", profile.contactAddress, true)}
            {renderEditableField("Permanent Address", "permanentAddress", profile.permanentAddress, true)}
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
            {renderEditableField("Employee Code", "employeeNo", profile.employeeNo)}
            {renderEditableField("Designation", "designation", profile.designation)}
            {renderEditableField("Branch", "branch", profile.branch)}
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
    paddingVertical: 15,
    paddingTop: StatusBar.currentHeight || 10,
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
    paddingVertical: 20,
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4A90E2',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E1E66',
    marginTop: 15,
  },
  profileHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
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
  iconContainer: {
    padding: 8,
    marginLeft: 8,
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
