import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../service/api';
import { useLanguage } from '../service/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';

const Messages = ({ navigation }) => {
  const { t, currentLanguage } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showMemberSelectionModal, setShowMemberSelectionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [totalMessagesCount, setTotalMessagesCount] = useState(0);
  const [adminMemberId, setAdminMemberId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const [formData, setFormData] = useState({
    toEmail: '',
    toMemberName: '',
    toMemberId: '',
    subject: '',
    content: '',
    recipientType: 'all',
    messageType: 'Welcome',
    paymentMonth: new Date().getMonth() + 1, // Current month (1-12)
    paymentYear: new Date().getFullYear(),
    eventDate: '', // For Event and Meeting types
  });

  // Load members and messages from API when component mounts
  useEffect(() => {
    getCurrentUserMemberId();
    loadMembers();
    loadMessagesCount();
  }, []);

  // Robust function to get current user's member ID (3-tier lookup)
  const getCurrentUserMemberId = async () => {
    try {
      // First check if memberId is already in AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('Messages - Member ID found in storage:', storedMemberId);
        setAdminMemberId(parseInt(storedMemberId));
        return parseInt(storedMemberId);
      }

      console.log('Messages - Member ID not in storage, attempting to look up...');

      // If not, try to get it from user ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');

      if (userId) {
        try {
          // Try to get member by user ID
          console.log('Messages - Trying GetByUserId with userId:', userId);
          const memberData = await ApiService.getMemberByUserId(userId);
          if (memberData && memberData.id) {
            await AsyncStorage.setItem('memberId', memberData.id.toString());
            console.log('Messages - Member found via GetByUserId:', memberData.id);
            setAdminMemberId(memberData.id);
            return memberData.id;
          }
        } catch (error) {
          console.log('Messages - GetByUserId failed, trying name search:', error);
        }
      }

      // Fallback: search by name
      if (fullName) {
        try {
          console.log('Messages - Searching members by name:', fullName);
          const members = await ApiService.getMembers();
          const member = members.find(m => m.name && m.name.trim().toLowerCase() === fullName.trim().toLowerCase());
          if (member) {
            await AsyncStorage.setItem('memberId', member.id.toString());
            console.log('Messages - Member found by name:', member.id);
            setAdminMemberId(member.id);
            return member.id;
          }
        } catch (error) {
          console.log('Messages - Name search failed:', error);
        }
      }

      console.log('Messages - Could not find member ID');
      return null;
    } catch (error) {
      console.error('Messages - Error getting member ID:', error);
      return null;
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      console.log('Messages - Loading members...');
      const members = await ApiService.getMembers();
      console.log('Messages - Raw members response:', members);
      console.log('Messages - First member sample:', members?.[0]);
      
      // Filter active members - handle different possible field names
      const activeMembers = (members || []).filter(m => {
        // Check various possible active status fields
        const isActive = m.isActive !== false && m.status !== 'Inactive' && m.status !== 'Deleted';
        return isActive && m.name; // Also ensure member has a name
      });
      
      console.log('Messages - Active members count:', activeMembers.length);
      console.log('Messages - Active members sample:', activeMembers.slice(0, 3));
      setAllMembers(activeMembers);
      console.log('Messages - Members loaded successfully');
    } catch (error) {
      console.error('Messages - Error loading members:', error);
      Alert.alert(t('error'), t('failedToLoadMembersList') || 'Failed to load members list');
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMessagesCount = async () => {
    try {
      const messages = await ApiService.getMessageNotifications();
      setTotalMessagesCount(messages?.length || 0);
      console.log('Messages count loaded:', messages?.length || 0);
    } catch (error) {
      console.error('Error loading messages count:', error);
    }
  };

  // Message templates - using useMemo to make it reactive to language changes
  const messageTemplates = React.useMemo(() => [
    {
      id: 1,
      title: t('birthdayWish') || 'Birthday Wish',
      icon: 'cake-variant',
      color: '#E91E63',
      description: t('sendBirthdayWishesToMembers') || 'Send birthday wishes to members',
      defaultSubject: t('happyBirthday') || 'Happy Birthday! 🎉',
      defaultContent: t('birthdayWishContent') || 'Dear Member,\n\nWishing you a wonderful birthday filled with joy and success!\n\nMay this year bring you great opportunities and prosperity.\n\nHappy Birthday!\nAlaigal Team',
      messageType: 'Birthday'
    },
    {
      id: 2,
      title: t('paymentReminder'),
      icon: 'cash-clock',
      color: '#FF9800',
      description: t('sendPaymentReminderDesc') || 'Send payment reminder (validates payment status)',
      defaultSubject: t('paymentReminderSubject') || 'Payment Reminder - Alaigal Membership',
      defaultContent: t('paymentReminderContent') || 'Dear Member,\n\nThis is a friendly reminder that your membership payment is due.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nAlaigal Team',
      messageType: 'Payment'
    },
    {
      id: 3,
      title: t('eventNotification') || 'Event Notification',
      icon: 'calendar-star',
      color: '#2196F3',
      description: t('notifyMembersAboutEvents') || 'Notify members about upcoming events',
      defaultSubject: t('upcomingEventSubject') || 'Upcoming Event - Alaigal Networking',
      defaultContent: t('eventNotificationContent') || 'Dear Member,\n\nWe are excited to invite you to our upcoming networking event!\n\nEvent Details:\nDate: [Date]\nTime: [Time]\nLocation: [Location]\n\nLooking forward to seeing you there!\n\nAlaigal Team',
      messageType: 'Event'
    },
    {
      id: 4,
      title: t('meetingNotification'),
      icon: 'account-group',
      color: '#00BCD4',
      description: t('notifyMembersAboutMeetings') || 'Notify members about meetings',
      defaultSubject: t('meetingNotificationSubject') || 'Meeting Notification - Alaigal',
      defaultContent: t('meetingNotificationContent') || 'Dear Member,\n\nYou are invited to attend our upcoming meeting.\n\nMeeting Details:\nDate: [Date]\nTime: [Time]\nLocation: [Location]\n\nPlease confirm your attendance.\n\nAlaigal Team',
      messageType: 'Meeting'
    },
    {
      id: 5,
      title: t('welcomeMessage'),
      icon: 'hand-wave',
      color: '#4CAF50',
      description: t('welcomeNewMembers') || 'Welcome new members',
      defaultSubject: t('welcomeToAlaigal'),
      defaultContent: t('welcomeMessageContent') || 'Dear Member,\n\nWelcome to Alaigal! We are excited to have you as part of our community.\n\nFeel free to connect with other members and grow your business together.\n\nBest regards,\nAlaigal Team',
      messageType: 'Welcome'
    },
  ], [t]); // Re-compute when translation function changes

  // Function to get translated message type
  const getTranslatedMessageType = (messageType) => {
    return t(messageType) || messageType;
  };

  const toggleMemberSelection = (member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(m => m.id === member.id);
      if (isSelected) {
        return prev.filter(m => m.id !== member.id);
      } else {
        return [...prev, member];
      }
    });
  };

  const selectAllMembers = () => {
    const filteredMembers = getFilteredMembers();
    const allFilteredSelected = filteredMembers.every(member => 
      selectedMembers.some(selected => selected.id === member.id)
    );
    
    if (allFilteredSelected && filteredMembers.length > 0) {
      // Deselect all filtered members
      setSelectedMembers(prev => 
        prev.filter(selected => 
          !filteredMembers.some(filtered => filtered.id === selected.id)
        )
      );
    } else {
      // Select all filtered members (add only new ones)
      setSelectedMembers(prev => {
        const newMembers = filteredMembers.filter(filtered => 
          !prev.some(selected => selected.id === filtered.id)
        );
        return [...prev, ...newMembers];
      });
    }
  };

  // Filter members based on search query
  const getFilteredMembers = () => {
    if (!memberSearchQuery.trim()) {
      return allMembers;
    }
    
    const query = memberSearchQuery.toLowerCase().trim();
    return allMembers.filter(member => 
      member.name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.phone?.toLowerCase().includes(query)
    );
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    setFormData({
      toEmail: '',
      toMemberName: '',
      toMemberId: '',
      subject: template.defaultSubject,
      content: template.defaultContent,
      recipientType: 'all',
      messageType: template.messageType,
      paymentMonth: currentMonth,
      paymentYear: currentYear,
      eventDate: '', // Reset event date
    });
    setSelectedMembers([]);
    setShowTemplateModal(false);
    setShowComposeModal(true);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      toMemberId: member.id,
      toMemberName: member.name,
      toEmail: member.email,
    }));
    setShowMemberDropdown(false);
  };

  const handlePickAttachment = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setAttachment(result);
      Alert.alert(t('success'), `${t('fileAttached')}: ${result.name}`);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled file picker');
      } else {
        Alert.alert(t('error'), t('failedToPickFile'));
      }
    }
  };

  const validateForm = () => {
    if (!selectedTemplate) {
      Alert.alert(t('error'), t('pleaseSelectTemplate') || 'Please select a template');
      return false;
    }
    if (formData.recipientType === 'member' && selectedMembers.length === 0) {
      Alert.alert(t('error'), t('pleaseSelectAtLeastOneMember') || 'Please select at least one member');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert(t('error'), t('pleaseEnterSubject') || 'Please enter subject');
      return false;
    }
    if (!formData.content.trim()) {
      Alert.alert(t('error'), t('pleaseEnterMessageContent') || 'Please enter message content');
      return false;
    }
    if (!adminMemberId) {
      Alert.alert(t('error'), t('adminMemberIdNotFound') || 'Admin member ID not found. Please try again.');
      return false;
    }
    return true;
  };

  const handleSendMessage = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get fresh admin member ID
      const currentAdminMemberId = await getCurrentUserMemberId();
      if (!currentAdminMemberId) {
        Alert.alert(t('error'), t('adminMemberIdNotFoundLoginAgain') || 'Admin member ID not found. Please login again.');
        setLoading(false);
        return;
      }

      // Format member IDs as comma-separated string
      let memberIds = null;
      if (formData.recipientType === 'member' && selectedMembers.length > 0) {
        memberIds = selectedMembers.map(m => m.id).join(',');
      }

      // Prepare notification data
      const notificationData = {
        MessageType: formData.messageType,
        MemberIds: memberIds,
        Subject: formData.subject.trim(),
        Content: formData.content.trim(),
        AttachmentUrl: attachment?.uri || null,
        CreatedBy: currentAdminMemberId,
      };

      // Add date field for Event and Meeting types
      if ((formData.messageType === 'Event' || formData.messageType === 'Meeting') && formData.eventDate) {
        notificationData.Date = formData.eventDate;
      }

      // Add payment-specific fields if Payment type
      if (formData.messageType === 'Payment') {
        const monthNames = [t('january'), t('february'), t('march'), t('april'), t('may'), t('june'), 
                           t('july'), t('august'), t('september'), t('october'), t('november'), t('december')];
        notificationData.PaymentForMonth = `${monthNames[formData.paymentMonth - 1]} ${formData.paymentYear}`;
        notificationData.PaymentDate = new Date().toISOString();
      }

      console.log('Sending message notification:', notificationData);

      // Call API to create message notification
      const response = await ApiService.createMessageNotification(notificationData);

      console.log('Message sent successfully:', response);

      Alert.alert(
        t('success'),
        `${t('messageSentSuccessfully')}!${formData.recipientType === 'all' ? ` (${t('allMembers')})` : ` (${selectedMembers.length} ${t('member')}${selectedMembers.length > 1 ? 's' : ''})`}`,
        [
          {
            text: t('ok'),
            onPress: () => {
              setShowComposeModal(false);
              setSelectedTemplate(null);
              const currentMonth = new Date().getMonth() + 1;
              const currentYear = new Date().getFullYear();
              setFormData({ 
                toEmail: '', 
                toMemberName: '',
                toMemberId: '',
                subject: '', 
                content: '', 
                recipientType: 'all',
                messageType: 'Welcome',
                paymentMonth: currentMonth,
                paymentYear: currentYear,
                eventDate: '', // Reset event date
              });
              setSelectedMembers([]);
              setAttachment(null);
              loadMessagesCount(); // Reload messages count
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = t('failedToSendMessage') || 'Failed to send message';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t('error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderTemplateCard = ({ item }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleSelectTemplate(item)}
    >
      <LinearGradient
        colors={[item.color + '20', item.color + '10']}
        style={styles.templateGradient}
      >
        <View style={[styles.templateIcon, { backgroundColor: item.color }]}>
          <Icon name={item.icon} size={28} color="#FFF" />
        </View>
        <Text style={[
          styles.templateTitle,
          currentLanguage === 'ta' && styles.templateTitleTamil
        ]}>{item.title}</Text>
        <Text style={[
          styles.templateDescription,
          currentLanguage === 'ta' && styles.templateDescriptionTamil
        ]}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderComposeModal = () => {
    if (!selectedTemplate) return null;

    const getRecipientInfo = () => {
      if (formData.recipientType === 'all') {
        return t('allActiveMembers') || 'All active members';
      }
      return `${selectedMembers.length} ${t('selectedMember')}${selectedMembers.length !== 1 ? 's' : ''}`;
    };

    return (
      <Modal
        visible={showComposeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowComposeModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowComposeModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('composeMessage')}</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Template Info */}
            <View style={styles.templateInfoCard}>
              <View style={[styles.templateIcon, { backgroundColor: selectedTemplate.color }]}>
                <Icon name={selectedTemplate.icon} size={24} color="#FFF" />
              </View>
              <View style={styles.templateInfoText}>
                <Text style={styles.templateInfoTitle}>{selectedTemplate.title}</Text>
                <Text style={styles.templateInfoSubtitle}>
                  {t('type')}: {getTranslatedMessageType(formData.messageType)}
                </Text>
              </View>
            </View>

            {/* Recipient Type Selection */}
            <View style={styles.section}>
              <Text style={[
                styles.label,
                currentLanguage === 'ta' && styles.labelTamil
              ]}>{t('sendTo')} *</Text>
              <View style={styles.recipientTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.recipientTypeButton,
                    formData.recipientType === 'member' && styles.recipientTypeButtonActive,
                    currentLanguage === 'ta' && styles.recipientTypeButtonTamil
                  ]}
                  onPress={() => handleInputChange('recipientType', 'member')}
                >
                  <Icon 
                    name="account" 
                    size={currentLanguage === 'ta' ? 18 : 20} 
                    color={formData.recipientType === 'member' ? '#FFF' : '#4A90E2'} 
                    style={styles.recipientTypeIcon}
                  />
                  <Text style={[
                    styles.recipientTypeText,
                    formData.recipientType === 'member' && styles.recipientTypeTextActive,
                    currentLanguage === 'ta' && styles.recipientTypeTextTamil
                  ]}>
                    {t('specificMembers')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recipientTypeButton,
                    formData.recipientType === 'all' && styles.recipientTypeButtonActive,
                    currentLanguage === 'ta' && styles.recipientTypeButtonTamil
                  ]}
                  onPress={() => {
                    handleInputChange('recipientType', 'all');
                    setSelectedMembers([]);
                  }}
                >
                  <Icon 
                    name="account-multiple" 
                    size={currentLanguage === 'ta' ? 18 : 20} 
                    color={formData.recipientType === 'all' ? '#FFF' : '#4A90E2'} 
                    style={styles.recipientTypeIcon}
                  />
                  <Text style={[
                    styles.recipientTypeText,
                    formData.recipientType === 'all' && styles.recipientTypeTextActive,
                    currentLanguage === 'ta' && styles.recipientTypeTextTamil
                  ]}>
                    {t('allMembers')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Member Selection Button (if specific members) */}
            {formData.recipientType === 'member' && (
              <View style={styles.section}>
                <Text style={styles.label}>{t('selectMembers')} *</Text>
                <TouchableOpacity
                  style={styles.memberSelectionButton}
                  onPress={() => setShowMemberSelectionModal(true)}
                >
                  <Icon name="account-multiple" size={20} color="#4A90E2" style={styles.icon} />
                  <Text style={[styles.input, { color: selectedMembers.length > 0 ? '#333' : '#999' }]}>
                    {selectedMembers.length > 0 
                      ? `${selectedMembers.length} ${t('member')}${selectedMembers.length > 1 ? 's' : ''} ${t('selected')}`
                      : t('tapToSelectMembers') || 'Tap to select members'}
                  </Text>
                  <Icon name="chevron-right" size={20} color="#4A90E2" />
                </TouchableOpacity>
                
                {selectedMembers.length > 0 && (
                  <View style={styles.selectedMembersPreview}>
                    {selectedMembers.slice(0, 3).map(member => (
                      <View key={member.id} style={styles.selectedMemberChip}>
                        <Text style={styles.selectedMemberChipText}>{member.name}</Text>
                        <TouchableOpacity onPress={() => toggleMemberSelection(member)}>
                          <Icon name="close-circle" size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {selectedMembers.length > 3 && (
                      <Text style={styles.moreSelectedText}>
                        +{selectedMembers.length - 3} {t('more') || 'more'}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* All Members Info */}
            {formData.recipientType === 'all' && (
              <View style={styles.infoCard}>
                <Icon name="information" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  {t('messageWillBeSentToAllActiveMembers') || 'This message will be sent to all active members in your sub-company'}
                </Text>
              </View>
            )}

            {/* Event/Meeting Date Picker - Only for Event and Meeting types */}
            {(formData.messageType === 'Event' || formData.messageType === 'Meeting') && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  {formData.messageType === 'Event' ? t('eventDate') : t('meetingDate')} *
                </Text>
                <View style={styles.dateInputRow}>
                  {/* Text Input for manual entry */}
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Icon name="calendar" size={20} color="#4A90E2" style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder={t('dateFormatPlaceholder') || 'YYYY-MM-DD (e.g., 2025-02-15)'}
                      value={formData.eventDate}
                      onChangeText={(text) => handleInputChange('eventDate', text)}
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  {/* Calendar Button to open date picker */}
                  <TouchableOpacity
                    style={styles.calendarButton}
                    onPress={() => {
                      // Set initial date for picker
                      if (formData.eventDate) {
                        try {
                          const parsedDate = new Date(formData.eventDate);
                          if (!isNaN(parsedDate.getTime())) {
                            setTempDate(parsedDate);
                          } else {
                            setTempDate(new Date());
                          }
                        } catch {
                          setTempDate(new Date());
                        }
                      } else {
                        setTempDate(new Date());
                      }
                      setShowDatePicker(true);
                    }}
                  >
                    <Icon name="calendar-month" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.dateHint}>
                  {t('enterDateManuallyOrCalendar') || 'Enter date manually or tap the calendar button to select'}
                </Text>
              </View>
            )}

            {/* Date Picker Modal */}
            {showDatePicker && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.datePickerModalOverlay}>
                  <View style={styles.datePickerModalContent}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>{t('selectDate')}</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Icon name="close" size={24} color="#333" />
                      </TouchableOpacity>
                    </View>
                    
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          setShowDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            const formattedDate = selectedDate.toISOString().split('T')[0];
                            handleInputChange('eventDate', formattedDate);
                          }
                        } else {
                          if (selectedDate) {
                            setTempDate(selectedDate);
                          }
                        }
                      }}
                      minimumDate={new Date()}
                    />
                    
                    {Platform.OS === 'ios' && (
                      <View style={styles.datePickerButtons}>
                        <TouchableOpacity
                          style={[styles.datePickerButton, styles.datePickerCancelButton]}
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerCancelText}>{t('cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.datePickerButton, styles.datePickerConfirmButton]}
                          onPress={() => {
                            const formattedDate = tempDate.toISOString().split('T')[0];
                            handleInputChange('eventDate', formattedDate);
                            setShowDatePicker(false);
                          }}
                        >
                          <Text style={styles.datePickerConfirmText}>{t('confirm')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </Modal>
            )}

            {/* Payment Type Warning */}
            {formData.messageType === 'Payment' && (
              <>
                <View style={[styles.infoCard, { backgroundColor: '#FFF3E0' }]}>
                  <Icon name="alert" size={20} color="#FF9800" />
                  <Text style={[styles.infoText, { color: '#E65100' }]}>
                    {t('paymentMessagesValidated') || 'Payment messages are validated. Only members with valid payment records will receive this message.'}
                  </Text>
                </View>

                {/* Payment Month/Year Selection */}
                <View style={styles.section}>
                  <Text style={styles.label}>{t('paymentPeriod')} *</Text>
                  <View style={styles.paymentPeriodContainer}>
                    {/* Month Picker */}
                    <View style={styles.paymentPeriodItem}>
                      <Text style={styles.paymentPeriodLabel}>{t('month')}</Text>
                      <View style={styles.pickerContainer}>
                        <Icon name="calendar-month" size={20} color="#4A90E2" style={styles.pickerIcon} />
                        <Picker
                          selectedValue={formData.paymentMonth}
                          onValueChange={(value) => handleInputChange('paymentMonth', value)}
                          style={styles.picker}
                        >
                          <Picker.Item label={t('january')} value={1} />
                          <Picker.Item label={t('february')} value={2} />
                          <Picker.Item label={t('march')} value={3} />
                          <Picker.Item label={t('april')} value={4} />
                          <Picker.Item label={t('may')} value={5} />
                          <Picker.Item label={t('june')} value={6} />
                          <Picker.Item label={t('july')} value={7} />
                          <Picker.Item label={t('august')} value={8} />
                          <Picker.Item label={t('september')} value={9} />
                          <Picker.Item label={t('october')} value={10} />
                          <Picker.Item label={t('november')} value={11} />
                          <Picker.Item label={t('december')} value={12} />
                        </Picker>
                      </View>
                    </View>

                    {/* Year Picker */}
                    <View style={styles.paymentPeriodItem}>
                      <Text style={styles.paymentPeriodLabel}>{t('year')}</Text>
                      <View style={styles.pickerContainer}>
                        <Icon name="calendar" size={20} color="#4A90E2" style={styles.pickerIcon} />
                        <Picker
                          selectedValue={formData.paymentYear}
                          onValueChange={(value) => handleInputChange('paymentYear', value)}
                          style={styles.picker}
                        >
                          {Array.from({ length: 5 }, (_, i) => {
                            const year = new Date().getFullYear() - 1 + i;
                            return <Picker.Item key={year} label={year.toString()} value={year} />;
                          })}
                        </Picker>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.paymentPeriodHint}>
                    {t('reminderFor')}: {[t('january'), t('february'), t('march'), t('april'), t('may'), t('june'), 
                                       t('july'), t('august'), t('september'), t('october'), t('november'), t('december')][formData.paymentMonth - 1]} {formData.paymentYear}
                  </Text>
                </View>
              </>
            )}

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('subject')} *</Text>
              <View style={styles.inputContainer}>
                <Icon name="format-title" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('enterSubject') || 'Enter subject'}
                  value={formData.subject}
                  onChangeText={(text) => handleInputChange('subject', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('messageContent')} *</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('enterMessageContent') || 'Enter message content'}
                  value={formData.content}
                  onChangeText={(text) => handleInputChange('content', text)}
                  multiline
                  numberOfLines={8}
                  placeholderTextColor="#999"
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Preview */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('preview')}</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewLabel}>{t('recipient')}:</Text>
                  <Text style={styles.previewValue}>{getRecipientInfo()}</Text>
                </View>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewLabel}>{t('type')}:</Text>
                  <Text style={styles.previewValue}>{getTranslatedMessageType(formData.messageType)}</Text>
                </View>
                <Text style={styles.previewSubject}>{formData.subject}</Text>
                <Text style={styles.previewContent}>{formData.content}</Text>
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#FFF" />
                  <Text style={styles.sendButtonText}>{t('sendMessage')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('messages')}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            {t('selectTemplateToSendMessages') || 'Select a template to send messages to members. Payment Reminder automatically sends to unpaid members.'}
          </Text>
        </View>

        {/* Message Templates */}
        <Text style={[
          styles.sectionTitle,
          currentLanguage === 'ta' && styles.sectionTitleTamil
        ]}>{t('messageTemplates') || 'Message Templates'}</Text>
        <FlatList
          data={messageTemplates}
          renderItem={renderTemplateCard}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          numColumns={2}
          columnWrapperStyle={styles.templateGrid}
        />

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Icon name="email-send" size={24} color="#4A90E2" />
            <Text style={[
              styles.statLabel, 
              currentLanguage === 'ta' && styles.statLabelTamil
            ]}>{t('totalMessages')}</Text>
            <Text style={styles.statValue}>{totalMessagesCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="account-multiple" size={24} color="#4CAF50" />
            <Text style={[
              styles.statLabel, 
              currentLanguage === 'ta' && styles.statLabelTamil
            ]}>{t('activeMembers')}</Text>
            <Text style={styles.statValue}>{allMembers.length}</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateModal(false)}
      >
        <View style={styles.templateModalOverlay}>
          <View style={styles.templateModalContent}>
            <Text style={styles.templateModalTitle}>{t('selectTemplate')}</Text>
            <FlatList
              data={messageTemplates}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateOption}
                  onPress={() => handleSelectTemplate(item)}
                >
                  <Icon name={item.icon} size={24} color={item.color} />
                  <View style={styles.templateOptionText}>
                    <Text style={styles.templateOptionTitle}>{item.title}</Text>
                    <Text style={styles.templateOptionDesc}>{item.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id.toString()}
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={styles.templateModalClose}
              onPress={() => setShowTemplateModal(false)}
            >
              <Text style={styles.templateModalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderComposeModal()}

      {/* Member Selection Modal */}
      <Modal
        visible={showMemberSelectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowMemberSelectionModal(false);
          setMemberSearchQuery(''); // Clear search when modal closes
        }}
      >
        <SafeAreaView style={styles.memberSelectionModalContainer}>
          <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#4A90E2', '#87CEEB']} style={[
            styles.modalHeader,
            currentLanguage === 'ta' && styles.modalHeaderTamil
          ]}>
            <TouchableOpacity onPress={() => {
              setShowMemberSelectionModal(false);
              setMemberSearchQuery(''); // Clear search when modal closes
            }}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={[
              styles.modalTitle,
              currentLanguage === 'ta' && styles.modalTitleTamil
            ]}>{t('selectMembers')}</Text>
            <View style={[
              styles.headerRightButtons,
              currentLanguage === 'ta' && styles.headerRightButtonsTamil
            ]}>
              <TouchableOpacity onPress={() => {
                console.log('Messages - Refresh button pressed');
                setMemberSearchQuery(''); // Clear search when refreshing
                setSelectedMembers([]); // Clear selected members when refreshing
                loadMembers();
              }} style={styles.refreshButton} disabled={loadingMembers}>
                {loadingMembers ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Icon name="refresh" size={20} color="#FFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={selectAllMembers}
                style={[
                  styles.selectAllButton,
                  currentLanguage === 'ta' && styles.selectAllButtonTamil
                ]}
              >
                <Text 
                  style={[
                    styles.selectAllText,
                    currentLanguage === 'ta' && styles.selectAllTextTamil
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={currentLanguage === 'ta'}
                  minimumFontScale={0.8}
                >
                  {(() => {
                    const filteredMembers = getFilteredMembers();
                    const allFilteredSelected = filteredMembers.every(member => 
                      selectedMembers.some(selected => selected.id === member.id)
                    );
                    return allFilteredSelected && filteredMembers.length > 0 ? t('deselectAll') : t('selectAll');
                  })()}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Selected Count */}
          <View style={styles.selectedCountContainer}>
            <Icon name="account-check" size={20} color="#4A90E2" />
            <Text style={styles.selectedCountText}>
              {selectedMembers.length} {t('member')}{selectedMembers.length !== 1 ? 's' : ''} {t('selected')}
              {memberSearchQuery.trim() && (
                <Text style={styles.searchResultsText}>
                  {' • '}
                  {getFilteredMembers().length} {t('result')}{getFilteredMembers().length !== 1 ? 's' : ''}
                </Text>
              )}
            </Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Icon name="magnify" size={20} color="#4A90E2" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchMembersByNameEmailPhone')}
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
                placeholderTextColor="#999"
              />
              {memberSearchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setMemberSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Icon name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Members List */}
          {loadingMembers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>{t('loadingMembers')}</Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredMembers()}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedMembers.some(m => m.id === item.id);
                return (
                  <TouchableOpacity
                    style={[styles.memberSelectionItem, isSelected && styles.memberSelectionItemSelected]}
                    onPress={() => toggleMemberSelection(item)}
                  >
                    <View style={styles.memberSelectionItemContent}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Icon name="check" size={16} color="#FFF" />}
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberSelectionName}>{item.name}</Text>
                        <Text style={styles.memberSelectionContact}>
                          {item.email || item.phone || t('noContact')}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Icon name="check-circle" size={24} color="#4A90E2" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Icon name="account-off" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>
                    {memberSearchQuery.trim() ? t('noMembersFound') : t('noMembersFound')}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {memberSearchQuery.trim() 
                      ? t('tryAdjustingSearchTerms') 
                      : allMembers.length === 0 
                        ? t('noActiveMembersAvailable') 
                        : t('tryRefreshingScreen')
                    }
                  </Text>
                </View>
              )}
            />
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setShowMemberSelectionModal(false);
              setMemberSearchQuery(''); // Clear search when modal closes
            }}
          >
            <Text style={styles.doneButtonText}>
              {t('done')}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
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
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitleTamil: {
    fontSize: 14,
    lineHeight: 20,
  },
  templateGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  templateCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  templateGradient: {
    padding: 15,
    alignItems: 'center',
  },
  templateIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  templateTitleTamil: {
    fontSize: 12,
    lineHeight: 16,
  },
  templateDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  templateDescriptionTamil: {
    fontSize: 10,
    lineHeight: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabelTamil: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F9FC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  modalHeaderTamil: {
    paddingVertical: 12,
    minHeight: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalTitleTamil: {
    fontSize: 16,
    lineHeight: 20,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  modalContent: {
    flex: 1,
    padding: 15,
  },
  templateInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
  },
  templateInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  templateInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  templateInfoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
    overflow: 'visible',
    zIndex: 1,
  },
  memberSelectionSection: {
    overflow: 'visible',
    zIndex: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  labelTamil: {
    fontSize: 13,
    lineHeight: 18,
  },
  recipientTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  recipientTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#87CEEB',
    gap: 8,
    minHeight: 48,
  },
  recipientTypeButtonTamil: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 6,
    gap: 6,
  },
  recipientTypeButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  recipientTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
    textAlign: 'center',
    flexShrink: 1,
  },
  recipientTypeTextTamil: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    flexShrink: 1,
  },
  recipientTypeIcon: {
    flexShrink: 0,
    alignSelf: 'center',
  },
  recipientTypeTextActive: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
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
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  attachmentButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 10,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
  },
  previewSubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  previewContent: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  sendButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Template Modal
  templateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  templateModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 20,
    maxHeight: '80%',
  },
  templateModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  templateOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  templateOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  templateOptionDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  templateModalClose: {
    paddingVertical: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 10,
  },
  templateModalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  memberDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  memberDropdownList: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    maxHeight: 250,
    elevation: 3,
    overflow: 'hidden',
    zIndex: 1000,
  },
  memberDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    justifyContent: 'space-between',
  },
  memberItemContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 11,
    color: '#BBB',
    marginTop: 4,
  },
  memberSelectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  selectedMembersPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  selectedMemberChipText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  moreSelectedText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  previewHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    width: 60,
  },
  previewValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  memberSelectionModalContainer: {
    flex: 1,
    backgroundColor: '#87CEEB',
    marginTop: 50,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  selectAllTextTamil: {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
    flexShrink: 0,
    fontWeight: '700',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRightButtonsTamil: {
    gap: 10,
    flexShrink: 0,
    minWidth: 130,
    justifyContent: 'flex-end',
  },
  selectAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectAllButtonTamil: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 100,
    maxWidth: 100,
    minHeight: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 4,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  searchResultsText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: 10,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  memberSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberSelectionItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  memberSelectionItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  memberInfo: {
    flex: 1,
  },
  memberSelectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memberSelectionContact: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  doneButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  paymentPeriodContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  paymentPeriodItem: {
    flex: 1,
  },
  paymentPeriodLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  pickerIcon: {
    marginRight: 10,
  },
  picker: {
    flex: 1,
    height: 50,
  },
  paymentPeriodHint: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 8,
    fontWeight: '600',
  },
  dateHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  calendarButton: {
    backgroundColor: '#4A90E2',
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  datePickerCancelButton: {
    backgroundColor: '#F0F0F0',
  },
  datePickerConfirmButton: {
    backgroundColor: '#4A90E2',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default Messages;