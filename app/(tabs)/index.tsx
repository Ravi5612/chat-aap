import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0F172A', dark: '#020617' }}
      headerImage={
        <ThemedView style={styles.headerContainer}>
          <ThemedText style={styles.headerEmoji}>⚔️</ThemedText>
          <ThemedText style={styles.headerTitle}>CHAT WARRIORS</ThemedText>
        </ThemedView>
      }>
      <ThemedView className="flex-row items-center gap-2 p-4 bg-slate-900 rounded-xl mx-4 mt-4">
        <ThemedText type="title" className="text-sky-400">Welcome, Warrior!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Phase 1: Your Mission</ThemedText>
        <ThemedText>
          Your Expo project is now fully deployed. To begin your journey, edit{' '}
          <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> and start building your legend.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Phase 2: Tactical Tools</ThemedText>
        <ThemedText>
          Open developer tools by pressing{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to debug and optimize your combat performance.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Phase 3: The Arena</ThemedText>
        <ThemedText>
          Check the <ThemedText type="defaultSemiBold">Explore</ThemedText> tab to discover pre-built components and libraries at your disposal.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  headerContainer: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  headerEmoji: {
    fontSize: 64,
  },
  headerTitle: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 10,
  },
});
