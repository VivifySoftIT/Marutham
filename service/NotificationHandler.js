import * as Notifications from "expo-notifications";
import DailyVideos from '../screens/DailyVideos';
class NotificationHandler {
  static notificationListener = null;
  static responseListener = null;

  static init(navigation) {
    // Configure how notifications should be handled when received
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Listen for notifications received while the app is in the foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification Received:", notification);
      }
    );

    // Handle notification clicks
    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification Clicked:", response);
        const data = response.notification.request.content.data;

        if (data && data.screen) {
            setTimeout(() => {
                navigation.navigate("AppDrawer", { screen: data.screen });
              }, 500);
        }
      });
  }

  static removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default NotificationHandler;
