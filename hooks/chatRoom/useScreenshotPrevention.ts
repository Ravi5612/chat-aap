import { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';

export const useScreenshotPrevention = (friendData: any, isGroup: boolean) => {
    useEffect(() => {
        let isActive = false;
        
        const manageScreenshot = async () => {
            try {
                // By default, allow screenshots unless explicitly disabled by friend
                const allowScreenshot = friendData?.friend?.allow_screenshot ?? true;
                
                if (!allowScreenshot && !isGroup) {
                    if (__DEV__) console.log('[DEBUG] Preventing screen capture for this chat because friend disabled it.');
                    await ScreenCapture.preventScreenCaptureAsync();
                    isActive = true;
                } else {
                    if (__DEV__) console.log('[DEBUG] Screen capture is allowed for this chat.');
                    await ScreenCapture.allowScreenCaptureAsync();
                    isActive = false;
                }
            } catch (error) {
                console.error('[CHAT] Screen capture logic failed:', error);
            }
        };

        manageScreenshot();

        return () => {
            if (isActive) {
                if (__DEV__) console.log('[DEBUG] Restoring screen capture on unmount.');
                ScreenCapture.allowScreenCaptureAsync().catch(err => {
                    console.error('[CHAT] Failed to restore screen capture:', err);
                });
            }
        };
    }, [friendData?.friend?.allow_screenshot, isGroup]);
};
