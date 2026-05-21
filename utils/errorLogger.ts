import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Safely serialize any error object, handling circular references gracefully.
 */
function safeStringify(value: unknown): string {
    try {
        const seen = new WeakSet();
        return JSON.stringify(value, (_key, val) => {
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) return '[Circular]';
                seen.add(val);
            }
            return val;
        });
    } catch {
        return String(value);
    }
}

/**
 * Log an error to Supabase debug_logs table.
 * In development: also logs to console.
 * In production: only logs to Supabase (no console) to avoid leaking data.
 * Sensitive data like stack traces are only included in __DEV__ builds.
 */
export const logErrorToDB = async (
    error: unknown,
    context: string,
    userId?: string,
    userName?: string
): Promise<void> => {
    try {
        const errorMessage = error instanceof Error ? error.message : safeStringify(error);
        // Only include stack traces in development — they expose internal file paths
        const errorStack = __DEV__ && error instanceof Error ? error.stack : undefined;

        if (__DEV__) {
            console.log(`[LOGGING ERROR] Context: ${context} | Error: ${errorMessage}`);
        }

        const { error: dbError } = await supabase.from('debug_logs').insert([{
            user_id: userId || null,
            user_name: userName || 'Anonymous',
            error_message: errorMessage,
            context: context,
            metadata: {
                platform: Platform.OS,
                version: Platform.Version,
                // Stack traces only in dev builds to avoid production data leaks
                ...(errorStack ? { stack: errorStack } : {}),
                timestamp: new Date().toISOString(),
                is_dev: __DEV__
            }
        }]);

        if (dbError) {
            // Supabase write failed — silently swallow in prod, log in dev
            if (__DEV__) console.error('[errorLogger] Failed to send error to Supabase:', dbError);
            // Fallback: store in-memory for debugging session (non-persistent, doesn't block app)
            inMemoryFallbackLog.push({ context, errorMessage, timestamp: new Date().toISOString() });
        }
    } catch (e) {
        // Do NOT re-throw — logging should never crash the app
        if (__DEV__) console.error('[errorLogger] Internal logger failure:', e);
    }
};

/**
 * In-memory fallback log for errors that fail to reach Supabase.
 * Useful for debugging offline scenarios. Max 50 entries to prevent memory leaks.
 */
const inMemoryFallbackLog: Array<{ context: string; errorMessage: string; timestamp: string }> = [];

export const getInMemoryErrorLog = () => [...inMemoryFallbackLog].slice(-50);

export const clearInMemoryErrorLog = () => {
    inMemoryFallbackLog.splice(0, inMemoryFallbackLog.length);
};
