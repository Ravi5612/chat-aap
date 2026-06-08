const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});

try { global.WebSocket = require('ws'); } catch (e) {}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, push_token').eq('email', 'ravirai84273@gmail.com').single();
  if (error || !data) {
    console.error('Failed to get token:', error);
    return;
  }
  console.log('Token:', data.push_token);
  
  if (!data.push_token) {
    console.log('User has no push token registered!');
    return;
  }
  
  const payload = {
    to: data.push_token,
    title: 'Test Notification',
    body: 'Bhai, yeh test notification kaam kar raha hai!',
    sound: 'default',
    priority: 'high',
    data: {
      type: 'message',
      title: 'System Bot',
      body: 'Bhai, yeh test notification kaam kar raha hai!',
      messageId: 'test-message-id'
    }
  };
  
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  console.log('Push result:', result);
}
run();
