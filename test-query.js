const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function test() {
    const query = `${supabaseUrl}/rest/v1/friendships?select=user_id,friend_id&limit=1`;
    console.log('Query:', query);
    const res = await fetch(query, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const body = await res.text();
    console.log('Response Status:', res.status);
    console.log('Response Body:', body);
}

test();
