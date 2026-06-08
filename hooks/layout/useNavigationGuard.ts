import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/useAuthStore';

export const useNavigationGuard = (segments: string[], isMounted: boolean, rootNavigationKey: string | undefined) => {
    const router = useRouter();
    const { session, initializing, profile, isRegistering } = useAuthStore();

    useEffect(() => {
        if (initializing || !isMounted || !rootNavigationKey || isRegistering) return;

        const inAuthGroup = (segments as string[]).includes('login') || (segments as string[]).includes('signup') || (segments as string[]).includes('forgot-password') || (segments as string[]).includes('reset-password');
        const isSetupProfile = (segments as string[]).includes('setup-profile');

        if (session) {
            const currentProfile = useAuthStore.getState().profile;

            if (inAuthGroup) {
                router.replace('/(tabs)');
            }

            // If profile is loaded and they don't have a username, force them to setup-profile
            if (currentProfile && !currentProfile.username && !isSetupProfile && !inAuthGroup) {
                router.replace('/setup-profile');
            }
        } else if (!inAuthGroup) {
            router.replace('/login');
        }
    }, [session, initializing, segments, isMounted, rootNavigationKey, profile, isRegistering]);
};
