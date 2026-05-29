const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

async function fix() {
    console.log('Fetching accepted friend requests...');
    const reqRes = await fetch(`${supabaseUrl}/rest/v1/friend_requests?status=eq.accepted`, {
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    });
    const requests = await reqRes.json();
    
    if (!requests || requests.length === 0) return console.log('No accepted requests found.');
    console.log(`Found ${requests.length} accepted requests. Fixing...`);

    for (const req of requests) {
        console.log(`Checking friendship between ${req.sender_id} and ${req.receiver_id}...`);
        
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/friendships`, {
            method: 'POST',
            headers: { 
                'apikey': supabaseKey, 
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify([
                { user_id1: req.sender_id, user_id2: req.receiver_id },
                { user_id1: req.receiver_id, user_id2: req.sender_id }
            ])
        });
        
        if (!insertRes.ok) {
            const err = await insertRes.text();
            if (err.includes('23505')) {
                console.log('Friendship already exists (unique violation).');
            } else {
                console.error('Insert error:', err);
            }
        } else {
            console.log('Successfully inserted friendship!');
        }
    }
    
    console.log('Database fixed successfully!');
}

fix();
