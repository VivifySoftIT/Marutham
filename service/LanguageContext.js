import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LanguageContext = createContext();

const translations = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    close: 'Close',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    export: 'Export',
    import: 'Import',
    
    // Dashboard
    goodMorning: 'Good Morning',
    goodAfternoon: 'Good Afternoon',
    goodEvening: 'Good Evening',
    welcomeBack: 'Welcome Back',
    startYourDay: 'Start your day with energy and purpose!',
    keepMomentum: 'Keep up the momentum! Great things are happening.',
    reflectAchievements: 'Reflect on your achievements and plan for tomorrow.',
    totalMembers: 'Total Members',
    activeMembers: 'Active Members',
    pendingPayments: 'Pending Payments',
    totalRevenue: 'Total Revenue',
    quickActions: 'Quick Actions',
    managementModules: 'Management Modules',
    recentActivity: 'Recent Activity',
    today: 'Today',
    
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    markAsRead: 'Mark as Read',
    newMemberRegistered: 'New Member Registered',
    paymentReceived: 'Payment Received',
    pendingPaymentsAlert: 'Pending Payments Alert',
    
    // Settings
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    tamil: 'Tamil',
    editProfile: 'Edit Profile',
    changePassword: 'Change Password',
    privacySecurity: 'Privacy & Security',
    
    // Attendance
    attendance: 'Attendance',
    markAttendance: 'Mark Attendance',
    uploadExcel: 'Upload Excel',
    selectDate: 'Select Date',
    memberName: 'Member Name',
    present: 'Present',
    absent: 'Absent',
    saveAttendance: 'Save Attendance',
    attendanceUpdated: 'Attendance Updated Successfully',
    selectMembers: 'Please select at least one member',
    markedPresent: 'Marked Present',
    searchBy: 'Search by',
    name: 'Name',
    business: 'Business',
    id: 'ID',
    phone: 'Phone',
    
    // Voice Search
    voiceSearch: 'Voice Search',
    voiceError: 'Voice Error',
    voiceErrorMessage: 'Unable to recognize speech. Please try again.',
    noMemberFound: 'No Member Found',
    noMemberFoundMessage: 'No member found with the name',
    speakMemberName: 'Speak member name to search and mark attendance',
    listening: 'Listening...',
    tapToSpeak: 'Tap microphone to speak',
    summary: 'Summary',
    saving: 'Saving',
    markAttendance: 'Mark',
    
    // Members
    members: 'Members',
    membersList: 'Members List',
    addMember: 'Add Member',
    editMember: 'Edit Member',
    deleteMember: 'Delete Member',
    memberDetails: 'Member Details',
    newMember: 'New Member',
    bulkImport: 'Bulk Import',
    membersDirectory: 'Members Directory',
    
    // Profile
    profile: 'Profile',
    myProfile: 'My Profile',
    personalInfo: 'Personal Information',
    contactInfo: 'Contact Information',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    designation: 'Designation',
    
    // Menu
    home: 'Home',
    signOut: 'Sign Out',
    confirmSignOut: 'Are you sure you want to sign out?',
    membersDashboard: 'Members Dashboard',
    
    // Payments
    payments: 'Payments',
    paymentDetails: 'Payment Details',
    takePayment: 'Take Payment',
    myPayments: 'My Payments',
    feesManagement: 'Fees Management',
    amount: 'Amount',
    date: 'Date',
    status: 'Status',
    paid: 'Paid',
    pending: 'Pending',
    
    // Reports
    reports: 'Reports',
    generateReport: 'Generate Report',
    biometricReport: 'Biometric Report',
    referralReports: 'Referral Reports',
    
    // Messages & Notices
    messages: 'Messages',
    sendNotice: 'Send Notice',
    title: 'Title',
    message: 'Message',
    recipient: 'Recipient',
    send: 'Send',
    
    // Admin
    adminMeeting: 'Admin Meeting',
    adminNotifications: 'Admin Notifications',
    
    // Inventory
    inventory: 'Inventory',
    inventoryForm: 'Inventory Form',
    
    // Visitors
    visitors: 'Visitors',
    addVisitor: 'Add Visitor',
    visitorName: 'Visitor Name',
    
    // Batches
    batches: 'Batches',
    addBatch: 'Add Batch',
    batchName: 'Batch Name',
    
    // CEU
    ceu: 'CEU',
    myCEUs: 'My CEUs',
    
    // Feed
    feed: 'Feed',
    myFeed: 'My Feed',
    
    // Slips
    tyfcbSlip: 'TYFCB Slip',
    referralSlip: 'Referral Slip',
    oneToOneSlip: 'One to One Slip',
    
    // Form Fields
    firstName: 'First Name',
    lastName: 'Last Name',
    mobileNumber: 'Mobile Number',
    emergencyContact: 'Emergency Contact',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    other: 'Other',
    
    // Actions
    submit: 'Submit',
    update: 'Update',
    create: 'Create',
    remove: 'Remove',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    chooseFile: 'Choose File',
    
    // Messages
    successMessage: 'Operation completed successfully',
    errorMessage: 'An error occurred. Please try again.',
    confirmDelete: 'Are you sure you want to delete this?',
    noDataAvailable: 'No data available',
    tryAgain: 'Try Again',
    
    // Time
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
  },
  ta: {
    // Common
    save: 'சேமிக்க',
    cancel: 'ரத்து செய்க',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    back: 'பின்னால்',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    success: 'வெற்றி',
    yes: 'ஆம்',
    no: 'இல்லை',
    ok: 'சரி',
    close: 'மூடு',
    search: 'தேடு',
    filter: 'வடிகட்ட',
    sort: 'வரிசைப்படுத்து',
    export: 'ஏற்றுமதி',
    import: 'இறக்குமதி',
    
    // Dashboard
    goodMorning: 'காலை வணக்கம்',
    goodAfternoon: 'மதியம் வணக்கம்',
    goodEvening: 'மாலை வணக்கம்',
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்',
    startYourDay: 'ஆற்றல் மற்றும் நோக்கத்துடன் உங்கள் நாளைத் தொடங்குங்கள்!',
    keepMomentum: 'வேகத்தை பராமரிக்கவும்! அருமையான விஷயங்கள் நடக்கிறது.',
    reflectAchievements: 'உங்கள் சாதனைகளை பிரதிபலிக்கவும் மற்றும் நாளைக்கு திட்டமிடுங்கள்.',
    totalMembers: 'மொத்த உறுப்பினர்கள்',
    activeMembers: 'செயல்பாட்டு உறுப்பினர்கள்',
    pendingPayments: 'நிலுவையில் உள்ள பணம்',
    totalRevenue: 'மொத்த வருவாய்',
    quickActions: 'விரைவு செயல்கள்',
    managementModules: 'நிர்வாக தொகுதிகள்',
    recentActivity: 'சமீபத்திய செயல்பாடு',
    today: 'இன்று',
    
    // Notifications
    notifications: 'அறிவிப்புகள்',
    noNotifications: 'அறிவிப்புகள் இல்லை',
    markAsRead: 'படிக்கப்பட்டதாக குறிக்கவும்',
    newMemberRegistered: 'புதிய உறுப்பினர் பதிவு செய்யப்பட்டார்',
    paymentReceived: 'பணம் பெறப்பட்டது',
    pendingPaymentsAlert: 'நிலுவையில் உள்ள பணம் எச்சரிக்கை',
    
    // Settings
    settings: 'அமைப்புகள்',
    language: 'மொழி',
    english: 'ஆங்கிலம்',
    tamil: 'தமிழ்',
    editProfile: 'சுயவிவரத்தை திருத்து',
    changePassword: 'கடவுச்சொல்லை மாற்று',
    privacySecurity: 'தனியுரிமை மற்றும் பாதுகாப்பு',
    
    // Attendance
    attendance: 'கலந்து கொள்ளுதல்',
    markAttendance: 'கலந்து கொள்ளுதல் குறிக்கவும்',
    uploadExcel: 'Excel பதிவேற்றவும்',
    selectDate: 'தேதி தேர்ந்தெடுக்கவும்',
    memberName: 'உறுப்பினர் பெயர்',
    present: 'உள்ளவர்',
    absent: 'இல்லாதவர்',
    saveAttendance: 'கலந்து கொள்ளுதல் சேமிக்கவும்',
    attendanceUpdated: 'கலந்து கொள்ளுதல் வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
    selectMembers: 'குறைந்தபட்சம் ஒரு உறுப்பினரைத் தேர்ந்தெடுக்கவும்',
    markedPresent: 'குறிக்கப்பட்ட உள்ளவர்',
    searchBy: 'தேடல்',
    name: 'பெயர்',
    business: 'வணிகம்',
    id: 'அடையாள எண்',
    phone: 'தொலைபேசி',
    
    // Voice Search
    voiceSearch: 'குரல் தேடல்',
    voiceError: 'குரல் பிழை',
    voiceErrorMessage: 'பேச்சை அடையாளம் காண முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
    noMemberFound: 'உறுப்பினர் கிடைக்கவில்லை',
    noMemberFoundMessage: 'இந்த பெயருடன் உறுப்பினர் கிடைக்கவில்லை',
    speakMemberName: 'உறுப்பினர் பெயரை சொல்லி தேடவும் மற்றும் கலந்து கொள்ளுதல் குறிக்கவும்',
    listening: 'கேட்கிறது...',
    tapToSpeak: 'பேச மைக்ரோஃபோனை தட்டவும்',
    summary: 'சுருக்கம்',
    saving: 'சேமிக்கிறது',
    markAttendance: 'குறிக்க',
    
    // Members
    members: 'உறுப்பினர்கள்',
    membersList: 'உறுப்பினர்கள் பட்டியல்',
    addMember: 'உறுப்பினர் சேர்க்கவும்',
    editMember: 'உறுப்பினர் திருத்தவும்',
    deleteMember: 'உறுப்பினர் நீக்கவும்',
    memberDetails: 'உறுப்பினர் விவரங்கள்',
    newMember: 'புதிய உறுப்பினர்',
    bulkImport: 'மொத்த இறக்குமதி',
    membersDirectory: 'உறுப்பினர்கள் அடைவு',
    
    // Profile
    profile: 'சுயவிவரம்',
    myProfile: 'என் சுயவிவரம்',
    personalInfo: 'ব்যக்திगत தகவல்',
    contactInfo: 'தொடர்பு தகவல்',
    name: 'பெயர்',
    email: 'மின்னஞ்சல்',
    phone: 'தொலைபேசி',
    address: 'முகவரி',
    designation: 'பதவி',
    
    // Menu
    home: 'வீடு',
    signOut: 'வெளியேறு',
    confirmSignOut: 'நீங்கள் வெளியேற விரும்புகிறீர்களா?',
    membersDashboard: 'உறுப்பினர்கள் டாஷ்போர்டு',
    
    // Payments
    payments: 'பணம்',
    paymentDetails: 'பணம் விவரங்கள்',
    takePayment: 'பணம் வசூல் செய்க',
    myPayments: 'என் பணம்',
    feesManagement: 'கட்டணம் நிர்வாகம்',
    amount: 'தொகை',
    date: 'தேதி',
    status: 'நிலை',
    paid: 'செலுத்தப்பட்ட',
    pending: 'நிலுவையில்',
    
    // Reports
    reports: 'அறிக்கைகள்',
    generateReport: 'அறிக்கை உருவாக்கு',
    biometricReport: 'உயிரியல் அறிக்கை',
    referralReports: 'பரிந்துரை அறிக்கைகள்',
    
    // Messages & Notices
    messages: 'செய்திகள்',
    sendNotice: 'அறிவிப்பு அனுப்பு',
    title: 'தலைப்பு',
    message: 'செய்தி',
    recipient: 'பெறுநர்',
    send: 'அனுப்பு',
    
    // Admin
    adminMeeting: 'நிர்வாக கூட்டம்',
    adminNotifications: 'நிர்வாக அறிவிப்புகள்',
    
    // Inventory
    inventory: 'சரக்கு',
    inventoryForm: 'சரக்கு படிவம்',
    
    // Visitors
    visitors: 'பார்வையாளர்கள்',
    addVisitor: 'பார்வையாளர் சேர்க்கவும்',
    visitorName: 'பார்வையாளர் பெயர்',
    
    // Batches
    batches: 'தொகுப்புகள்',
    addBatch: 'தொகுப்பு சேர்க்கவும்',
    batchName: 'தொகுப்பு பெயர்',
    
    // CEU
    ceu: 'CEU',
    myCEUs: 'என் CEU',
    
    // Feed
    feed: 'ஊட்ட',
    myFeed: 'என் ஊட்ட',
    
    // Slips
    tyfcbSlip: 'TYFCB சீட்டு',
    referralSlip: 'பரிந்துரை சீட்டு',
    oneToOneSlip: 'ஒன்றுக்கு ஒன்று சீட்டு',
    
    // Form Fields
    firstName: 'முதல் பெயர்',
    lastName: 'கடைசி பெயர்',
    mobileNumber: 'மொபைல் எண்',
    emergencyContact: 'அவசர தொடர்பு',
    gender: 'பாலினம்',
    male: 'ஆண்',
    female: 'பெண்',
    other: 'மற்றவை',
    
    // Actions
    submit: 'சமர்ப்பிக்க',
    update: 'புதுப்பிக்க',
    create: 'உருவாக்கு',
    remove: 'நீக்கு',
    view: 'பார்க்க',
    download: 'பதிவிறக்கம்',
    upload: 'பதிவேற்றம்',
    chooseFile: 'கோப்பு தேர்ந்தெடுக்கவும்',
    
    // Messages
    successMessage: 'செயல்பாடு வெற்றிகரமாக முடிந்தது',
    errorMessage: 'ஒரு பிழை ஏற்பட்டது. மீண்டும் முயற்சி செய்யவும்.',
    confirmDelete: 'இதை நீக்க விரும்புகிறீர்களா?',
    noDataAvailable: 'தரவு கிடைக்கவில்லை',
    tryAgain: 'மீண்டும் முயற்சி செய்க',
    
    // Time
    morning: 'காலை',
    afternoon: 'மதியம்',
    evening: 'மாலை',
    yesterday: 'நேற்று',
    thisWeek: 'இந்த வாரம்',
    thisMonth: 'இந்த மாதம்',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('appLanguage');
        if (savedLanguage) {
          setLanguage(savedLanguage);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (lang) => {
    try {
      setLanguage(lang);
      await AsyncStorage.setItem('appLanguage', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
