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

supabase.from('profiles').select('id, push_token').eq('email', 'ravirai84273@gmail.com').single().then(r=>console.log(JSON.stringify(r)));
