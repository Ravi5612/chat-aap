import notifee, { AndroidImportance, AndroidCategory, EventType } from '@notifee/react-native';
import { Alert } from 'react-native';

export const displayIncomingCall = async (callerName: string, channelName: string, callerAvatar?: string) => {
  const channelId = await notifee.createChannel({
    id: 'incoming_calls',
    name: 'Incoming Calls',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.displayNotification({
    id: 'incoming_call',
    title: 'Incoming Call',
    body: `Ringing ${callerName}...`,
    android: {
      channelId,
      category: AndroidCategory.CALL,
      importance: AndroidImportance.HIGH,
      fullScreenAction: {
        id: 'default',
      },
      pressAction: {
        id: 'default',
      },
      actions: [
        {
          title: 'Accept',
          pressAction: { id: 'answer' },
        },
        {
          title: 'Deny',
          pressAction: { id: 'reject' },
        },
      ],
    },
  });
};

export const displayOutgoingCall = async (friendName: string, status: 'Calling...' | 'Ringing...' | string = 'Calling...', friendAvatar?: string) => {
  try {
    const channelId = await notifee.createChannel({
      id: 'outgoing_calls',
      name: 'Outgoing Calls',
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.displayNotification({
      id: 'outgoing_call',
      title: status,
      body: `Calling ${friendName}`,
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Cut',
            pressAction: { id: 'end_call' },
          }
        ]
      },
    });
  } catch (error: any) {
    console.error("Failed to display outgoing call notification:", error);
  }
};

export const cancelOutgoingCall = async () => {
  try {
    await notifee.cancelNotification('outgoing_call');
  } catch (error) {
    console.error("Failed to cancel outgoing call:", error);
  }
};

export const cancelIncomingCall = async () => {
  try {
    await notifee.cancelNotification('incoming_call');
  } catch (error) {
    console.error("Failed to cancel incoming call:", error);
  }
};

export const displayMessageNotification = async (senderName: string, messageBody: string, senderAvatar?: string) => {
  try {
    const channelId = await notifee.createChannel({
      id: 'messages',
      name: 'Messages',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: `Message from ${senderName}`,
      body: messageBody,
      android: {
        channelId,
        pressAction: {
          id: 'default',
        },
      },
    });
  } catch (error) {
    console.error("Failed to display message notification:", error);
  }
};
