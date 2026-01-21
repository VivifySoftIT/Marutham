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
} from "react-native";
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        <View style={styles.header}>
         <TouchableOpacity onPress={pickImage} onLongPress={handleLongPress}>
  {profile.profileImage || profile.photoPath ? (
    <Image
      source={{ uri: profile.profileImage || profile.photoPath }}
      style={styles.profileImage}
    />
  ) : (
    <Icon name="account-circle" size={90} color="rgb(140, 140, 167)" />
  )}
</TouchableOpacity>

          <View style={styles.nameContainer}>
            <Text style={styles.nameLabel}>{profile.name}</Text>
          </View>
          <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
          <View style={styles.fullScreenContainer}>
            <TouchableOpacity onPress={() => setFullScreenImage(null)} style={styles.closeButton}>
              <Icon name="close" size={30} color="black" />
            </TouchableOpacity>
            <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} />
          </View>
        </Modal>
          <TouchableOpacity
            style={styles.changePasswordIcon}
            onPress={() => navigation.navigate("ChangePassword")}
          >
            <Icon name="lock-outline" size={30} color="rgb(140, 140, 167)" />
          </TouchableOpacity>
        </View>

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
          <ScrollView 
            contentContainerStyle={styles.scrollContainer} 
            showsVerticalScrollIndicator={true} 
            style={styles.scrollView}
          >
            <View style={styles.form}>
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
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {activeTab === "professional" && (
          <View style={styles.form}>
            <View style={styles.professionalContainer}>
              {renderEditableField("Employee Code", "employeeNo", profile.employeeNo)}
              {renderEditableField("Designation", "designation", profile.designation)}
              {renderEditableField("Branch", "branch", profile.branch)} 
            </View>
          </View>
        )}
      </View>

      <Modal visible={showModal} transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Image source={{ uri: tempImage }} style={styles.modalImage} />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={setImage} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Set as Profile Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelImage} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Cancel</Text>
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
    flexGrow: 1,
    padding:8,
    backgroundColor: "#FFFFFF",
  },
 
  header: {
    alignItems: "center",
    marginBottom: 10,
    marginTop:-8,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 60,
    marginTop: 20,
  },
  nameLabel: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2d3a4a",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 6,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginHorizontal: 10,
    borderRadius: 25,
    backgroundColor: "#f0f4f8",
  },
  professionalContainer: {
    backgroundColor: "#f0f4f8",  // Same background color as Personal
    borderRadius: 15,
    padding: 6,
    borderWidth: 1,
    marginLeft:-5,
    marginBottom:-7,
    marginRight:-5,
    marginTop:-7,
    borderColor: "rgb(30, 30, 102)",  // Same border color as Personal
  },
  scrollView: {
    flex: 1,  // Ensures that ScrollView expands to take up remaining space
    borderWidth:1,
    borderColor: "rgb(30, 30, 102)",
    borderRadius:15,
  },
 
  scrollContainer: {
    flex: 0,
   
  
    marginTop: 0,
   borderRadius:2,
    marginBottom: 50,
  
   
  },
  activeTab: {
    backgroundColor: "rgb(30, 30, 102)",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 7,
   
   
    backgroundColor: "#f0f4f8",
  },
  fieldContainer: {
    marginBottom: 15,
    maxHeight: 200,
  },
  editLabel: {
    fontSize: 16,
    color: "rgb(30, 30, 102)",
    marginBottom:0,
    marginTop:-5,
    fontWeight: "500",
    padding:2
  },
  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dce0e4",
    borderRadius: 8,
    paddingHorizontal: 5,
    backgroundColor: "#FFFFFF",
 
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  confirmationModal: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    margin: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  updateButton: {
    backgroundColor: "rgb(30, 30, 102)",
    padding: 13,
    borderRadius: 8,
    marginTop: 0,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },
  closeButton: {
    position: "absolute",
    top: 160,
    right: 20,
    zIndex: 1,
  },
  
});

export default MyProfile;
