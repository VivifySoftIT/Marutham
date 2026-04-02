import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../service/LanguageContext';

/**
 * LanguageSelector - A component for changing app language
 * Can be used in settings screens or as a standalone component
 */
const LanguageSelector = ({ 
  style, 
  showLabel = true, 
  compact = false,
  onLanguageChange 
}) => {
  const { language, changeLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = [
    { 
      code: 'en', 
      name: 'English', 
      nativeName: 'English',
      flag: '🇺🇸' 
    },
    { 
      code: 'ta', 
      name: 'Tamil', 
      nativeName: 'தமிழ்',
      flag: '🇮🇳' 
    },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = async (langCode) => {
    try {
      await changeLanguage(langCode);
      setShowLanguageModal(false);
      
      // Call callback if provided
      if (onLanguageChange) {
        onLanguageChange(langCode);
      }

      // Show success message
      const newLang = languages.find(lang => lang.code === langCode);
      Alert.alert(
        t('success'),
        `Language changed to ${newLang.nativeName}`,
        [{ text: t('ok') }]
      );
    } catch (error) {
      console.error('Error changing language:', error);
      Alert.alert(
        t('error'),
        t('errorMessage'),
        [{ text: t('ok') }]
      );
    }
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => setShowLanguageModal(true)}
        >
          <Text style={styles.flagText}>{currentLanguage?.flag}</Text>
          <Text style={styles.compactLanguageText}>
            {currentLanguage?.code.toUpperCase()}
          </Text>
          <Icon name="chevron-down" size={16} color="#C9A84C" />
        </TouchableOpacity>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('language')}</Text>
              
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.flagText}>{lang.flag}</Text>
                  <View style={styles.languageInfo}>
                    <Text style={styles.languageName}>{lang.name}</Text>
                    <Text style={styles.nativeLanguageName}>{lang.nativeName}</Text>
                  </View>
                  {language === lang.code && (
                    <Icon name="check" size={20} color="#C9A84C" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text style={styles.label}>{t('language')}</Text>
      )}
      
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowLanguageModal(true)}
      >
        <View style={styles.currentLanguage}>
          <Text style={styles.flagText}>{currentLanguage?.flag}</Text>
          <View style={styles.languageTextContainer}>
            <Text style={styles.languageName}>{currentLanguage?.name}</Text>
            <Text style={styles.nativeLanguageName}>{currentLanguage?.nativeName}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={20} color="#C9A84C" />
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('language')}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Icon name="close" size={24} color="#C9A84C" />
              </TouchableOpacity>
            </View>
            
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.selectedLanguageOption
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.flagText}>{lang.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  <Text style={styles.nativeLanguageName}>{lang.nativeName}</Text>
                </View>
                {language === lang.code && (
                  <Icon name="check" size={20} color="#C9A84C" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageTextContainer: {
    marginLeft: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nativeLanguageName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  flagText: {
    fontSize: 24,
  },
  
  // Compact styles
  compactContainer: {
    alignSelf: 'flex-start',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  compactLanguageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A84C',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C9A84C',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedLanguageOption: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#C9A84C',
  },
  languageInfo: {
    flex: 1,
    marginLeft: 12,
  },
});

export default LanguageSelector;
