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
  ScrollView,
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

  const [businesses, setBusinesses] = useState([]);
  const [showAddBusinessModal, setShowAddBusinessModal] = useState(false);
  const [editingBusinessIndex, setEditingBusinessIndex] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState({
    name: '',
    description: '',
    images: []
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

        // Use profile image from API if available, otherwise fall back to AsyncStorage
        let profileImageUri = null;
        if (memberData.profileImage) {
          // If the API returns a relative path, construct the full URL
          profileImageUri = memberData.profileImage.startsWith('http') 
            ? memberData.profileImage 
            : `${API_BASE_URL}${memberData.profileImage}`;
          console.log('Profile image from API:', profileImageUri);
        } else {
          // Fallback to AsyncStorage
          profileImageUri = await AsyncStorage.getItem("profileImage");
          console.log('Profile image from storage:', profileImageUri);
        }
        
        // ✅ NEW: Load businesses from MemberBusinesses table (if available in response)
        if (memberData.businesses && Array.isArray(memberData.businesses)) {
          // New format: businesses from MemberBusinesses table
          const apiBusinesses = memberData.businesses.map(business => ({
            id: business.id, // Store the business ID for updates
            name: business.businessName,
            description: business.businessDescription || '',
            images: business.imagePaths ? business.imagePaths.map(img => 
              img.startsWith('http') ? img : `${API_BASE_URL}${img}`
            ) : []
          }));
          
          setBusinesses(apiBusinesses);
          await AsyncStorage.setItem('memberBusinesses', JSON.stringify(apiBusinesses));
          console.log('Businesses loaded from MemberBusinesses table:', apiBusinesses);
        } else if (memberData.business) {
          // Old format: fallback to comma-separated business field
          const businessNames = memberData.business.split(',').map(b => b.trim()).filter(b => b);
          
          const businessImages = memberData.businessImages 
            ? memberData.businessImages.split(',')
                .map(img => img.trim())
                .filter(img => img)
                .map(img => img.startsWith('http') ? img : `${API_BASE_URL}${img}`)
            : [];
          
          const businessDescriptions = memberData.businessDescription ? memberData.businessDescription.split('\n\n---\n\n').map(d => d.trim()).filter(d => d) : [];
          
          const apiBusinesses = businessNames.map((name, index) => ({
            name: name,
            description: businessDescriptions[index] || '',
            images: index === 0 ? businessImages : []
          }));
          
          setBusinesses(apiBusinesses);
          await AsyncStorage.setItem('memberBusinesses', JSON.stringify(apiBusinesses));
          console.log('Businesses loaded from old format:', apiBusinesses);
        } else {
          // Fallback to AsyncStorage
          const savedBusinesses = await AsyncStorage.getItem('memberBusinesses');
          if (savedBusinesses) {
            try {
              const parsedBusinesses = JSON.parse(savedBusinesses);
              setBusinesses(parsedBusinesses);
              console.log('Businesses loaded from storage:', parsedBusinesses);
            } catch (error) {
              console.error('Error parsing saved businesses:', error);
            }
          }
        }

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
          employeeNo: memberData.memberId || (memberData.id ? memberData.id.toString() : ""),
          designation: memberData.business || "",
          gender: memberData.gender || "",
          email: memberData.email || "",
          contactNumber: memberData.phone || "",
          contactAddress: memberData.address || "",
          profileImage: profileImageUri,
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
    if (field === "contactNumber" && profile[field] && profile[field].length < 10) {
      alert(t('phoneNumberMustBe10Digits'));
      return;
    }
    setEditingField(null);
  };

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

      // Create FormData for multipart/form-data submission
      const formData = new FormData();

      // Add basic fields
      if (profile.name) formData.append('Name', profile.name);
      if (profile.contactNumber) formData.append('Phone', profile.contactNumber);
      if (profile.email) formData.append('Email', profile.email);
      
      // Gender is required - default to 'Other' if not set
      formData.append('Gender', profile.gender || 'Other');
      
      const formattedDOB = formatDate(profile.dob);
      if (formattedDOB) formData.append('DOB', formattedDOB);
      
      const formattedJoinDate = formatDate(profile.joinDate);
      if (formattedJoinDate) formData.append('JoinDate', formattedJoinDate);
      
      // Address - send empty string if not set
      formData.append('Address', profile.contactAddress || '');
      
      // Status field - send empty string if not set (backend requires it)
      formData.append('Status', profile.status || '');
      
      // SubCompanyId
      if (profile.subCompanyId) formData.append('SubCompanyId', profile.subCompanyId.toString());

      // Handle profile image
      if (profile.profileImage && profile.profileImage.startsWith('file://')) {
        // New local image selected
        const filename = profile.profileImage.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('ProfileImage', {
          uri: profile.profileImage,
          name: filename || 'profile.jpg',
          type: type,
        });
      }

      // ✅ NEW: Handle businesses for MemberBusinesses table
      if (businesses && businesses.length > 0) {
        console.log("Processing businesses for FormData:", businesses.length);
        businesses.forEach((business, index) => {
          if (!business.name || !business.name.trim()) {
            console.log(`Skipping business at index ${index} - no name`);
            return;
          }

          console.log(`Adding business ${index}:`, {
            id: business.id,
            name: business.name,
            description: business.description,
            imageCount: business.images?.length || 0
          });

          // Business ID (if exists, for update)
          if (business.id) {
            formData.append(`Businesses[${index}].Id`, business.id.toString());
            console.log(`  - Added Businesses[${index}].Id = ${business.id}`);
          }

          // Business Name (required)
          formData.append(`Businesses[${index}].BusinessName`, business.name.trim());
          console.log(`  - Added Businesses[${index}].BusinessName = ${business.name.trim()}`);

          // Business Description (optional)
          if (business.description && business.description.trim()) {
            formData.append(`Businesses[${index}].BusinessDescription`, business.description.trim());
            console.log(`  - Added Businesses[${index}].BusinessDescription`);
          }

          // Existing Images (URLs to keep)
          if (business.images && business.images.length > 0) {
            const existingImages = business.images.filter(img => !img.startsWith('file://'));
            console.log(`  - Existing images: ${existingImages.length}`);
            existingImages.forEach((imgUrl, imgIndex) => {
              formData.append(`Businesses[${index}].ExistingImagePaths[${imgIndex}]`, imgUrl);
              console.log(`    - Added Businesses[${index}].ExistingImagePaths[${imgIndex}]`);
            });

            // New Images (local files to upload)
            const newImages = business.images.filter(img => img.startsWith('file://'));
            console.log(`  - New images to upload: ${newImages.length}`);
            newImages.forEach((imageUri, imgIndex) => {
              const filename = imageUri.split('/').pop() || `business_${index}_${imgIndex}.jpg`;
              const match = /\.(\w+)$/.exec(filename);
              const type = match ? `image/${match[1]}` : 'image/jpeg';
              
              formData.append(`Businesses[${index}].NewImages`, {
                uri: imageUri,
                name: filename,
                type: type,
              });
              console.log(`    - Added Businesses[${index}].NewImages (${filename})`);
            });
          }
        });
      } else {
        console.log("No businesses to send");
      }

      // ✅ WORKAROUND: Send empty values for ALL old format fields to satisfy backend validation
      // The backend DTO has [Required] attributes that should be removed, but until then, send empty values
      formData.append('Business', '');
      formData.append('BusinessDescription', '');
      // Note: BusinessImages and ProfileImage are IFormFile types, can't send empty string
      // They will be handled by the backend as null if not provided
      console.log("Added empty Business and BusinessDescription for backend validation");

      console.log("Updating member profile with FormData");
      console.log("Profile data being sent:", {
        name: profile.name,
        phone: profile.contactNumber,
        email: profile.email,
        gender: profile.gender || 'Other',
        address: profile.contactAddress || '',
        hasProfileImage: !!(profile.profileImage && profile.profileImage.startsWith('file://')),
        businessCount: businesses?.length || 0
      });
      
      // Debug: Log business data structure
      console.log("Businesses being sent:", JSON.stringify(businesses, null, 2));
      console.log("Businesses state length:", businesses?.length);
      console.log("Businesses state:", businesses);
      
      // Debug: Check if businesses have IDs
      if (businesses && businesses.length > 0) {
        businesses.forEach((b, i) => {
          console.log(`Business ${i} has ID:`, b.id, "Name:", b.name);
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}/edit`, {
        method: 'POST',
        // Don't set Content-Type header - let React Native set it automatically with boundary
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Profile updated successfully:', result);
        
        // ✅ IMMEDIATELY update businesses state with IDs from API response
        if (result.businesses && Array.isArray(result.businesses)) {
          const updatedBusinesses = result.businesses.map(b => ({
            id: b.id, // Store the ID returned from API
            name: b.businessName,
            description: b.businessDescription || '',
            images: b.imagePaths || []
          }));
          
          setBusinesses(updatedBusinesses);
          await AsyncStorage.setItem('memberBusinesses', JSON.stringify(updatedBusinesses));
          console.log('Businesses updated with IDs from API:', updatedBusinesses);
        }
        
        alert(t('profileUpdatedSuccessfully'));
        
        // Refresh profile data to ensure everything is in sync
        await refreshProfileData(memberId);
      } else {
        const errorText = await response.text();
        console.error('Update failed:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          alert(`${t('failedToUpdateProfile')}: ${errorJson.title || errorJson.message || t('unknownError')}`);
        } catch (e) {
          alert(t('failedToUpdateProfileTryAgain'));
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(t('errorOccurredUpdatingProfile'));
    }
  };

  const refreshProfileData = async (memberId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Members/${memberId}`);
      if (response.ok) {
        const memberData = await response.json();
        
        // Use profile image from API if available, otherwise fall back to AsyncStorage
        let profileImageUri = null;
        if (memberData.profileImage) {
          // If the API returns a relative path, construct the full URL
          profileImageUri = memberData.profileImage.startsWith('http') 
            ? memberData.profileImage 
            : `${API_BASE_URL}${memberData.profileImage}`;
          console.log('Profile image from API (refresh):', profileImageUri);
        } else {
          // Fallback to AsyncStorage
          profileImageUri = await AsyncStorage.getItem("profileImage");
          console.log('Profile image from storage (refresh):', profileImageUri);
        }
        
        const formatDateForDisplay = (dateString) => {
          if (!dateString) return "";
          try {
            let date;
            if (dateString.includes('T')) {
              const datePart = dateString.split('T')[0];
              const [year, month, day] = datePart.split('-');
              date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else if (dateString.includes('-')) {
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
          employeeNo: memberData.memberId || (memberData.id ? memberData.id.toString() : ""),
          designation: memberData.business || "",
          gender: memberData.gender || "",
          email: memberData.email || "",
          contactNumber: memberData.phone || "",
          contactAddress: memberData.address || "",
          profileImage: profileImageUri,
          status: memberData.status || "",
          joinDate: formatDateForDisplay(memberData.joinDate),
          dob: formatDateForDisplay(memberData.dob),
          subCompanyId: memberData.subCompanyId || null,
        });

        // Update businesses from API response
        // ✅ NEW: Load businesses from MemberBusinesses table (if available in response)
        if (memberData.businesses && Array.isArray(memberData.businesses)) {
          // New format: businesses from MemberBusinesses table
          const apiBusinesses = memberData.businesses.map(business => ({
            id: business.id, // Store the business ID for updates
            name: business.businessName,
            description: business.businessDescription || '',
            images: business.imagePaths ? business.imagePaths.map(img => 
              img.startsWith('http') ? img : `${API_BASE_URL}${img}`
            ) : []
          }));
          
          setBusinesses(apiBusinesses);
          await AsyncStorage.setItem('memberBusinesses', JSON.stringify(apiBusinesses));
          console.log('Businesses refreshed from MemberBusinesses table:', apiBusinesses);
        } else if (memberData.business) {
          // Old format: fallback to comma-separated business field
          const businessNames = memberData.business.split(',').map(b => b.trim()).filter(b => b);
          
          const businessImages = memberData.businessImages 
            ? memberData.businessImages.split(',')
                .map(img => img.trim())
                .filter(img => img)
                .map(img => img.startsWith('http') ? img : `${API_BASE_URL}${img}`)
            : [];
          
          const businessDescriptions = memberData.businessDescription ? memberData.businessDescription.split('\n\n---\n\n').map(d => d.trim()).filter(d => d) : [];
          
          const apiBusinesses = businessNames.map((name, index) => ({
            name: name,
            description: businessDescriptions[index] || '',
            images: index === 0 ? businessImages : []
          }));
          
          setBusinesses(apiBusinesses);
          await AsyncStorage.setItem('memberBusinesses', JSON.stringify(apiBusinesses));
          console.log('Businesses refreshed from old format:', apiBusinesses);
        }
      }
    } catch (error) {
      console.error("Error refreshing profile data:", error);
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
        ...(profile.profileImage ? [
          { 
            text: t('viewPhoto') || 'View Photo', 
            onPress: () => setFullScreenImage(profile.profileImage) 
          }
        ] : []),
        { text: t('changePhoto'), onPress: pickImage },
        ...(profile.profileImage ? [{ text: t('removePhoto'), style: "destructive", onPress: removeImage }] : [])
      ]
    );
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

  // Business Management Functions
  const addBusiness = () => {
    setCurrentBusiness({ name: '', description: '', images: [] });
    setEditingBusinessIndex(null);
    setShowAddBusinessModal(true);
  };

  const editBusiness = (index) => {
    setCurrentBusiness(businesses[index]);
    setEditingBusinessIndex(index);
    setShowAddBusinessModal(true);
  };

  const saveBusiness = async () => {
    if (!currentBusiness.name.trim()) {
      Alert.alert(t('error'), t('businessNameRequired') || 'Business name is required');
      return;
    }

    const updatedBusinesses = [...businesses];
    if (editingBusinessIndex !== null) {
      updatedBusinesses[editingBusinessIndex] = currentBusiness;
    } else {
      updatedBusinesses.push(currentBusiness);
    }

    setBusinesses(updatedBusinesses);
    await AsyncStorage.setItem('memberBusinesses', JSON.stringify(updatedBusinesses));
    setShowAddBusinessModal(false);
    setCurrentBusiness({ name: '', description: '', images: [] });
  };

  const deleteBusiness = async (index) => {
    const business = businesses[index];
    
    Alert.alert(
      t('deleteBusiness') || 'Delete Business',
      'Are you sure you want to delete this business?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // If business has an ID, call API to soft delete
              if (business.id) {
                const memberId = await getCurrentUserMemberId();
                if (!memberId) {
                  alert(t('memberIdNotFound'));
                  return;
                }

                console.log(`Deleting business ID ${business.id}`);
                console.log(`API URL: ${API_BASE_URL}/api/Members/business/${business.id}/delete`);
                
                const response = await fetch(`${API_BASE_URL}/api/Members/business/${business.id}/delete`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                });

                console.log('Delete response status:', response.status);
                
                if (response.ok) {
                  const result = await response.json();
                  console.log(`Business ID ${business.id} deleted successfully:`, result);
                } else {
                  const errorText = await response.text();
                  console.error('Delete failed with status:', response.status);
                  console.error('Delete failed error:', errorText);
                  alert(`${t('failedToDeleteBusiness') || 'Failed to delete business'}: ${errorText}`);
                  return;
                }
              }

              // Remove from local state
              const updatedBusinesses = businesses.filter((_, i) => i !== index);
              setBusinesses(updatedBusinesses);
              await AsyncStorage.setItem('memberBusinesses', JSON.stringify(updatedBusinesses));
              
              alert('Business deleted successfully');
            } catch (error) {
              console.error('Error deleting business:', error);
              alert(t('errorDeletingBusiness') || 'Error deleting business');
            }
          }
        }
      ]
    );
  };

  const pickBusinessImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('error'), t('permissionMediaLibraryRequired'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setCurrentBusiness(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
  };

  const removeBusinessImage = (imageIndex) => {
    setCurrentBusiness(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== imageIndex)
    }));
  };

  const handleLongPress = () => {
    if (profile.profileImage) {
      setFullScreenImage(profile.profileImage);
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
                    color={profile.gender === option.key ? "#C9A84C" : "#999"} 
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
            <Icon name="calendar" size={20} color="#C9A84C" />
          </TouchableOpacity>
        </View>
      );
    }

    // For all other fields, show translated display value
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.editLabel}>{label}</Text>
        <View style={[
          styles.inputWithIcon,
          isMultiline && styles.inputWithIconMultiline
        ]}>
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
            numberOfLines={isMultiline ? 4 : 1}
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
            style={[styles.iconContainer, isMultiline && styles.iconContainerMultiline]}
            disabled={isStatusField}
          >
            <Icon
              name={isStatusField ? "lock" : (isEditing ? "check" : "pencil")}
              size={20}
              color={isStatusField ? "#999" : (isEditing ? "#28A745" : "#C9A84C")}
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
        <StatusBar backgroundColor="#1B5E35" barStyle="light-content" />
        
        <LinearGradient
          colors={['#1B5E35', '#2E7D4F']}
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
              {profile.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="account-circle" size={60} color="#C9A84C" />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Icon name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileHint}>
              {profile.profileImage 
                ? (t('tapForOptions') || 'Tap for options • Long press to view') 
                : (t('tapToAddPhoto') || 'Tap to add photo')}
            </Text>
          </View>

          <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
            <View style={styles.fullScreenContainer}>
              <View style={styles.imageViewerHeader}>
                <Text style={styles.imageViewerTitle}>{t('profilePhoto') || 'Profile Photo'}</Text>
                <View style={styles.imageViewerActions}>
                  <TouchableOpacity 
                    onPress={() => setFullScreenImage(null)} 
                    style={styles.minimizeButton}
                  >
                    <Icon name="window-minimize" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setFullScreenImage(null)} 
                    style={styles.closeButtonHeader}
                  >
                    <Icon name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.imageViewerContent}>
                <Image 
                  source={{ uri: fullScreenImage }} 
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
              <TouchableOpacity 
                onPress={() => setFullScreenImage(null)} 
                style={styles.imageViewerFooter}
              >
                <Icon name="chevron-down" size={28} color="#FFF" />
                <Text style={styles.imageViewerFooterText}>{t('swipeDownToClose') || 'Tap to close'}</Text>
              </TouchableOpacity>
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
            <ScrollView 
              style={styles.formSection} 
              contentContainerStyle={styles.formSectionContent}
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
          )}

          {activeTab === "professional" && (
            <ScrollView 
              style={styles.formSection} 
              contentContainerStyle={styles.formSectionContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Business field removed - all businesses shown in MyBusinesses section */}
              {/* {renderEditableField(t('business'), "designation", profile.designation)} */}
              {renderEditableField(t('status'), "status", profile.status)}
              {renderEditableField(t('joinDate'), "joinDate", profile.joinDate)}
              
              {/* My Businesses Section */}
              <View style={styles.businessesSection}>
                <View style={styles.businessesHeader}>
                  <Text style={styles.businessesSectionTitle}>{t('MyBusinesses') || 'My Businesses'}</Text>
                  <TouchableOpacity style={styles.addBusinessButton} onPress={addBusiness}>
                    <Icon name="plus-circle" size={24} color="#C9A84C" />
                  </TouchableOpacity>
                </View>

                {businesses.length === 0 ? (
                  <View style={styles.emptyBusinessState}>
                    <Icon name="briefcase-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyBusinessText}>{t('noBusinessesAdded') || 'No businesses added yet'}</Text>
                    <Text style={styles.emptyBusinessHint}>{t('tapPlusToAdd') || 'Tap + to add your business'}</Text>
                  </View>
                ) : (
                  businesses.map((business, index) => (
                    <View key={`business-${index}-${business.name}`} style={styles.businessCard}>
                      <View style={styles.businessCardHeader}>
                        <Text style={styles.businessName}>{business.name}</Text>
                        <View style={styles.businessActions}>
                          <TouchableOpacity onPress={() => editBusiness(index)} style={styles.businessActionButton}>
                            <Icon name="pencil" size={20} color="#C9A84C" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteBusiness(index)} style={styles.businessActionButton}>
                            <Icon name="delete" size={20} color="#F44336" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      {business.description ? (
                        <Text style={styles.businessDescription}>{business.description}</Text>
                      ) : null}
                      {business.images && business.images.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.businessImagesScroll}>
                          {business.images.map((image, imgIndex) => (
                            <TouchableOpacity 
                              key={`business-${index}-image-${imgIndex}-${image.substring(Math.max(0, image.length - 15))}`} 
                              onPress={() => setFullScreenImage(image)}
                            >
                              <Image source={{ uri: image }} style={styles.businessImage} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity 
                style={styles.updateButton} 
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>{t('saveChanges')}</Text>
              </TouchableOpacity>
            </ScrollView>
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
                <Icon name="close" size={20} color="#C9A84C" />
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
        />
      )}

      {/* Add/Edit Business Modal */}
      <Modal visible={showAddBusinessModal} transparent={true} animationType="fade">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalContainer}
        >
          <View style={styles.businessModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBusinessIndex !== null ? (t('editBusiness') || 'Edit Business') : (t('addBusiness') || 'Add Business')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddBusinessModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.businessModalScroll} 
              contentContainerStyle={styles.businessModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.businessFormField}>
                <Text style={styles.businessFormLabel}>
                  {t('BusinessName') || 'Business Name'} *
                </Text>
                <TextInput
                  style={styles.businessFormInput}
                  placeholder={t('enterBusinessName') || 'Enter business name'}
                  value={currentBusiness.name}
                  onChangeText={(text) => setCurrentBusiness(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.businessFormField}>
                <Text style={styles.businessFormLabel}>
                  {t('description') || 'Description'}
                </Text>
                <TextInput
                  style={[styles.businessFormInput, styles.businessFormTextArea]}
                  placeholder={t('enterBusinessDescription') || 'Enter business description'}
                  value={currentBusiness.description}
                  onChangeText={(text) => setCurrentBusiness(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.businessFormField}>
                <View style={styles.businessImagesHeader}>
                  <Text style={styles.businessFormLabel}>
                    {t('productsServices') || 'Products/Services Images'}
                  </Text>
                  <TouchableOpacity
                    style={styles.addImagesButton}
                    onPress={pickBusinessImage}
                  >
                    <Icon name="camera-plus" size={18} color="#C9A84C" />
                    <Text style={styles.addImagesButtonText}>
                      {t('addImages') || 'Add Images'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {currentBusiness.images && currentBusiness.images.length > 0 && (
                  <View style={styles.businessImagesGrid}>
                    {currentBusiness.images.map((image, index) => (
                      <View key={`modal-image-${Date.now()}-${index}-${image.substring(Math.max(0, image.length - 15))}`} style={styles.businessImageWrapper}>
                        <Image source={{ uri: image }} style={styles.businessImagePreview} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeBusinessImage(index)}
                        >
                          <Icon name="close-circle" size={24} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={saveBusiness} style={styles.modalButtonPrimary}>
                <Icon name="check" size={20} color="#FFF" />
                <Text style={styles.modalButtonText}>{t('save') || 'Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowAddBusinessModal(false)} style={styles.modalButtonSecondary}>
                <Icon name="close" size={20} color="#C9A84C" />
                <Text style={styles.modalButtonTextSecondary}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
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
    borderColor: '#C9A84C',
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
    backgroundColor: '#C9A84C',
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
    backgroundColor: '#C9A84C',
    borderColor: '#C9A84C',
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
  formSectionContent: {
    paddingBottom: 20,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  editLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C9A84C',
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
  inputWithIconMultiline: {
    minHeight: 80,
    maxHeight: 120,
    alignItems: 'flex-start',
    height: 'auto',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 10,
    paddingBottom: 10,
  },
  iconContainer: {
    padding: 6,
    marginLeft: 6,
  },
  iconContainerMultiline: {
    alignSelf: 'flex-start',
    marginTop: 8,
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
    backgroundColor: '#C9A84C',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
    shadowColor: '#C9A84C',
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
  // Business Section Styles
  businessesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  businessesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessesSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C9A84C', // Changed to blue
  },
  addBusinessButton: {
    padding: 4,
  },
  emptyBusinessState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  emptyBusinessText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyBusinessHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  businessCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1, // Same as input fields
    borderColor: '#B0E0E6', // Same light blue as input fields
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  businessCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  businessActions: {
    flexDirection: 'row',
    gap: 8,
  },
  businessActionButton: {
    padding: 8,
  },
  businessDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  businessImagesScroll: {
    marginTop: 8,
  },
  businessImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
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
    backgroundColor: '#C9A84C',
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
    borderColor: '#C9A84C',
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
    color: '#C9A84C',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  imageViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  imageViewerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  minimizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  imageViewerFooter: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerFooterText: {
    color: '#FFF',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.8,
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
    color: '#C9A84C',
    fontWeight: '600',
  },
  // Business Modal Styles
  businessModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    padding: 20,
  },
  businessModalScroll: {
    maxHeight: '70%',
  },
  businessModalScrollContent: {
    paddingBottom: 10,
  },
  businessFormField: {
    marginBottom: 20,
  },
  businessFormLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  businessFormInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  businessFormTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  businessImagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addImagesButtonText: {
    marginLeft: 6,
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },
  businessImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  businessImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  businessImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default MyProfile;

