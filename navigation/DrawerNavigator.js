import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import CustomDrawerContent from '../components/CustomDrawerContent'; 
import InventoryForm from '../screens/InventoryForm';
import AttendanceScreen from '../screens/AttendanceScreen';
import AttendanceUploadScreen from '../screens/AttendanceUploadScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import ExcelViewerScreen from '../screens/ExcelViewerScreen';
import BiometricReport from '../screens/BiometricReport';
import Profile from '../screens/Profile';
import ChangePassword from '../screens/ChangePassword';
import NewMember from '../screens/NewMember';
import NewMemberUploadScreen from '../screens/NewMemberUploadScreen';
import BulkMemberImport from '../screens/BulkMemberImport';
import MemberDashboard from '../screens/MemberDashboard';
import MembersList from '../screens/MembersList';
import MemberDetails from '../screens/MemberDetails';
import MemberListUploadScreen from '../screens/MemberListUploadScreen';
import MemberFormScreen from '../screens/MemberFormScreen';
import PaymentDetails from '../screens/PaymentDetails';
import FeesManagement from '../screens/FeesManagement';
import Reports from '../screens/Reports';
import Messages from '../screens/Messages';
import TakePayment from '../screens/TakePayment';
import SendNotice from '../screens/SendNotice';
import GenerateReport from '../screens/GenerateReport';
import AddBatch from '../screens/AddBatch';
import ReferralReports from '../screens/ReferralReports';
import AdminNotificationsScreen from '../screens/AdminNotificationsScreen';
import Visitors from '../screens/Visitors';
import SettingsScreen from '../screens/SettingsScreen';

const Drawer = createDrawerNavigator();

const DrawerNavigator = ({ route }) => {
  const initialDrawerScreen = route.params?.screen || 'MemberDashboard';

  return (
    <Drawer.Navigator
      initialRouteName={initialDrawerScreen}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        // Remove header completely from all screens
        headerShown: false,
        
        // Disable swipe gesture to open drawer
        swipeEnabled: false,
        
        drawerStyle: {
          backgroundColor: '#F8F9FA',
          width: 280,
        },
      }}
    >
      <Drawer.Screen 
        name="MemberDashboard" 
        component={MemberDashboard}
      />
      <Drawer.Screen name="InventoryForm" component={InventoryForm} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
      <Drawer.Screen name="AttendanceUpload" component={AttendanceUploadScreen} />
      <Drawer.Screen name="AttendanceReport" component={AttendanceReportScreen} />
      <Drawer.Screen name="ExcelViewer" component={ExcelViewerScreen} />
      <Drawer.Screen name="MemberListUpload" component={MemberListUploadScreen} />
      <Drawer.Screen name="MemberForm" component={MemberFormScreen} />
      <Drawer.Screen name="NewMemberUpload" component={NewMemberUploadScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="NewMember" component={NewMember} />
      <Drawer.Screen name="BulkMemberImport" component={BulkMemberImport} />
      <Drawer.Screen name="BiometricReport" component={BiometricReport} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="ChangePassword" component={ChangePassword} />
      <Drawer.Screen name="MembersList" component={MembersList} />
      <Drawer.Screen name="MemberDetails" component={MemberDetails} />
      <Drawer.Screen name="PaymentDetails" component={PaymentDetails} />
      <Drawer.Screen name="FeesManagement" component={FeesManagement} />
      <Drawer.Screen name="Reports" component={Reports} />
      <Drawer.Screen name="Messages" component={Messages} />
      <Drawer.Screen name="TakePayment" component={TakePayment} />
      <Drawer.Screen name="SendNotice" component={SendNotice} />
      <Drawer.Screen name="GenerateReport" component={GenerateReport} />
      <Drawer.Screen name="AddBatch" component={AddBatch} />
      <Drawer.Screen name="ReferralReports" component={ReferralReports} />
      <Drawer.Screen name="AdminNotificationsScreen" component={AdminNotificationsScreen} />
      <Drawer.Screen name="Visitors" component={Visitors} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;