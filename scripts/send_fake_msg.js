async function sendFakeMessage() {
  console.log('Finding user ravirai84273@gmail.com...');
  
  const headers = {
    'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 1. Get receiver
  const res1 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.ravirai84273@gmail.com&select=id,email,push_token`, { headers });
  const receiverData = await res1.json();

  if (!receiverData || receiverData.length === 0) {
    console.error('Failed to find Ravi');
    return;
  }
  const receiver = receiverData[0];
  console.log('Receiver found:', receiver.email, '| Push Token:', receiver.push_token ? 'EXISTS' : 'MISSING');

  // 2. Get sender
  const res2 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=neq.${receiver.id}&select=id,email&limit=1`, { headers });
  const senderData = await res2.json();

  if (!senderData || senderData.length === 0) {
    console.error('Failed to find sender');
    return;
  }
  const sender = senderData[0];
  console.log('Sender found:', sender.email);

  // 3. Insert fake message
  console.log('Inserting fake message into DB...');
  const res3 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender_id: sender.id,
      receiver_id: receiver.id,
      message: 'U2FsdGVkX1+FakeEncryptedData12345',
      status: 'sent'
    })
  });
  
  const msgData = await res3.json();

  if (res3.status >= 400) {
    console.error('Failed to insert message:', msgData);
    return;
  }

  console.log('Successfully inserted fake message! ID:', msgData[0].id);
  console.log('Trigger should now fire the edge function automatically.');
}

sendFakeMessage();
