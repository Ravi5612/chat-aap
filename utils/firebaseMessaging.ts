import messaging from '@react-native-firebase/messaging';
import { displayIncomingCall, displayMessageNotification } from '../utils/notifeeCalling';

// This must be called as early as possible in your application lifecycle.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage.data?.type === 'call_signal') {
    const callerName = remoteMessage.data?.callerName || 'Someone';
    const channelName = remoteMessage.data?.channelName || '';
    
    // Trigger Notifee Full-Screen Intent
    await displayIncomingCall(callerName as string, channelName as string);
  } else if (remoteMessage.data?.type === 'message') {
    const title = remoteMessage.data?.title || 'New Message';
    const body = remoteMessage.data?.body || 'You have a new message';
    
    // Check if we can extract sender name from title (e.g., "Ravi in Group" -> "Ravi")
    const senderName = title;
    
    await displayMessageNotification(senderName as string, body as string);
  }
});
