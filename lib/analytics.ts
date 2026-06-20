import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

class AnalyticsService {
    async logEvent(eventName: string, params: Record<string, any> = {}) {
        try {
            await analytics().logEvent(eventName, params);
            console.log(`[Analytics] Logged event: ${eventName}`, params);
        } catch (error) {
            console.error('[Analytics] Failed to log event', error);
        }
    }

    async logScreenView(screenName: string, screenClass: string = 'Screen') {
        try {
            await analytics().logScreenView({
                screen_name: screenName,
                screen_class: screenClass,
            });
            console.log(`[Analytics] Screen view: ${screenName}`);
        } catch (error) {
            console.error('[Analytics] Failed to log screen view', error);
        }
    }

    async setUserId(userId: string | null) {
        try {
            await analytics().setUserId(userId);
            // Also link crashes to this user ID
            if (userId) {
                await crashlytics().setUserId(userId);
            }
            console.log(`[Analytics] Set user ID: ${userId}`);
        } catch (error) {
            console.error('[Analytics] Failed to set user ID', error);
        }
    }

    async setUserProperty(name: string, value: string) {
        try {
            await analytics().setUserProperty(name, value);
        } catch (error) {
            console.error('[Analytics] Failed to set user property', error);
        }
    }

    logError(error: Error, isFatal: boolean = false) {
        try {
            if (isFatal) {
                crashlytics().recordError(error);
            } else {
                crashlytics().recordError(error, 'Non-fatal');
            }
            console.log(`[Crashlytics] Recorded error: ${error.message}`);
        } catch (e) {
            console.error('[Crashlytics] Failed to record error', e);
        }
    }
}

export const AppAnalytics = new AnalyticsService();
