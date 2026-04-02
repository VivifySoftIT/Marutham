import { StyleSheet, StatusBar, Dimensions } from 'react-native';
import theme from './theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgLight,
    paddingTop: StatusBar.currentHeight || 28,
  },
  drawerBackground: {
    backgroundColor: theme.bgLight,
    flex: 1,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderColor: theme.gold,
    borderWidth: 2,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.white,
    marginBottom: 4,
  },
  profileDesignation: {
    fontSize: 14,
    color: theme.goldLight,
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
    color: theme.primary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: -10,
  },
  menuButton: {
    paddingLeft: 15,
  },
  homeButton: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: theme.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeButtonIcon: {
    color: theme.white,
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    backgroundColor: theme.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    color: theme.white,
  },
  headerContainer: {
    backgroundColor: theme.primary,
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.white,
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
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: theme.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.white,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.primaryLightest,
  },
  modalIcon: {
    marginRight: 15,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.primaryLightest,
    borderRadius: 6,
    padding: 4,
  },
  modalItemText: {
    fontSize: 16,
    color: theme.textDark,
    fontWeight: '500',
    flex: 1,
  },
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
    backgroundColor: theme.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeDrawerItem: {
    backgroundColor: theme.primary,
    borderRadius: 8,
  },
  activeDrawerLabel: {
    color: theme.white,
  },
  activeDrawerIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  drawerSeparator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 4,
    marginHorizontal: 20,
  },
  versionContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    marginTop: 'auto',
  },
  versionText: {
    fontSize: 12,
    color: theme.textGray,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default styles;
