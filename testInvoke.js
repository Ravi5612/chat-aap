const fs=require('fs');
const envStr=fs.readFileSync('.env','utf8');
const env={};
envStr.split('\n').forEach(l=>{
    const m=l.match(/^([^=]+)=(.*)$/);
    if(m) env[m[1].trim()]=m[2].trim().replace(/^['"]|['"]$/g,'');
});
try{global.WebSocket=require('ws')}catch(e){}
const {createClient}=require('@supabase/supabase-js');
const supabase=createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const record = {
    id: 'test-msg-12345',
    sender_id: '16e9f168-5e4c-47fc-8f7d-ea081b8e84a2', // Just some UUID, or we can use another user's ID
    receiver_id: '4d219b33-18c3-42cf-b7ab-3cf31e67b519', // The user's ID
    message_type: 'text',
    message: 'Hello testing invoke'
};

supabase.functions.invoke('expo-push', { body: { type: 'INSERT', record } }).then(res => console.log('Invoke Result:', JSON.stringify(res))).catch(err => console.error(err));
