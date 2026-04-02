import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const Visitors = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('chapter');
  const [formData, setFormData] = useState({
    // Chapter Details
    country: '',
    region: '',
    chapter: '',
    // Personal Details
    title: '',
    firstName: '',
    lastName: '',
    company: '',
    // Language Details
    language: '',
    // Contact Details
    telephone: '',
    visitorEmail: '',
    mobileNumber: '',
    // Address Details
    county: '',
    address: '',
    city: '',
    state: '',
    postCode: '',
    confirmed: false,
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chapter':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Country *</Text>
              <View style={styles.inputContainer}>
                <Icon name="globe" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter country"
                  value={formData.country}
                  onChangeText={(text) => handleInputChange('country', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Region *</Text>
              <View style={styles.inputContainer}>
                <Icon name="map" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter region"
                  value={formData.region}
                  onChangeText={(text) => handleInputChange('region', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Chapter *</Text>
              <View style={styles.inputContainer}>
                <Icon name="book" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter chapter"
                  value={formData.chapter}
                  onChangeText={(text) => handleInputChange('chapter', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'personal':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Title *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mr, Mrs, Ms, Dr"
                  value={formData.title}
                  onChangeText={(text) => handleInputChange('title', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>First Name *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChangeText={(text) => handleInputChange('firstName', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Last Name *</Text>
              <View style={styles.inputContainer}>
                <Icon name="account" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChangeText={(text) => handleInputChange('lastName', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Company *</Text>
              <View style={styles.inputContainer}>
                <Icon name="briefcase" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter company name"
                  value={formData.company}
                  onChangeText={(text) => handleInputChange('company', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'language':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Language</Text>
              <View style={styles.inputContainer}>
                <Icon name="translate" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter language"
                  value={formData.language}
                  onChangeText={(text) => handleInputChange('language', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'contact':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>Telephone</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter telephone"
                  value={formData.telephone}
                  onChangeText={(text) => handleInputChange('telephone', text)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Visitor Email</Text>
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter visitor email"
                  value={formData.visitorEmail}
                  onChangeText={(text) => handleInputChange('visitorEmail', text)}
                  keyboardType="email-address"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.inputContainer}>
                <Icon name="phone-mobile" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  value={formData.mobileNumber}
                  onChangeText={(text) => handleInputChange('mobileNumber', text)}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        );

      case 'address':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.label}>County</Text>
              <View style={styles.inputContainer}>
                <Icon name="map-marker" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter county"
                  value={formData.county}
                  onChangeText={(text) => handleInputChange('county', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Address</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter address"
                  value={formData.address}
                  onChangeText={(text) => handleInputChange('address', text)}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>City</Text>
              <View style={styles.inputContainer}>
                <Icon name="city" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter city"
                  value={formData.city}
                  onChangeText={(text) => handleInputChange('city', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>State</Text>
              <View style={styles.inputContainer}>
                <Icon name="map" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  value={formData.state}
                  onChangeText={(text) => handleInputChange('state', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Post Code</Text>
              <View style={styles.inputContainer}>
                <Icon name="mailbox" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter post code"
                  value={formData.postCode}
                  onChangeText={(text) => handleInputChange('postCode', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => handleInputChange('confirmed', !formData.confirmed)}
            >
              <View style={[styles.checkbox, formData.confirmed && styles.checkboxActive]}>
                {formData.confirmed && <Icon name="check" size={16} color="#FFF" />}
              </View>
              <Text style={styles.confirmText}>Confirm Details</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My CEUs</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {[
          { id: 'chapter', label: 'Chapter Details', icon: 'book' },
          { id: 'personal', label: 'Personal Details', icon: 'account' },
          { id: 'language', label: 'Language', icon: 'translate' },
          { id: 'contact', label: 'Contact Details', icon: 'phone' },
          { id: 'address', label: 'Address Details', icon: 'map-marker' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Icon
              name={tab.icon}
              size={18}
              color={activeTab === tab.id ? '#FFF' : '#4A90E2'}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ImageBackground
        source={require('../assets/logomarutham.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderTabContent()}
          <View style={{ height: 30 }} />
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default Visitors;

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
  },
  tabBar: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  tabLabelActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.1,
  },
  tabContent: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    minHeight: 42,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#87CEEB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  confirmText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
