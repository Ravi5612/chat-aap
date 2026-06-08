const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
});
try {
  global.WebSocket = require('ws');
} catch (e) {
  // Ignore
}
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: receiverProfiles, error: err1 } = await supabase.from('profiles').select('id, email, username').ilike('email', '%ravi%');
  if (err1) { console.error('Receiver err:', err1); return; }
  
  console.log('Profiles found:', receiverProfiles);
  if (!receiverProfiles || receiverProfiles.length === 0) return;
  const receiverId = receiverProfiles[0].id;
  console.log('Receiver ID:', receiverId);
  
  const { data: senderProfile, error: err2 } = await supabase.from('profiles').select('id').neq('id', receiverId).limit(1).single();
  const senderId = senderProfile ? senderProfile.id : receiverId;
  console.log('Sender ID:', senderId);
  
  const { data: msg, error: err3 } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message: 'Hello! This is a test push notification. Double tick should work now.',
    message_type: 'text',
    status: 'sent',
    is_read: false
  }).select().single();
  
  if (err3) { console.error('Msg err:', err3); return; }
  console.log('Message sent! ID:', msg.id);
}
run();
