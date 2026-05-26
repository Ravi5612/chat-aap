import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';

const { width, height } = Dimensions.get('window');

export const CallOverlay = () => {
  const [incomingCall, setIncomingCall] = useState<{ callerName: string, channelName: string } | null>(null);

  useEffect(() => {
    // Listen to Notifee events (like pressing Answer or Reject)
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'answer') {
          // Handle Answer
          setIncomingCall(null);
          // Navigate to Call Room or handle WebRTC
        } else if (detail.pressAction?.id === 'reject') {
          // Handle Reject
          setIncomingCall(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!incomingCall) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.callerName}>{incomingCall.callerName}</Text>
      <Text style={styles.subtitle}>is calling...</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.rejectButton]} 
          onPress={() => setIncomingCall(null)}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.answerButton]}
          onPress={() => {
            setIncomingCall(null);
            // Handle accept logic here
          }}
        >
          <Text style={styles.buttonText}>Answer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1E1E1E',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ android: { elevation: 9999 } })
  },
  callerName: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#CCCCCC',
    marginBottom: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
    position: 'absolute',
    bottom: 100,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  answerButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
