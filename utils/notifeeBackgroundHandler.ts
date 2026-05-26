import notifee, { EventType } from '@notifee/react-native';
import { supabase } from '@/lib/supabase';
import { cancelOutgoingCall } from './notifeeCalling';

// This file must be imported in the entry point of your app (e.g., app/_layout.tsx)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  console.log('[NOTIFEE_BACKGROUND] Received event:', type, pressAction?.id);

  if (type === EventType.ACTION_PRESS) {
    if (pressAction?.id === 'answer') {
      // The user pressed the "Accept" button for an incoming call.
      // Notifee should launch the app because we can't fully handle the Agora WebRTC logic in the background cleanly.
      // But we can clear the notification.
      console.log('[NOTIFEE_BACKGROUND] User accepted call from background');
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
      
      // If we need to explicitly wake up the app or start intent, you can use Linking or fullScreenAction.
      // Notifee's `fullScreenAction` usually handles waking the app.
    } 
    
    else if (pressAction?.id === 'reject') {
      // The user pressed the "Deny" button for an incoming call.
      console.log('[NOTIFEE_BACKGROUND] User rejected call');
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
      
      const { useCallStore } = require('@/store/useCallStore');
      const session = useCallStore.getState().callSession;
      if (session?.friend?.id) {
          const targetId = session.friend.id;
          const channel = supabase.channel(`calls-signal-${targetId}`);
          channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await channel.send({
                      type: 'broadcast',
                      event: 'signal',
                      payload: { type: 'rejected' }
                  });
                  setTimeout(() => supabase.removeChannel(channel), 1000);
              }
          });
      }
      useCallStore.getState().setCallEnded('Call declined');
    }

    else if (pressAction?.id === 'end_call') {
      // The user pressed the "Cut" button for an outgoing call.
      console.log('[NOTIFEE_BACKGROUND] User ended outgoing call');
      await cancelOutgoingCall();
      
      const { useCallStore } = require('@/store/useCallStore');
      const session = useCallStore.getState().callSession;
      if (session?.friend?.id) {
          const targetId = session.friend.id;
          const endType = session.status === 'incoming' ? 'rejected' : 'end';
          const channel = supabase.channel(`calls-signal-${targetId}`);
          channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await channel.send({
                      type: 'broadcast',
                      event: 'signal',
                      payload: { type: endType }
                  });
                  setTimeout(() => supabase.removeChannel(channel), 1000);
              }
          });
      }
      useCallStore.getState().endCall();
    }
  }

  // Remove message notifications when pressed
  if (type === EventType.PRESS) {
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
  }
});
