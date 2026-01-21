import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export const pickImage = async () => {
  return new Promise(async (resolve) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need permission to access your photos.");
        return resolve(null);
      }

      Alert.alert("Choose Option", "Select image source", [
        {
          text: "Camera",
          onPress: async () => {
            const uri = await openCamera();
            resolve(uri); // ✅ resolves only after tick in camera
          },
        },
        {
          text: "Gallery",
          onPress: async () => {
            const uri = await openGallery();
            resolve(uri); // ✅ resolves only after tick in gallery
          },
        },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ]);
    } catch (err) {
      console.error(err);
      resolve(null);
    }
  });
};
const openGallery = async () => {
  let result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 1, // keep good quality
    // ❌ removed allowsEditing + aspect so no crop
  });

  return !result.canceled ? result.assets[0].uri : null;
};


const openCamera = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission Denied", "We need permission to access your camera.");
    return null;
  }

  let result = await ImagePicker.launchCameraAsync({
    quality: 1,
  });
  return !result.canceled ? result.assets[0].uri : null;
};
