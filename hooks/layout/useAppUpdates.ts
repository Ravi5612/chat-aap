import { useEffect } from 'react';
import * as Updates from 'expo-updates';

export const useAppUpdates = () => {
    useEffect(() => {
        async function onFetchUpdateAsync() {
            try {
                if (__DEV__) return;
                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                }
            } catch (error) {
                console.log(`Error fetching latest Expo update: ${error}`);
            }
        }
        onFetchUpdateAsync();
    }, []);
};
