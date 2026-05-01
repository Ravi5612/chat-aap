import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export const logErrorToDB = async (error: any, context: string, userId?: string, userName?: string) => {
    try {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const errorStack = error instanceof Error ? error.stack : '';
        
        console.log(`[LOGGING ERROR] Context: ${context} | Error: ${errorMessage}`);

        const { error: dbError } = await supabase.from('debug_logs').insert([{
            user_id: userId || null,
            user_name: userName || 'Anonymous',
            error_message: errorMessage,
            context: context,
            metadata: {
                platform: Platform.OS,
                version: Platform.Version,
                stack: errorStack,
                timestamp: new Date().toISOString()
            }
        }]);

        if (dbError) {
            console.error('Failed to send error to Supabase:', dbError);
        }
    } catch (e) {
        console.error('Error in logErrorToDB:', e);
    }
};
