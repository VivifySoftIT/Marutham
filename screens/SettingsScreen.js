import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../service/LanguageContext';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { language, changeLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const handleLanguageChange = async (lang) => {
    setSelectedLanguage(lang);
    await changeLanguage(lang);
    Alert.alert(t('success'), `${lang === 'en' ? 'English' : 'Tamil'} ${t('language')} ${t('save')}d`);
  };

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#212c62" />
      
      {/* Header */}
      <LinearGradient colors={['#212c62', '#1a1f47']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Icon name="menu" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('settings')}</Text>
          <View style={{ width: 28 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          
          {/* English Option */}
          <TouchableOpacity
            style={[
              styles.languageOption,
              selectedLanguage === 'en' && styles.languageOptionSelected,
            ]}
            onPress={() => handleLanguageChange('en')}
          >
            <View style={styles.languageContent}>
              <Text style={styles.languageName}>{t('english')}</Text>
              <Text style={styles.languageDesc}>English</Text>
            </View>
            {selectedLanguage === 'en' && (
              <Icon name="check-circle" size={24} color="#4A90E2" />
            )}
          </TouchableOpacity>

          {/* Tamil Option */}
          <TouchableOpacity
            style={[
              styles.languageOption,
              selectedLanguage === 'ta' && styles.languageOptionSelected,
            ]}
            onPress={() => handleLanguageChange('ta')}
          >
            <View style={styles.languageContent}>
              <Text style={styles.languageName}>{t('tamil')}</Text>
              <Text style={styles.languageDesc}>தமிழ்</Text>
            </View>
            {selectedLanguage === 'ta' && (
              <Icon name="check-circle" size={24} color="#4A90E2" />
            )}
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Icon name="information" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            {selectedLanguage === 'en'
              ? 'The entire application will be translated to your selected language.'
              : 'முழு பயன்பாடும் உங்கள் தேர்ந்தெடுக்கப்பட்ட மொழিக்கு மொழிபெயர்க்கப்படும்.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 12,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  languageOptionSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F7FF',
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212c62',
    marginBottom: 4,
  },
  languageDesc: {
    fontSize: 14,
    color: '#999',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#E0F7FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#212c62',
    lineHeight: 20,
  },
});

export default SettingsScreen;
