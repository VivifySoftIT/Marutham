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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../service/api';

const Messages = ({ navigation }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showMemberSelectionModal, setShowMemberSelectionModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [adminMemberId, setAdminMemberId] = useState(null);
  const [adminSubCompanyId, setAdminSubCompanyId] = useState(null);

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
  });

  // Load members and messages from API when component mounts
  useEffect(() => {
    loadAdminMemberInfo();
    loadMembers();
    loadMessages();
  }, []);

  // Three-tier admin member ID lookup (matches Reports.js pattern)
  const loadAdminMemberInfo = async () => {
    try {
      // Tier 1: Check AsyncStorage
      const storedMemberId = await AsyncStorage.getItem('memberId');
      if (storedMemberId) {
        console.log('Messages - Member ID found in storage:', storedMemberId);
        const memberId = parseInt(storedMemberId);
        try {
          const memberData = await ApiService.getMemberById(memberId);
          if (memberData && memberData.isActive) {
            setAdminMemberId(memberId);
            setAdminSubCompanyId(memberData.subCompanyId);
            console.log('Messages - Admin member loaded from storage:', memberId, 'SubCompany:', memberData.subCompanyId);
            return memberId;
          }
        } catch (error) {
          console.log('Messages - Stored member ID invalid, continuing to lookup...');
        }
      }

      console.log('Messages - Member ID not in storage, attempting to look up...');

      // Tier 2: Get by User ID
      const userId = await AsyncStorage.getItem('userId');
      const fullName = await AsyncStorage.getItem('fullName');
      
      if (userId) {
        try {
          console.log('Messages - Trying GetByUserId with userId:', userId);
          const memberData = await ApiService.getMemberByUserId(parseInt(userId));
          if (memberData && memberData.id) {
            await AsyncStorage.setItem('memberId', memberData.id.toString());
            setAdminMemberId(memberData.id);
            setAdminSubCompanyId(memberData.subCompanyId);
            console.log('Messages - Member found via GetByUserId:', memberData.id, 'SubCompany:', memberData.subCompanyId);
            return memberData.id;
          }
        } catch (error) {
          console.log('Messages - GetByUserId failed, trying name search:', error);
        }
      }

      // Tier 3: Search by name
      if (fullName) {
        try {
          console.log('Messages - Searching members by name:', fullName);
          const members = await ApiService.getMembers();
          const member = members.find(m => 
            m.name && 
            m.name.trim().toLowerCase() === fullName.trim().toLowerCase() &&
            m.isActive
          );
          if (member) {
            await AsyncStorage.setItem('memberId', member.id.toString());
            setAdminMemberId(member.id);
            setAdminSubCompanyId(member.subCompanyId);
            console.log('Messages - Member found by name:', member.id, 'SubCompany:', member.subCompanyId);
            return member.id;
          }
        } catch (error) {
          console.log('Messages - Name search failed:', error);
        }
      }

      console.warn('Messages - Could not determine admin member ID');
      return null;
    } catch (error) {
      console.error('Messages - Error loading admin member info:', error);
      return null;
    }
  };

  const loadMembers = async () => {
    try {
      setLoadingMembers(true);
      console.log('Messages - Loading members...');
      const members = await ApiService.getMembers();
      console.log('Messages - Raw members response:', members);
      const activeMembers = (members || []).filter(m => m.isActive);
      console.log('Messages - Active members count:', activeMembers.length);
      console.log('Messages - Active members:', activeMembers);
      setAllMembers(activeMembers);
    } catch (error) {
      console.error('Messages - Error loading members:', error);
      Alert.alert('Error', 'Failed to load members list');
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMessages = async () => {
    try {
      setLoadingMessages(true);
      const messages = await ApiService.getMessageNotifications();
      setRecentMessages(messages || []);
      console.log('Messages loaded:', messages?.length);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const messageTemplates = [
    {
      id: 1,
      title: 'Birthday Wish',
      icon: 'cake-variant',
      color: '#E91E63',
      description: 'Send birthday wishes to members',
      defaultSubject: 'Happy Birthday! 🎉',
      defaultContent: 'Dear Member,\n\nWishing you a wonderful birthday filled with joy and success!\n\nMay this year bring you great opportunities and prosperity.\n\nHappy Birthday!\nAlaigal Team',
      messageType: 'Birthday'
    },
    {
      id: 2,
      title: 'Payment Reminder',
      icon: 'cash-clock',
      color: '#FF9800',
      description: 'Send payment reminder (validates payment status)',
      defaultSubject: 'Payment Reminder - Alaigal Membership',
      defaultContent: 'Dear Member,\n\nThis is a friendly reminder that your membership payment is due.\n\nPlease make the payment at your earliest convenience.\n\nThank you,\nAlaigal Team',
      messageType: 'Payment'
    },
    {
      id: 3,
      title: 'Event Notification',
      icon: 'calendar-star',
      color: '#2196F3',
      description: 'Notify members about upcoming events',
      defaultSubject: 'Upcoming Event - Alaigal Networking',
      defaultContent: 'Dear Member,\n\nWe are excited to invite you to our upcoming networking event!\n\nEvent Details:\nDate: [Date]\nTime: [Time]\nLocation: [Location]\n\nLooking forward to seeing you there!\n\nAlaigal Team',
      messageType: 'Event'
    },
    {
      id: 4,
      title: 'Meeting Notification',
      icon: 'account-group',
      color: '#00BCD4',
      description: 'Notify members about meetings',
      defaultSubject: 'Meeting Notification - Alaigal',
      defaultContent: 'Dear Member,\n\nYou are invited to attend our upcoming meeting.\n\nMeeting Details:\nDate: [Date]\nTime: [Time]\nLocation: [Location]\n\nPlease confirm your attendance.\n\nAlaigal Team',
      messageType: 'Meeting'
    },
    {
      id: 5,
      title: 'Welcome Message',
      icon: 'hand-wave',
      color: '#4CAF50',
      description: 'Welcome new members',
      defaultSubject: 'Welcome to Alaigal!',
      defaultContent: 'Dear Member,\n\nWelcome to Alaigal! We are excited to have you as part of our community.\n\nFeel free to connect with other members and grow your business together.\n\nBest regards,\nAlaigal Team',
      messageType: 'Welcome'
    },
  ];

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
    if (selectedMembers.length === allMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers([...allMembers]);
    }
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
      Alert.alert('Success', `File attached: ${result.name}`);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled file picker');
      } else {
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const validateForm = () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select a template');
      return false;
    }
    if (formData.recipientType === 'member' && selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return false;
    }
    if (!formData.subject.trim()) {
      Alert.alert('Error', 'Please enter subject');
      return false;
    }
    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please enter message content');
      return false;
    }
    if (!adminMemberId) {
      Alert.alert('Error', 'Admin member ID not found. Please try again.');
      return false;
    }
    if (!adminSubCompanyId) {
      Alert.alert('Error', 'Sub-company ID not found. Please try again.');
      return false;
    }
    return true;
  };

  const handleSendMessage = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
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
        CreatedBy: adminMemberId,
        SubCompanyId: adminSubCompanyId,
      };

      // Add payment-specific fields if Payment type
      if (formData.messageType === 'Payment') {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        notificationData.PaymentForMonth = `${monthNames[formData.paymentMonth - 1]} ${formData.paymentYear}`;
        notificationData.PaymentDate = new Date().toISOString();
      }

      console.log('Sending message notification:', notificationData);

      // Call API to create message notification
      const response = await ApiService.createMessageNotification(notificationData);

      console.log('Message sent successfully:', response);

      Alert.alert(
        'Success',
        `Message sent successfully!${formData.recipientType === 'all' ? ' (All members)' : ` (${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''})`}`,
        [
          {
            text: 'OK',
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
              });
              setSelectedMembers([]);
              setAttachment(null);
              loadMessages(); // Reload messages
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Failed to send message';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteMessageNotification(messageId);
              Alert.alert('Success', 'Message deleted successfully');
              loadMessages();
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          },
        },
      ]
    );
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
        <Text style={styles.templateTitle}>{item.title}</Text>
        <Text style={styles.templateDescription}>{item.description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderComposeModal = () => {
    if (!selectedTemplate) return null;

    const getRecipientInfo = () => {
      if (formData.recipientType === 'all') {
        return 'All active members';
      }
      return `${selectedMembers.length} selected member${selectedMembers.length !== 1 ? 's' : ''}`;
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
            <Text style={styles.modalTitle}>Compose Message</Text>
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
                  Type: {formData.messageType}
                </Text>
              </View>
            </View>

            {/* Recipient Type Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Send To *</Text>
              <View style={styles.recipientTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.recipientTypeButton,
                    formData.recipientType === 'member' && styles.recipientTypeButtonActive
                  ]}
                  onPress={() => handleInputChange('recipientType', 'member')}
                >
                  <Icon 
                    name="account" 
                    size={20} 
                    color={formData.recipientType === 'member' ? '#FFF' : '#4A90E2'} 
                  />
                  <Text style={[
                    styles.recipientTypeText,
                    formData.recipientType === 'member' && styles.recipientTypeTextActive
                  ]}>
                    Specific Members
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.recipientTypeButton,
                    formData.recipientType === 'all' && styles.recipientTypeButtonActive
                  ]}
                  onPress={() => {
                    handleInputChange('recipientType', 'all');
                    setSelectedMembers([]);
                  }}
                >
                  <Icon 
                    name="account-multiple" 
                    size={20} 
                    color={formData.recipientType === 'all' ? '#FFF' : '#4A90E2'} 
                  />
                  <Text style={[
                    styles.recipientTypeText,
                    formData.recipientType === 'all' && styles.recipientTypeTextActive
                  ]}>
                    All Members
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Member Selection Button (if specific members) */}
            {formData.recipientType === 'member' && (
              <View style={styles.section}>
                <Text style={styles.label}>Select Members *</Text>
                <TouchableOpacity
                  style={styles.memberSelectionButton}
                  onPress={() => setShowMemberSelectionModal(true)}
                >
                  <Icon name="account-multiple" size={20} color="#4A90E2" style={styles.icon} />
                  <Text style={[styles.input, { color: selectedMembers.length > 0 ? '#333' : '#999' }]}>
                    {selectedMembers.length > 0 
                      ? `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} selected`
                      : 'Tap to select members'}
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
                        +{selectedMembers.length - 3} more
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
                  This message will be sent to all active members in your sub-company
                </Text>
              </View>
            )}

            {/* Payment Type Warning */}
            {formData.messageType === 'Payment' && (
              <>
                <View style={[styles.infoCard, { backgroundColor: '#FFF3E0' }]}>
                  <Icon name="alert" size={20} color="#FF9800" />
                  <Text style={[styles.infoText, { color: '#E65100' }]}>
                    Payment messages are validated. Only members with valid payment records will receive this message.
                  </Text>
                </View>

                {/* Payment Month/Year Selection */}
                <View style={styles.section}>
                  <Text style={styles.label}>Payment Period *</Text>
                  <View style={styles.paymentPeriodContainer}>
                    {/* Month Picker */}
                    <View style={styles.paymentPeriodItem}>
                      <Text style={styles.paymentPeriodLabel}>Month</Text>
                      <View style={styles.pickerContainer}>
                        <Icon name="calendar-month" size={20} color="#4A90E2" style={styles.pickerIcon} />
                        <Picker
                          selectedValue={formData.paymentMonth}
                          onValueChange={(value) => handleInputChange('paymentMonth', value)}
                          style={styles.picker}
                        >
                          <Picker.Item label="January" value={1} />
                          <Picker.Item label="February" value={2} />
                          <Picker.Item label="March" value={3} />
                          <Picker.Item label="April" value={4} />
                          <Picker.Item label="May" value={5} />
                          <Picker.Item label="June" value={6} />
                          <Picker.Item label="July" value={7} />
                          <Picker.Item label="August" value={8} />
                          <Picker.Item label="September" value={9} />
                          <Picker.Item label="October" value={10} />
                          <Picker.Item label="November" value={11} />
                          <Picker.Item label="December" value={12} />
                        </Picker>
                      </View>
                    </View>

                    {/* Year Picker */}
                    <View style={styles.paymentPeriodItem}>
                      <Text style={styles.paymentPeriodLabel}>Year</Text>
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
                    Reminder for: {['January', 'February', 'March', 'April', 'May', 'June', 
                                   'July', 'August', 'September', 'October', 'November', 'December'][formData.paymentMonth - 1]} {formData.paymentYear}
                  </Text>
                </View>
              </>
            )}

            {/* Subject */}
            <View style={styles.section}>
              <Text style={styles.label}>Subject *</Text>
              <View style={styles.inputContainer}>
                <Icon name="format-title" size={20} color="#4A90E2" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter subject"
                  value={formData.subject}
                  onChangeText={(text) => handleInputChange('subject', text)}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Content */}
            <View style={styles.section}>
              <Text style={styles.label}>Message Content *</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter message content"
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
              <Text style={styles.label}>Preview</Text>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewLabel}>To:</Text>
                  <Text style={styles.previewValue}>{getRecipientInfo()}</Text>
                </View>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewLabel}>Type:</Text>
                  <Text style={styles.previewValue}>{formData.messageType}</Text>
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
                  <Text style={styles.sendButtonText}>Send Message</Text>
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
        <Text style={styles.headerTitle}>Send Messages</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information" size={20} color="#4A90E2" />
          <Text style={styles.infoText}>
            Select a template to send messages to members. Payment Reminder automatically sends to unpaid members.
          </Text>
        </View>

        {/* Message Templates */}
        <Text style={styles.sectionTitle}>Message Templates</Text>
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
            <Text style={styles.statLabel}>Total Messages</Text>
            <Text style={styles.statValue}>{recentMessages.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="account-multiple" size={24} color="#4CAF50" />
            <Text style={styles.statLabel}>Active Members</Text>
            <Text style={styles.statValue}>{allMembers.length}</Text>
          </View>
        </View>

        {/* Recent Messages */}
        <Text style={styles.sectionTitle}>Recent Messages</Text>
        {loadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4A90E2" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : recentMessages.length > 0 ? (
          <View style={styles.recentMessagesContainer}>
            {recentMessages.slice(0, 5).map((message) => (
              <View key={message.id} style={styles.messageItem}>
                <Icon 
                  name={
                    message.messageType === 'Birthday' ? 'cake-variant' :
                    message.messageType === 'Payment' ? 'cash-clock' :
                    message.messageType === 'Event' ? 'calendar-star' :
                    message.messageType === 'Meeting' ? 'account-group' :
                    'hand-wave'
                  } 
                  size={20} 
                  color={
                    message.messageType === 'Birthday' ? '#E91E63' :
                    message.messageType === 'Payment' ? '#FF9800' :
                    message.messageType === 'Event' ? '#2196F3' :
                    message.messageType === 'Meeting' ? '#00BCD4' :
                    '#4CAF50'
                  } 
                />
                <View style={styles.messageItemText}>
                  <Text style={styles.messageItemTitle}>{message.subject}</Text>
                  <Text style={styles.messageItemDate}>
                    {message.messageType} • {message.memberIds ? `${message.memberIds.split(',').length} member${message.memberIds.split(',').length > 1 ? 's' : ''}` : 'All members'} • {new Date(message.createdDate).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteMessage(message.id)}>
                  <Icon name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name="email-off" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No messages sent yet</Text>
            <Text style={styles.emptySubtext}>Start by selecting a template above</Text>
          </View>
        )}

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
            <Text style={styles.templateModalTitle}>Select Template</Text>
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
              <Text style={styles.templateModalCloseText}>Close</Text>
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
        onRequestClose={() => setShowMemberSelectionModal(false)}
      >
        <SafeAreaView style={styles.memberSelectionModalContainer}>
          <StatusBar backgroundColor="#4A90E2" barStyle="light-content" />

          {/* Modal Header */}
          <LinearGradient colors={['#4A90E2', '#87CEEB']} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMemberSelectionModal(false)}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Members</Text>
            <View style={styles.headerRightButtons}>
              <TouchableOpacity onPress={loadMembers} style={styles.refreshButton}>
                <Icon name="refresh" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={selectAllMembers}>
                <Text style={styles.selectAllText}>
                  {selectedMembers.length === allMembers.length && allMembers.length > 0 ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Selected Count */}
          <View style={styles.selectedCountContainer}>
            <Icon name="account-check" size={20} color="#4A90E2" />
            <Text style={styles.selectedCountText}>
              {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
            </Text>
          </View>

          {/* Members List */}
          {loadingMembers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading members...</Text>
            </View>
          ) : (
            <FlatList
              data={allMembers}
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
                          {item.email || item.phone || 'No contact'}
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
                  <Text style={styles.emptyText}>No members found</Text>
                  <Text style={styles.emptySubtext}>
                    {allMembers.length === 0 ? 'No active members available' : 'Try refreshing the screen'}
                  </Text>
                </View>
              )}
            />
          )}

          {/* Done Button */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => setShowMemberSelectionModal(false)}
          >
            <Text style={styles.doneButtonText}>
              Done ({selectedMembers.length} selected)
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
  templateDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
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
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginTop: 4,
  },
  recentMessagesContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  messageItemText: {
    flex: 1,
    marginLeft: 12,
  },
  messageItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  messageItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
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
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#87CEEB',
    gap: 8,
  },
  recipientTypeButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  recipientTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A90E2',
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
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    padding: 4,
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
});

export default Messages;