const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

async function testCall() {
  const targetEmail = 'ravirai847272@gmail.com';
  console.log(`🔍 Looking for user with email: ${targetEmail}`);

  // Find user using Supabase REST API directly to avoid WebSocket errors in Node
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(targetEmail)}&select=id,username,push_token`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const profiles = await profileRes.json();

  if (!profiles || profiles.length === 0) {
    console.error('❌ User not found or error occurred:', profiles);
    return;
  }

  const user = profiles[0];
  console.log(`✅ User found: ID=${user.id}, Username=${user.username}`);
  
  if (!user.push_token) {
    console.error('❌ User does NOT have a push token saved. They need to login to the app first!');
    return;
  }
  
  console.log(`✅ Push token exists! Sending call signal...`);

  // Invoke Edge Function directly via fetch
  const invokeRes = await fetch(`${SUPABASE_URL}/functions/v1/call-signal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      recipient_id: user.id,
      caller_name: 'Test Caller',
      channel_name: 'test_call_channel'
    })
  });

  if (!invokeRes.ok) {
      const err = await invokeRes.text();
    console.error('❌ Failed to trigger call:', err);
  } else {
      const data = await invokeRes.json();
    console.log('✅ Call signal sent successfully! Check the phone.', data);
  }
}

testCall();
