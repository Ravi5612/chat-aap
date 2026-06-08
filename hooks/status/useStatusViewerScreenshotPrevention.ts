import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { useFriendsStore } from '@/store/useFriendsStore';

export const useStatusViewerScreenshotPrevention = (userId: string, isOwner: boolean) => {
    useEffect(() => {
        let isActive = false;
        
        const manageScreenshot = async () => {
            if (isOwner) return; // Don't prevent screenshot on own status
            
            try {
                const friends = useFriendsStore.getState().combinedItems;
                const friendData = friends.find((f: any) => f.id === userId);
                
                const allowScreenshot = friendData?.friend?.allow_screenshot ?? friendData?.allow_screenshot ?? true;
                
                if (!allowScreenshot) {
                    if (__DEV__) console.log('[DEBUG] Preventing screen capture for status because friend disabled it.');
                    await ScreenCapture.preventScreenCaptureAsync();
                    isActive = true;
                } else {
                    if (__DEV__) console.log('[DEBUG] Screen capture is allowed for this status.');
                    await ScreenCapture.allowScreenCaptureAsync();
                    isActive = false;
                }
            } catch (error) {
                console.error('[STATUS] Screen capture logic failed:', error);
            }
        };

        manageScreenshot();

        return () => {
            if (isActive) {
                if (__DEV__) console.log('[DEBUG] Restoring screen capture on status unmount.');
                ScreenCapture.allowScreenCaptureAsync().catch(err => {
                    console.error('[STATUS] Failed to restore screen capture:', err);
                });
            }
        };
    }, [userId, isOwner]);
};
