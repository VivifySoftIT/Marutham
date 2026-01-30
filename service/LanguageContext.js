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
    
    // Login Screen
    username: 'Username',
    password: 'Password',
    login: 'Login',
    rememberMe: 'Remember Me',
    forgotPassword: 'Forgot Password?',
    pleaseEnterCredentials: 'Please enter your Username and Password.',
    authenticationFailed: 'Authentication failed. Please try again.',
    biometricLogin: 'Biometric Login',
    authenticateToAccess: 'Authenticate to access Alaigal',
    noSavedCredentials: 'No saved credentials found. Please log in manually.',
    
    // Settings Screen
    myDetails: 'My Details',
    viewManageAccount: 'View and manage your account information',
    currentLanguage: 'Current',
    updatePassword: 'Update your account password',
    languageChanged: 'Language changed to',
    
    // Menu Items (Drawer)
    markAttendance: 'Mark Attendance',
    
    // Report Types
    thanksNote: 'ThanksNote',
    oneToOneMeeting: '1:1 Meeting',
    alaigalMeeting: 'Alaigal Meeting',
    visitor: 'Visitor',
    payment: 'Payment',
    referral: 'Referral',
    
    // Messages Screen
    templates: 'Templates',
    compose: 'Compose',
    selectTemplate: 'Select Template',
    composeMessage: 'Compose Message',
    selectMembers: 'Select Members',
    allMembers: 'All Members',
    specificMembers: 'Specific Members',
    subject: 'Subject',
    content: 'Content',
    messageType: 'Message Type',
    welcome: 'Welcome',
    paymentReminder: 'Payment Reminder',
    event: 'Event',
    meeting: 'Meeting',
    general: 'General',
    paymentMonth: 'Payment Month',
    paymentYear: 'Payment Year',
    eventDate: 'Event Date',
    selectDate: 'Select Date',
    recipientType: 'Recipient Type',
    attachment: 'Attachment',
    sendMessage: 'Send Message',
    totalMessages: 'Total Messages',
    
    // Common Alerts
    confirmTitle: 'Confirm',
    warningTitle: 'Warning',
    infoTitle: 'Information',
    
    // Form Validation
    fieldRequired: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid phone number',
    passwordTooShort: 'Password must be at least 6 characters',
    
    // Status Messages
    operationSuccessful: 'Operation completed successfully',
    operationFailed: 'Operation failed. Please try again.',
    dataLoaded: 'Data loaded successfully',
    dataLoadFailed: 'Failed to load data',
    
    // Navigation
    goBack: 'Go Back',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    
    // File Operations
    selectFile: 'Select File',
    fileSelected: 'File Selected',
    fileUploadSuccess: 'File uploaded successfully',
    fileUploadFailed: 'File upload failed',
    
    // Search & Filter
    searchPlaceholder: 'Search...',
    filterBy: 'Filter by',
    sortBy: 'Sort by',
    noResults: 'No results found',
    clearFilter: 'Clear Filter',
    
    // Months
    january: 'January',
    february: 'February',
    march: 'March',
    april: 'April',
    may: 'May',
    june: 'June',
    july: 'July',
    august: 'August',
    september: 'September',
    october: 'October',
    november: 'November',
    december: 'December',
    
    // Dashboard & Member Management
    dashboard: 'Dashboard',
    memberDashboard: 'Member Dashboard',
    userDashboard: 'User Dashboard',
    addNewMember: 'Add New Member',
    editMember: 'Edit Member',
    memberDetails: 'Member Details',
    memberDirectory: 'Member Directory',
    bulkImport: 'Bulk Import',
    newMemberUpload: 'New Member Upload',
    memberForm: 'Member Form',
    
    // Attendance
    attendanceReport: 'Attendance Report',
    attendanceUpload: 'Attendance Upload',
    markPresent: 'Mark Present',
    markAbsent: 'Mark Absent',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    
    // Payments & Fees
    feesManagement: 'Fees Management',
    paymentHistory: 'Payment History',
    pendingPayments: 'Pending Payments',
    paymentStatus: 'Payment Status',
    dueDate: 'Due Date',
    amountDue: 'Amount Due',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    online: 'Online',
    
    // Meetings & Events
    createMeeting: 'Create Meeting',
    meetingDetails: 'Meeting Details',
    meetingTime: 'Meeting Time',
    meetingLocation: 'Meeting Location',
    attendees: 'Attendees',
    agenda: 'Agenda',
    
    // Notifications
    sendNotification: 'Send Notification',
    notificationTitle: 'Notification Title',
    notificationMessage: 'Notification Message',
    sendToAll: 'Send to All',
    sendToSelected: 'Send to Selected',
    
    // Profile & Account
    personalDetails: 'Personal Details',
    contactDetails: 'Contact Details',
    emergencyContact: 'Emergency Contact',
    dateOfBirth: 'Date of Birth',
    joiningDate: 'Joining Date',
    membershipType: 'Membership Type',
    
    // Forms & Validation
    required: 'Required',
    optional: 'Optional',
    pleaseSelect: 'Please Select',
    pleaseEnter: 'Please Enter',
    invalidFormat: 'Invalid Format',
    fieldCannotBeEmpty: 'Field cannot be empty',
    
    // Actions & Buttons
    add: 'Add',
    modify: 'Modify',
    refresh: 'Refresh',
    reset: 'Reset',
    clear: 'Clear',
    apply: 'Apply',
    confirm: 'Confirm',
    proceed: 'Proceed',
    continue: 'Continue',
    skip: 'Skip',
    
    // Status & States
    active: 'Active',
    inactive: 'Inactive',
    completed: 'Completed',
    inProgress: 'In Progress',
    cancelled: 'Cancelled',
    approved: 'Approved',
    rejected: 'Rejected',
    draft: 'Draft',
    
    // File Operations
    uploadFile: 'Upload File',
    downloadFile: 'Download File',
    selectImage: 'Select Image',
    takePhoto: 'Take Photo',
    chooseFromGallery: 'Choose from Gallery',
    
    // Time & Date
    selectTime: 'Select Time',
    fromDate: 'From Date',
    toDate: 'To Date',
    startDate: 'Start Date',
    endDate: 'End Date',
    
    // Search & Filter
    searchMembers: 'Search Members',
    filterResults: 'Filter Results',
    sortResults: 'Sort Results',
    showAll: 'Show All',
    
    // Inventory & Batches
    inventory: 'Inventory',
    addBatch: 'Add Batch',
    batchDetails: 'Batch Details',
    quantity: 'Quantity',
    description: 'Description',
    
    // Reports & Analytics
    generateReport: 'Generate Report',
    exportReport: 'Export Report',
    reportType: 'Report Type',
    dateRange: 'Date Range',
    
    // Slips & Documents
    tyfcbSlip: 'TYFCB Slip',
    referralSlip: 'Referral Slip',
    oneToOneSlip: 'One to One Slip',
    
    // Visitors
    visitorManagement: 'Visitor Management',
    visitorDetails: 'Visitor Details',
    purpose: 'Purpose',
    visitDate: 'Visit Date',
    
    // CEU & Feed
    myCEUs: 'My CEUs',
    myFeed: 'My Feed',
    feedUpdates: 'Feed Updates',
    
    // Biometric
    biometricReport: 'Biometric Report',
    fingerprint: 'Fingerprint',
    faceRecognition: 'Face Recognition',
    
    // Excel & Data
    excelViewer: 'Excel Viewer',
    dataImport: 'Data Import',
    dataExport: 'Data Export',
    
    // Password & Security
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    passwordChanged: 'Password Changed Successfully',
    
    // Common Messages
    operationCompleted: 'Operation Completed',
    dataUpdated: 'Data Updated',
    recordSaved: 'Record Saved',
    recordDeleted: 'Record Deleted',
    noRecordsFound: 'No Records Found',
    loadingData: 'Loading Data...',
    savingData: 'Saving Data...',
    processingRequest: 'Processing Request...',
    
    // Settings Screen Additional
    role: 'Role',
    interfaceMode: 'Interface Mode',
    userMode: 'User Mode',
    adminMode: 'Admin Mode',
    switchInterfaceMode: 'Switch Interface Mode',
    chooseInterfaceMode: 'Choose your interface mode:',
    restartNow: 'Restart Now',
    later: 'Later',
    restartAppToSeeChanges: 'Please restart the app to see the changes',
    updateProfileInfo: 'Update your profile information',
    readPrivacyPolicy: 'Read our privacy policy and terms',
    privacyPolicyContent: 'Privacy Policy and Terms of Service\n\n• Your data is secure with us\n• We respect your privacy\n• Terms and conditions apply\n• Contact support for more info',
    
    // Additional Common Terms
    administrator: 'Administrator',
    user: 'User',
    member: 'Member',
    accountSettings: 'Account Settings',
    appInfo: 'App Information',
    version: 'Version',
    professionalNetworking: 'Professional Networking Platform',
    
    // Time Periods
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    
    // Report Terms
    totalMembers: 'Total Members',
    presentCount: 'Present',
    absentCount: 'Absent',
    attendancePercentage: 'Attendance %',
    
    // Excel Viewer
    excelViewer: 'Excel Viewer',
    uploadExcelFile: 'Upload Excel File',
    chooseExcelFile: 'Choose Excel File',
    supportedExcelFormats: 'Supported: .xls, .xlsx files with data starting from row 1',
    noSheetsFound: 'No sheets found in Excel file',
    noDataFoundInExcel: 'No data found in Excel file. Make sure the file has data starting from row 1.',
    noColumnsFound: 'No columns found in Excel file',
    loadedRows: 'Loaded {{count}} rows',
    columnsCount: '{{count}} columns',
    columns: 'Columns',
    failedToUploadExcel: 'Failed to upload Excel file',
    makeSureExcelFile: 'Make sure',
    fileIsExcelFormat: 'File is .xls or .xlsx',
    fileHasDataInFirstSheet: 'File has data in first sheet',
    dataStartsFromRow1: 'Data starts from row 1',
    file: 'File',
    rows: 'Rows',
    filtered: 'Filtered',
    cardView: 'Card View',
    tableView: 'Table View (First 20 Rows)',
    searchInAllColumns: 'Search in all columns...',
    noRowsFound: 'No rows found',
    rowDetails: 'Row #{{id}} Details',
    noFileUploaded: 'No file uploaded',
    uploadExcelFileToView: 'Upload an Excel file to view its contents',
    noDataFound: 'No data found',
    fileUploadedButNoData: 'The file was uploaded but contains no data. Make sure your Excel file has data starting from row 1.',
    dataView: 'Data View',
    showingRowsOf: 'Showing {{filtered}} of {{total}} rows',
    andMoreRows: '... and {{count}} more rows (click rows above for details)',
    
    // Visitor/CEU Form
    country: 'Country',
    region: 'Region',
    chapter: 'Chapter',
    chapterDetails: 'Chapter Details',
    personalDetails: 'Personal Details',
    languageDetails: 'Language Details',
    contactDetails: 'Contact Details',
    addressDetails: 'Address Details',
    title: 'Title',
    company: 'Company',
    telephone: 'Telephone',
    visitorEmail: 'Visitor Email',
    county: 'County',
    city: 'City',
    state: 'State',
    postCode: 'Post Code',
    confirmDetails: 'Confirm Details',
    englishLanguage: 'English Language',
    tamilLanguage: 'Tamil Language',
    
    // Change Password Screen
    validationError: 'Validation Error',
    currentPasswordRequired: 'Current password is required',
    newPasswordRequired: 'New password is required',
    passwordsDoNotMatch: 'New password and confirm password do not match',
    newPasswordMustBeDifferent: 'New password must be different from current password',
    userSessionNotFound: 'User session not found. Please login again.',
    passwordChangedSuccessfully: 'Password changed successfully! Please login with your new password.',
    failedToChangePassword: 'Failed to change password',
    defaultPasswordInfo: 'Your default password is your mobile number. Please change it to a secure password.',
    enterCurrentPassword: 'Enter current password',
    enterNewPasswordMin6: 'Enter new password (min 6 chars)',
    reEnterNewPassword: 'Re-enter new password',
    passwordRequirements: 'Password Requirements',
    atLeast6Characters: 'At least 6 characters',
    passwordsMatch: 'Passwords match',
    differentFromCurrentPassword: 'Different from current password',
    
    // Profile Screen
    phoneNumberMustBe10Digits: 'Phone number must be exactly 10 digits.',
    contactNumberMustBe10Digits: 'Contact number must be exactly 10 digits.',
    memberIdNotFound: 'Member ID not found. Please try logging in again.',
    profileUpdatedSuccessfully: 'Profile updated successfully!',
    failedToUpdateProfile: 'Failed to update profile',
    unknownError: 'Unknown error',
    failedToUpdateProfileTryAgain: 'Failed to update profile. Please try again.',
    errorOccurredUpdatingProfile: 'An error occurred while updating the profile.',
    permissionMediaLibraryRequired: 'Permission to access media library is required!',
    removePhoto: 'Remove Photo',
    areYouSureRemovePhoto: 'Are you sure you want to remove your profile photo?',
    remove: 'Remove',
    profilePhoto: 'Profile Photo',
    chooseAnOption: 'Choose an option',
    changePhoto: 'Change Photo',
    removePhoto: 'Remove Photo',
    inputCannotExceed10Digits: 'Input cannot exceed 10 digits.',
    loadingProfile: 'Loading profile...',
    tapToChangeLongPressToView: 'Tap to change • Long press to view',
    personal: 'Personal',
    professional: 'Professional',
    contactNumber: 'Contact Number',
    memberID: 'Member ID',
    joinDate: 'Join Date',
    saveChanges: 'Save Changes',
    setProfilePicture: 'Set Profile Picture',
    
    // Status values
    completed: 'Completed',
    
    // UserDashboard specific translations
    welcomeToAlaigal: 'Welcome to Alaigal',
    checkingBirthdayWishes: 'Checking for birthday wishes...',
    birthdayWishReceived: 'Birthday Wish Received!',
    sentYouBirthdayWishes: 'sent you birthday wishes today!',
    loadingYourDashboard: 'Loading your dashboard...',
    recentNotifications: 'Recent Notifications',
    viewAll: 'View All',
    tapToRespond: 'Tap to respond',
    tapToView: 'Tap to view',
    myActivity: 'My Activity',
    allTime: 'All Time',
    weekly: 'Weekly',
    monthly: 'Monthly',
    annual: 'Annual',
    showingDataFor: 'Showing data for:',
    referralsGiven: 'Referrals Given',
    referralsReceived: 'Referrals Received',
    thanksNoteGiven: 'ThanksNote Given',
    thanksNoteReceived: 'ThanksNote Received',
    businessVisits: 'Business Visits',
    businessesVisited: 'Businesses Visited',
    connectWithMembers: 'Connect with members, give referrals, and grow your business together in our professional network.',
    memberIdNotAssigned: 'Member ID: Not assigned',
    currentlyViewing: 'Currently viewing:',
    statistics: 'statistics',
    memberDetails: 'Member Details',
    alaigalNetworkMember: 'Alaigal Network Member',
    twoFactorAuthentication: 'Two-Factor Authentication',
    disabled: 'Disabled',
    loginNotifications: 'Login Notifications',
    logout: 'Logout',
    areYouSureLogout: 'Are you sure you want to logout?',
    sendBirthdayWishes: 'Send Birthday Wishes',
    sendBirthdayWishesTo: 'Send birthday wishes to',
    birthdayWishesSentTo: 'Birthday wishes sent to',
    sendWelcomeWishes: 'Send Welcome Wishes',
    welcomeWishesSentTo: 'Welcome wishes sent to',
    meetingResponse: 'Meeting Response',
    respondToMeetingNotification: 'Respond to the meeting notification?',
    attend: 'Attend',
    notAttend: 'Not Attend',
    youHaveConfirmedAttendance: 'You have confirmed your attendance!',
    attendanceMarkedInSystem: 'Attendance has been marked in the system.',
    responseRecorded: 'Response Recorded',
    youIndicatedNotAttend: 'You have indicated you will not attend.',
    responseRecordedInSystem: 'Response has been recorded in the system.',
    yourResponseRecorded: 'Your response has been recorded!',
    noBirthdayWishAssociated: '(No birthday wish associated)',
    paymentNotification: 'Payment Notification',
    viewPaymentDetails: 'View payment details?',
    viewDetails: 'View Details',
    couldNotFindMemberId: 'Could not find your member ID. Please try again.',
    memberNotFound: 'Member Not Found',
    couldNotFindMemberIdFor: 'Could not find member ID for',
    pleaseTryAgainLater: 'Please try again later.',
    failedToSendBirthdayWish: 'Failed to send birthday wish. Please try again.',
    anErrorOccurred: 'An error occurred:',
    unknownError: 'Unknown error',
    failedToProcessBirthdayWish: 'Failed to process birthday wish request.',
    failedToProcessMeetingResponse: 'Failed to process meeting response.',
    unableToSendWish: 'Unable to Send Wish',
    couldNotIdentifyRecipient: 'Could not identify the recipient for this notification. The member information is missing from the notification content.',
    couldNotFindMember: 'Could not find the member. Please try again.',
    failedToProcessWishRequest: 'Failed to process wish request.',
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
    
    // Login Screen
    username: 'பயனர் பெயர்',
    password: 'கடவுச்சொல்',
    login: 'உள்நுழைய',
    rememberMe: 'என்னை நினைவில் வைத்துக் கொள்ளுங்கள்',
    forgotPassword: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா?',
    pleaseEnterCredentials: 'உங்கள் பயனர் பெயர் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.',
    authenticationFailed: 'அங்கீகாரம் தோல்வியடைந்தது. மீண்டும் முயற்சி செய்யவும்.',
    biometricLogin: 'உயிரியல் உள்நுழைவு',
    authenticateToAccess: 'அலைகலை அணுக அங்கீகரிக்கவும்',
    noSavedCredentials: 'சேமிக்கப்பட்ட சான்றுகள் இல்லை. கைமுறையாக உள்நுழையவும்.',
    
    // Settings Screen
    myDetails: 'என் விவரங்கள்',
    viewManageAccount: 'உங்கள் கணக்கு தகவலைப் பார்க்கவும் மற்றும் நிர்வகிக்கவும்',
    currentLanguage: 'தற்போதைய',
    updatePassword: 'உங்கள் கணக்கு கடவுச்சொல்லை புதுப்பிக்கவும்',
    languageChanged: 'மொழி மாற்றப்பட்டது',
    
    // Menu Items (Drawer)
    markAttendance: 'கலந்து கொள்ளுதல் குறிக்கவும்',
    
    // Report Types
    thanksNote: 'நன்றி குறிப்பு',
    oneToOneMeeting: '1:1 கூட்டம்',
    alaigalMeeting: 'அலைகல் கூட்டம்',
    visitor: 'பார்வையாளர்',
    payment: 'பணம்',
    referral: 'பரிந்துரை',
    
    // Messages Screen
    templates: 'வார்ப்புருக்கள்',
    compose: 'எழுது',
    selectTemplate: 'வார்ப்புரு தேர்ந்தெடுக்கவும்',
    composeMessage: 'செய்தி எழுது',
    selectMembers: 'உறுப்பினர்களைத் தேர்ந்தெடுக்கவும்',
    allMembers: 'அனைத்து உறுப்பினர்கள்',
    specificMembers: 'குறிப்பிட்ட உறுப்பினர்கள்',
    subject: 'பொருள்',
    content: 'உள்ளடக்கம்',
    messageType: 'செய்தி வகை',
    welcome: 'வரவேற்பு',
    paymentReminder: 'பணம் நினைவூட்டல்',
    event: 'நிகழ்வு',
    meeting: 'கூட்டம்',
    general: 'பொது',
    paymentMonth: 'பணம் மாதம்',
    paymentYear: 'பணம் ஆண்டு',
    eventDate: 'நிகழ்வு தேதி',
    selectDate: 'தேதி தேர்ந்தெடுக்கவும்',
    recipientType: 'பெறுநர் வகை',
    attachment: 'இணைப்பு',
    sendMessage: 'செய்தி அனுப்பு',
    totalMessages: 'மொத்த செய்திகள்',
    
    // Common Alerts
    confirmTitle: 'உறுதிப்படுத்து',
    warningTitle: 'எச்சரிக்கை',
    infoTitle: 'தகவல்',
    
    // Form Validation
    fieldRequired: 'இந்த புலம் தேவை',
    invalidEmail: 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்',
    invalidPhone: 'சரியான தொலைபேசி எண்ணை உள்ளிடவும்',
    passwordTooShort: 'கடவுச்சொல் குறைந்தது 6 எழுத்துகள் இருக்க வேண்டும்',
    
    // Status Messages
    operationSuccessful: 'செயல்பாடு வெற்றிகரமாக முடிந்தது',
    operationFailed: 'செயல்பாடு தோல்வியடைந்தது. மீண்டும் முயற்சி செய்யவும்.',
    dataLoaded: 'தரவு வெற்றிகரமாக ஏற்றப்பட்டது',
    dataLoadFailed: 'தரவு ஏற்றுவதில் தோல்வி',
    
    // Navigation
    goBack: 'திரும்பிச் செல்',
    next: 'அடுத்து',
    previous: 'முந்தைய',
    finish: 'முடிக்க',
    
    // File Operations
    selectFile: 'கோப்பு தேர்ந்தெடுக்கவும்',
    fileSelected: 'கோப்பு தேர்ந்தெடுக்கப்பட்டது',
    fileUploadSuccess: 'கோப்பு வெற்றிகரமாக பதிவேற்றப்பட்டது',
    fileUploadFailed: 'கோப்பு பதிவேற்றம் தோல்வியடைந்தது',
    
    // Search & Filter
    searchPlaceholder: 'தேடு...',
    filterBy: 'வடிகட்ட',
    sortBy: 'வரிசைப்படுத்து',
    noResults: 'முடிவுகள் இல்லை',
    clearFilter: 'வடிகட்டியை அழிக்கவும்',
    
    // Months
    january: 'ஜனவரி',
    february: 'பிப்ரவரி',
    march: 'மார்ச்',
    april: 'ஏப்ரல்',
    may: 'மே',
    june: 'ஜூன்',
    july: 'ஜூலை',
    august: 'ஆகஸ்ட்',
    september: 'செப்டம்பர்',
    october: 'அக்டோபர்',
    november: 'நவம்பர்',
    december: 'டிசம்பர்',
    
    // Dashboard & Member Management
    dashboard: 'டாஷ்போர்டு',
    memberDashboard: 'உறுப்பினர் டாஷ்போர்டு',
    userDashboard: 'பயனர் டாஷ்போர்டு',
    addNewMember: 'புதிய உறுப்பினர் சேர்க்கவும்',
    editMember: 'உறுப்பினர் திருத்தவும்',
    memberDetails: 'உறுப்பினர் விவரங்கள்',
    memberDirectory: 'உறுப்பினர் அடைவு',
    bulkImport: 'மொத்த இறக்குமதி',
    newMemberUpload: 'புதிய உறுப்பினர் பதிவேற்றம்',
    memberForm: 'உறுப்பினர் படிவம்',
    
    // Attendance
    attendanceReport: 'கலந்து கொள்ளுதல் அறிக்கை',
    attendanceUpload: 'கலந்து கொள்ளுதல் பதிவேற்றம்',
    markPresent: 'உள்ளவர் என குறிக்கவும்',
    markAbsent: 'இல்லாதவர் என குறிக்கவும்',
    selectAll: 'அனைத்தையும் தேர்ந்தெடுக்கவும்',
    deselectAll: 'அனைத்தையும் நீக்கவும்',
    
    // Payments & Fees
    feesManagement: 'கட்டணம் நிர்வாகம்',
    paymentHistory: 'பணம் வரலாறு',
    pendingPayments: 'நிலுவையில் உள்ள பணம்',
    paymentStatus: 'பணம் நிலை',
    dueDate: 'நிலுவை தேதி',
    amountDue: 'நிலுவை தொகை',
    paymentMethod: 'பணம் முறை',
    cash: 'பணம்',
    card: 'அட்டை',
    online: 'ஆன்லைன்',
    
    // Meetings & Events
    createMeeting: 'கூட்டம் உருவாக்கு',
    meetingDetails: 'கூட்டம் விவரங்கள்',
    meetingTime: 'கூட்டம் நேரம்',
    meetingLocation: 'கூட்டம் இடம்',
    attendees: 'கலந்துகொள்பவர்கள்',
    agenda: 'நிகழ்ச்சி நிரல்',
    
    // Notifications
    sendNotification: 'அறிவிப்பு அனுப்பு',
    notificationTitle: 'அறிவிப்பு தலைப்பு',
    notificationMessage: 'அறிவிப்பு செய்தி',
    sendToAll: 'அனைவருக்கும் அனுப்பு',
    sendToSelected: 'தேர்ந்தெடுக்கப்பட்டவர்களுக்கு அனுப்பு',
    
    // Profile & Account
    personalDetails: 'தனிப்பட்ட விவரங்கள்',
    contactDetails: 'தொடர்பு விவரங்கள்',
    emergencyContact: 'அவசர தொடர்பு',
    dateOfBirth: 'பிறந்த தேதி',
    joiningDate: 'சேர்ந்த தேதி',
    membershipType: 'உறுப்பினர் வகை',
    
    // Forms & Validation
    required: 'தேவை',
    optional: 'விருப்பம்',
    pleaseSelect: 'தயவுசெய்து தேர்ந்தெடுக்கவும்',
    pleaseEnter: 'தயவுசெய்து உள்ளிடவும்',
    invalidFormat: 'தவறான வடிவம்',
    fieldCannotBeEmpty: 'புலம் காலியாக இருக்க முடியாது',
    
    // Actions & Buttons
    add: 'சேர்க்க',
    modify: 'மாற்று',
    refresh: 'புதுப்பிக்க',
    reset: 'மீட்டமை',
    clear: 'அழிக்க',
    apply: 'பயன்படுத்து',
    confirm: 'உறுதிப்படுத்து',
    proceed: 'தொடர்க',
    continue: 'தொடர்க',
    skip: 'தவிர்க்க',
    
    // Status & States
    active: 'செயல்பாட்டில்',
    inactive: 'செயலற்ற',
    completed: 'முடிந்தது',
    inProgress: 'நடைபெற்று வருகிறது',
    cancelled: 'ரத்து செய்யப்பட்டது',
    approved: 'அங்கீகரிக்கப்பட்டது',
    rejected: 'நிராகரிக்கப்பட்டது',
    draft: 'வரைவு',
    
    // File Operations
    uploadFile: 'கோப்பு பதிவேற்றம்',
    downloadFile: 'கோப்பு பதிவிறக்கம்',
    selectImage: 'படம் தேர்ந்தெடுக்கவும்',
    takePhoto: 'புகைப்படம் எடுக்கவும்',
    chooseFromGallery: 'கேலரியில் இருந்து தேர்ந்தெடுக்கவும்',
    
    // Time & Date
    selectTime: 'நேரம் தேர்ந்தெடுக்கவும்',
    fromDate: 'தொடக்க தேதி',
    toDate: 'முடிவு தேதி',
    startDate: 'தொடக்க தேதி',
    endDate: 'முடிவு தேதி',
    
    // Search & Filter
    searchMembers: 'உறுப்பினர்களைத் தேடு',
    filterResults: 'முடிவுகளை வடிகட்ட',
    sortResults: 'முடிவுகளை வரிசைப்படுத்து',
    showAll: 'அனைத்தையும் காட்டு',
    
    // Inventory & Batches
    inventory: 'சரக்கு',
    addBatch: 'தொகுப்பு சேர்க்கவும்',
    batchDetails: 'தொகுப்பு விவரங்கள்',
    quantity: 'அளவு',
    description: 'விளக்கம்',
    
    // Reports & Analytics
    generateReport: 'அறிக்கை உருவாக்கு',
    exportReport: 'அறிக்கை ஏற்றுமதி',
    reportType: 'அறிக்கை வகை',
    dateRange: 'தேதி வரம்பு',
    
    // Slips & Documents
    tyfcbSlip: 'TYFCB சீட்டு',
    referralSlip: 'பரிந்துரை சீட்டு',
    oneToOneSlip: 'ஒன்றுக்கு ஒன்று சீட்டு',
    
    // Visitors
    visitorManagement: 'பார்வையாளர் நிர்வாகம்',
    visitorDetails: 'பார்வையாளர் விவரங்கள்',
    purpose: 'நோக்கம்',
    visitDate: 'வருகை தேதி',
    
    // CEU & Feed
    myCEUs: 'என் CEU',
    myFeed: 'என் ஊட்ட',
    feedUpdates: 'ஊட்ட புதுப்பிப்புகள்',
    
    // Biometric
    biometricReport: 'உயிரியல் அறிக்கை',
    fingerprint: 'கைரேகை',
    faceRecognition: 'முக அடையாளம்',
    
    // Excel & Data
    excelViewer: 'Excel பார்வையாளர்',
    dataImport: 'தரவு இறக்குமதி',
    dataExport: 'தரவு ஏற்றுமதி',
    
    // Password & Security
    currentPassword: 'தற்போதைய கடவுச்சொல்',
    newPassword: 'புதிய கடவுச்சொல்',
    confirmPassword: 'கடவுச்சொல்லை உறுதிப்படுத்து',
    forgotPassword: 'கடவுச்சொல்லை மறந்துவிட்டீர்களா',
    resetPassword: 'கடவுச்சொல்லை மீட்டமை',
    passwordChanged: 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது',
    
    // Common Messages
    operationCompleted: 'செயல்பாடு முடிந்தது',
    dataUpdated: 'தரவு புதுப்பிக்கப்பட்டது',
    recordSaved: 'பதிவு சேமிக்கப்பட்டது',
    recordDeleted: 'பதிவு நீக்கப்பட்டது',
    noRecordsFound: 'பதிவுகள் இல்லை',
    loadingData: 'தரவு ஏற்றுகிறது...',
    savingData: 'தரவு சேமிக்கிறது...',
    processingRequest: 'கோரிக்கையை செயல்படுத்துகிறது...',
    
    // Settings Screen Additional
    role: 'பதவி',
    interfaceMode: 'இடைமுக முறை',
    userMode: 'பயனர் முறை',
    adminMode: 'நிர்வாக முறை',
    switchInterfaceMode: 'இடைமுக முறையை மாற்று',
    chooseInterfaceMode: 'உங்கள் இடைமுக முறையைத் தேர்ந்தெடுக்கவும்:',
    restartNow: 'இப்போது மறுதொடக்கம்',
    later: 'பின்னர்',
    restartAppToSeeChanges: 'மாற்றங்களைப் பார்க்க பயன்பாட்டை மறுதொடக்கம் செய்யவும்',
    updateProfileInfo: 'உங்கள் சுயவிவர தகவலை புதுப்பிக்கவும்',
    readPrivacyPolicy: 'எங்கள் தனியுரிமைக் கொள்கை மற்றும் விதிமுறைகளைப் படிக்கவும்',
    privacyPolicyContent: 'தனியுரிமைக் கொள்கை மற்றும் சேவை விதிமுறைகள்\n\n• உங்கள் தரவு எங்களுடன் பாதுகாப்பானது\n• நாங்கள் உங்கள் தனியுரிமையை மதிக்கிறோம்\n• விதிமுறைகள் மற்றும் நிபந்தனைகள் பொருந்தும்\n• மேலும் தகவலுக்கு ஆதரவைத் தொடர்பு கொள்ளவும்',
    
    // Additional Common Terms
    administrator: 'நிர்வாகி',
    user: 'பயனர்',
    member: 'உறுப்பினர்',
    accountSettings: 'கணக்கு அமைப்புகள்',
    appInfo: 'பயன்பாட்டு தகவல்',
    version: 'பதிப்பு',
    professionalNetworking: 'தொழில்முறை நெட்வொர்க்கிங் தளம்',
    
    // Time Periods
    daily: 'தினசரி',
    weekly: 'வாராந்திர',
    monthly: 'மாதாந்திர',
    yearly: 'ஆண்டுதோறும்',
    
    // Report Terms
    totalMembers: 'மொத்த உறுப்பினர்கள்',
    presentCount: 'உள்ளவர்கள்',
    absentCount: 'இல்லாதவர்கள்',
    attendancePercentage: 'கலந்து கொள்ளுதல் %',
    
    // Excel Viewer
    excelViewer: 'Excel பார்வையாளர்',
    uploadExcelFile: 'Excel கோப்பு பதிவேற்றவும்',
    chooseExcelFile: 'Excel கோப்பு தேர்ந்தெடுக்கவும்',
    supportedExcelFormats: 'ஆதரிக்கப்படும்: .xls, .xlsx கோப்புகள் வரிசை 1 இல் இருந்து தரவுடன்',
    noSheetsFound: 'Excel கோப்பில் தாள்கள் இல்லை',
    noDataFoundInExcel: 'Excel கோப்பில் தரவு இல்லை. வரிசை 1 இல் இருந்து தரவு இருப்பதை உறுதிப்படுத்தவும்.',
    noColumnsFound: 'Excel கோப்பில் நெடுவரிசைகள் இல்லை',
    loadedRows: '{{count}} வரிசைகள் ஏற்றப்பட்டன',
    columnsCount: '{{count}} நெடுவரிசைகள்',
    columns: 'நெடுவரிசைகள்',
    failedToUploadExcel: 'Excel கோப்பு பதிவேற்றம் தோல்வியடைந்தது',
    makeSureExcelFile: 'உறுதிப்படுத்தவும்',
    fileIsExcelFormat: 'கோப்பு .xls அல்லது .xlsx',
    fileHasDataInFirstSheet: 'முதல் தாளில் தரவு உள்ளது',
    dataStartsFromRow1: 'தரவு வரிசை 1 இல் இருந்து தொடங்குகிறது',
    file: 'கோப்பு',
    rows: 'வரிசைகள்',
    filtered: 'வடிகட்டப்பட்ட',
    cardView: 'அட்டை பார்வை',
    tableView: 'அட்டவணை பார்வை (முதல் 20 வரிசைகள்)',
    searchInAllColumns: 'அனைத்து நெடுவரிசைகளிலும் தேடு...',
    noRowsFound: 'வரிசைகள் இல்லை',
    rowDetails: 'வரிசை #{{id}} விவரங்கள்',
    noFileUploaded: 'கோப்பு பதிவேற்றப்படவில்லை',
    uploadExcelFileToView: 'அதன் உள்ளடக்கத்தைப் பார்க்க Excel கோப்பை பதிவேற்றவும்',
    noDataFound: 'தரவு கிடைக்கவில்லை',
    fileUploadedButNoData: 'கோப்பு பதிவேற்றப்பட்டது ஆனால் தரவு இல்லை. உங்கள் Excel கோப்பில் வரிசை 1 இல் இருந்து தரவு இருப்பதை உறுதிப்படுத்தவும்.',
    dataView: 'தரவு பார்வை',
    showingRowsOf: '{{total}} இல் {{filtered}} வரிசைகள் காட்டப்படுகின்றன',
    andMoreRows: '... மற்றும் {{count}} மேலும் வரிசைகள் (விவரங்களுக்கு மேலே உள்ள வரிசைகளைக் கிளிக் செய்யவும்)',
    
    // Visitor/CEU Form
    country: 'நாடு',
    region: 'பகுதி',
    chapter: 'அத்தியாயம்',
    chapterDetails: 'அத்தியாய விவரங்கள்',
    personalDetails: 'தனிப்பட்ட விவரங்கள்',
    languageDetails: 'மொழி விவரங்கள்',
    contactDetails: 'தொடர்பு விவரங்கள்',
    addressDetails: 'முகவரி விவரங்கள்',
    title: 'தலைப்பு',
    company: 'நிறுவனம்',
    telephone: 'தொலைபேசி',
    visitorEmail: 'பார்வையாளர் மின்னஞ்சல்',
    county: 'மாவட்டம்',
    city: 'நகரம்',
    state: 'மாநிலம்',
    postCode: 'அஞ்சல் குறியீடு',
    confirmDetails: 'விவரங்களை உறுதிப்படுத்து',
    englishLanguage: 'ஆங்கில மொழி',
    tamilLanguage: 'தமிழ் மொழி',
    
    // Change Password Screen
    validationError: 'சரிபார்ப்பு பிழை',
    currentPasswordRequired: 'தற்போதைய கடவுச்சொல் தேவை',
    newPasswordRequired: 'புதிய கடவுச்சொல் தேவை',
    passwordsDoNotMatch: 'கடவுச்சொற்கள் பொருந்தவில்லை',
    newPasswordMustBeDifferent: 'புதிய கடவுச்சொல் வேறுபட்டதாக இருக்க வேண்டும்',
    userSessionNotFound: 'பயனர் அமர்வு கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்.',
    passwordChangedSuccessfully: 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது! உங்கள் புதிய கடவுச்சொல்லுடன் உள்நுழையவும்.',
    failedToChangePassword: 'கடவுச்சொல்லை மாற்றுவதில் தோல்வி',
    defaultPasswordInfo: 'உங்கள் இயல்புநிலை கடவுச்சொல் உங்கள் மொபைல் எண். தயவுசெய்து அதை பாதுகாப்பான கடவுச்சொல்லாக மாற்றவும்.',
    enterCurrentPassword: 'தற்போதைய கடவுச்சொல்',
    enterNewPasswordMin6: 'புதிய கடவுச்சொல் (குறைந்தது 6)',
    reEnterNewPassword: 'கடவுச்சொல் மீண்டும்',
    passwordRequirements: 'கடவுச்சொல் தேவைகள்',
    atLeast6Characters: 'குறைந்தது 6 எழுத்துகள்',
    passwordsMatch: 'கடவுச்சொற்கள் பொருந்துகின்றன',
    differentFromCurrentPassword: 'தற்போதைய கடவுச்சொல்லிலிருந்து வேறுபட்டது',
    
    // Profile Screen
    phoneNumberMustBe10Digits: 'தொலைபேசி எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும்.',
    contactNumberMustBe10Digits: 'தொடர்பு எண் சரியாக 10 இலக்கங்களாக இருக்க வேண்டும்.',
    memberIdNotFound: 'உறுப்பினர் அடையாளம் கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்.',
    profileUpdatedSuccessfully: 'சுயவிவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது!',
    failedToUpdateProfile: 'சுயவிவரத்தை புதுப்பிக்க முடியவில்லை',
    unknownError: 'அறியப்படாத பிழை',
    failedToUpdateProfileTryAgain: 'சுயவிவரத்தை புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
    errorOccurredUpdatingProfile: 'சுயவிவரத்தை புதுப்பிக்கும்போது பிழை ஏற்பட்டது.',
    permissionMediaLibraryRequired: 'மீடியா லைப்ரரியை அணுக அனுமति தேவை!',
    removePhoto: 'புகைப்படத்தை நீக்கு',
    areYouSureRemovePhoto: 'உங்கள் சுயவிவர புகைப்படத்தை நீக்க விரும்புகிறீர்களா?',
    remove: 'நீக்கு',
    profilePhoto: 'சுயவிவர புகைப்படம்',
    chooseAnOption: 'ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்',
    changePhoto: 'புகைப்படத்தை மாற்று',
    removePhoto: 'புகைப்படத்தை நீக்கு',
    inputCannotExceed10Digits: 'உள்ளீடு 10 இலக்கங்களை மீற முடியாது.',
    loadingProfile: 'சுயவிவரம் ஏற்றுகிறது...',
    tapToChangeLongPressToView: 'மாற்ற தட்டவும் • பார்க்க நீண்ட நேரம் அழுத்தவும்',
    personal: 'தனிப்பட்ட',
    professional: 'தொழில்முறை',
    contactNumber: 'தொடர்பு எண்',
    memberID: 'உறுப்பினர் அடையாளம்',
    joinDate: 'சேர்ந்த தேதி',
    saveChanges: 'மாற்றங்களைச் சேமி',
    setProfilePicture: 'சுயவிவர படத்தை அமைக்கவும்',
    
    // Status values
    completed: 'முடிந்தது',
    
    // UserDashboard specific translations
    welcomeToAlaigal: 'அலைகலுக்கு வரவேற்கிறோம்',
    checkingBirthdayWishes: 'பிறந்தநாள் வாழ்த்துகளை சரிபார்க்கிறது...',
    birthdayWishReceived: 'பிறந்தநாள் வாழ்த்து பெறப்பட்டது!',
    sentYouBirthdayWishes: 'இன்று உங்களுக்கு பிறந்தநாள் வாழ்த்துகள் அனுப்பினார்!',
    loadingYourDashboard: 'உங்கள் டாஷ்போர்டை ஏற்றுகிறது...',
    recentNotifications: 'சமீபத்திய அறிவிப்புகள்',
    viewAll: 'அனைத்தையும் பார்க்க',
    tapToRespond: 'பதிலளிக்க தட்டவும்',
    tapToView: 'பார்க்க தட்டவும்',
    myActivity: 'என் செயல்பாடு',
    allTime: 'எல்லா நேரமும்',
    weekly: 'வாராந்திர',
    monthly: 'மாதாந்திர',
    annual: 'ஆண்டுதோறும்',
    showingDataFor: 'தரவு காட்டப்படுகிறது:',
    referralsGiven: 'வழங்கிய பரிந்துரைகள்',
    referralsReceived: 'பெற்ற பரிந்துரைகள்',
    thanksNoteGiven: 'வழங்கிய நன்றி குறிப்பு',
    thanksNoteReceived: 'பெற்ற நன்றி குறிப்பு',
    businessVisits: 'வணிக வருகைகள்',
    businessesVisited: 'வருகை தந்த வணிகங்கள்',
    connectWithMembers: 'உறுப்பினர்களுடன் இணைந்து, பரிந்துரைகள் வழங்கி, எங்கள் தொழில்முறை நெட்வொர்க்கில் உங்கள் வணிகத்தை வளர்க்கவும்.',
    memberIdNotAssigned: 'உறுப்பினர் அடையாளம்: ஒதுக்கப்படவில்லை',
    currentlyViewing: 'தற்போது பார்க்கிறது:',
    statistics: 'புள்ளிவிவரங்கள்',
    memberDetails: 'உறுப்பினர் விவரங்கள்',
    alaigalNetworkMember: 'அலைகல் நெட்வொர்க் உறுப்பினர்',
    twoFactorAuthentication: 'இரு-காரணி அங்கீகாரம்',
    disabled: 'முடக்கப்பட்டது',
    loginNotifications: 'உள்நுழைவு அறிவிப்புகள்',
    logout: 'வெளியேறு',
    areYouSureLogout: 'நீங்கள் வெளியேற விரும்புகிறீர்களா?',
    sendBirthdayWishes: 'பிறந்தநாள் வாழ்த்துகள் அனுப்பு',
    sendBirthdayWishesTo: 'பிறந்தநாள் வாழ்த்துகள் அனுப்பு',
    birthdayWishesSentTo: 'பிறந்தநாள் வாழ்த்துகள் அனுப்பப்பட்டது',
    sendWelcomeWishes: 'வரவேற்பு வாழ்த்துகள் அனுப்பு',
    welcomeWishesSentTo: 'வரவேற்பு வாழ்த்துகள் அனுப்பப்பட்டது',
    meetingResponse: 'கூட்டம் பதில்',
    respondToMeetingNotification: 'கூட்ட அறிவிப்புக்கு பதிலளிக்கவா?',
    attend: 'கலந்துகொள்',
    notAttend: 'கலந்துகொள்ளாதே',
    youHaveConfirmedAttendance: 'நீங்கள் உங்கள் வருகையை உறுதிப்படுத்தியுள்ளீர்கள்!',
    attendanceMarkedInSystem: 'கலந்துகொள்ளுதல் அமைப்பில் குறிக்கப்பட்டுள்ளது.',
    responseRecorded: 'பதில் பதிவு செய்யப்பட்டது',
    youIndicatedNotAttend: 'நீங்கள் கலந்துகொள்ள மாட்டீர்கள் என்று குறிப்பிட்டுள்ளீர்கள்.',
    responseRecordedInSystem: 'பதில் அமைப்பில் பதிவு செய்யப்பட்டுள்ளது.',
    yourResponseRecorded: 'உங்கள் பதில் பதிவு செய்யப்பட்டுள்ளது!',
    noBirthdayWishAssociated: '(பிறந்தநாள் வாழ்த்து தொடர்புடையது இல்லை)',
    paymentNotification: 'பணம் அறிவிப்பு',
    viewPaymentDetails: 'பணம் விவரங்களைப் பார்க்கவா?',
    viewDetails: 'விவரங்களைப் பார்க்க',
    couldNotFindMemberId: 'உங்கள் உறுப்பினர் அடையாளத்தைக் கண்டுபிடிக்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
    memberNotFound: 'உறுப்பினர் கிடைக்கவில்லை',
    couldNotFindMemberIdFor: 'உறுப்பினர் அடையாளத்தைக் கண்டுபிடிக்க முடியவில்லை',
    pleaseTryAgainLater: 'பின்னர் மீண்டும் முயற்சி செய்யவும்.',
    failedToSendBirthdayWish: 'பிறந்தநாள் வாழ்த்து அனுப்புவதில் தோல்வி. மீண்டும் முயற்சி செய்யவும்.',
    anErrorOccurred: 'ஒரு பிழை ஏற்பட்டது:',
    unknownError: 'அறியப்படாத பிழை',
    failedToProcessBirthdayWish: 'பிறந்தநாள் வாழ்த்து கோரிக்கையை செயல்படுத்துவதில் தோல்வி.',
    failedToProcessMeetingResponse: 'கூட்ட பதிலை செயல்படுத்துவதில் தோல்வி.',
    unableToSendWish: 'வாழ்த்து அனுப்ப முடியவில்லை',
    couldNotIdentifyRecipient: 'இந்த அறிவிப்புக்கான பெறுநரை அடையாளம் காண முடியவில்லை. அறிவிப்பு உள்ளடக்கத்தில் உறுப்பினர் தகவல் இல்லை.',
    couldNotFindMember: 'உறுப்பினரைக் கண்டுபிடிக்க முடியவில்லை. மீண்டும் முயற்சி செய்யவும்.',
    failedToProcessWishRequest: 'வாழ்த்து கோரிக்கையை செயல்படுத்துவதில் தோல்வி.',
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
    if (!key) return '';
    return translations[language]?.[key] || translations['en']?.[key] || key;
  };

  // Provide a safe context value even during loading
  const contextValue = {
    language,
    changeLanguage,
    t,
    isLoading
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  
  // Provide safe defaults if context is not fully initialized
  return {
    language: context.language || 'en',
    changeLanguage: context.changeLanguage || (() => {}),
    t: context.t || ((key) => key),
    isLoading: context.isLoading || false
  };
};
