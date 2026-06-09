async function triggerEdgeFunction() {
  const headers = {
    'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  // 1. Get receiver
  const res1 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/profiles?email=eq.ravirai84273@gmail.com&select=id,email,push_token`, { headers });
  const receiverData = await res1.json();
  const receiver = receiverData[0];

  // 2. Get sender
  const res2 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=neq.${receiver.id}&select=id,email&limit=1`, { headers });
  const senderData = await res2.json();
  const sender = senderData[0];

  console.log(`Triggering push notification from ${sender.email} to ${receiver.email}`);

  // 3. Trigger edge function directly
  const payload = {
    record: {
      id: "fake-msg-" + Date.now(),
      sender_id: sender.id,
      receiver_id: receiver.id,
      message: "U2FsdGVkX1+FakeEncryptedData12345",
      status: "sent"
    }
  };

  const res3 = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/expo-push`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const text = await res3.text();
  console.log('Edge Function Response:', res3.status, text);
}

triggerEdgeFunction();
