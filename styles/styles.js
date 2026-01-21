import { StyleSheet, StatusBar, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: StatusBar.currentHeight || 28,
  },
  drawerBackground: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#212c62',
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderColor: 'white',
    borderWidth: 2,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  customDrawerItemContainer: {
    backgroundColor: 'transparent',
    marginVertical: 2,
    marginHorizontal: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  drawerItemLabel: {
    color: '#212c62',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: -10,
  },
  menuButton: {
    paddingLeft: 15,
  },
  // Home button with blue background and white icon
  homeButton: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: '#212c62',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonIcon: {
    color: 'white', // White home icon
  },
  // Back button with blue background and white icon
  backButton: {
    marginRight: 15,
    padding: 8,
    backgroundColor: '#212c62',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: 'white', // White back icon
  },
  // Header container with blue background
  headerContainer: {
    backgroundColor: '#212c62',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  // Header title with white color
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#212c62',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white', // Changed to white for modal title
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  modalIcon: {
    marginRight: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFF2FF',
    borderRadius: 6,
    padding: 4,
  },
  modalItemText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500',
    flex: 1,
  },
  // Additional styles for better drawer items
  drawerItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  drawerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeDrawerItem: {
    backgroundColor: '#212c62',
    borderRadius: 8,
  },
  activeDrawerLabel: {
    color: 'white',
  },
  activeDrawerIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Separator style for drawer items
  drawerSeparator: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: 4,
    marginHorizontal: 20,
  },
  // Version text at bottom
  versionContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    marginTop: 'auto',
  },
  versionText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default styles;