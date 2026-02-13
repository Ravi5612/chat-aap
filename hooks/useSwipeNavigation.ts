import { useRef } from 'react';
import { PanResponder, Dimensions } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const tabs = ['/', '/status', '/calls', '/profile'];

export const useSwipeNavigation = () => {
    const router = useRouter();
    const pathname = usePathname();

    const getNextTab = (currentPath: string, direction: 'left' | 'right') => {
        // Normalize path (ensure leading slash, remove trailing slash, handle (tabs) group)
        let normalized = currentPath.split('?')[0]; // Remove query params
        normalized = normalized.replace('/(tabs)', '');
        if (normalized === '/index' || normalized === '') normalized = '/';
        if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);

        const currentIndex = tabs.findIndex(t => {
            const tabPath = t === '/' ? '/' : t;
            return tabPath === normalized;
        });

        console.log('useSwipeNavigation: Path:', currentPath, 'Normalized:', normalized, 'Index:', currentIndex);

        if (currentIndex === -1) return null;

        if (direction === 'left' && currentIndex < tabs.length - 1) {
            return tabs[currentIndex + 1];
        } else if (direction === 'right' && currentIndex > 0) {
            return tabs[currentIndex - 1];
        }
        return null;
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Dominant horizontal movement
                const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2;
                const isSignificant = Math.abs(gestureState.dx) > 15;
                return isHorizontal && isSignificant;
            },
            onPanResponderRelease: (_, gestureState) => {
                console.log('useSwipeNavigation: Release dx:', gestureState.dx);
                if (gestureState.dx < -80) { // Swiped Left
                    const nextTab = getNextTab(pathname, 'left');
                    if (nextTab) {
                        console.log('useSwipeNavigation: Navigating Left to:', nextTab);
                        router.replace(nextTab as any);
                    }
                } else if (gestureState.dx > 80) { // Swiped Right
                    const nextTab = getNextTab(pathname, 'right');
                    if (nextTab) {
                        console.log('useSwipeNavigation: Navigating Right to:', nextTab);
                        router.replace(nextTab as any);
                    }
                }
            },
            onPanResponderTerminationRequest: () => true,
        })
    ).current;

    return panResponder.panHandlers;
};
