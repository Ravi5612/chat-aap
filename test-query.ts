import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

async function test() {
    const { data: users, error: userError } = await supabase.from('profiles').select('id').limit(1);
    if (!users || users.length === 0) return console.log('No users found', userError);
    
    const userId = users[0].id;
    console.log('Testing for user:', userId);

    const { data, error } = await supabase.from('friendships').select(`is_favorite, is_archived, is_locked, friend_id, friend:profiles!friendships_friend_id_fkey(id, username)`).eq('user_id', userId);
    console.log('Sent friendships:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
}

test();
