const fs = require('fs');

async function testFunction() {
  // Let's invoke the Edge function directly with a fake message payload
  const payload = {
    record: {
      id: "test-id-" + Date.now(),
      sender_id: "test-sender",
      receiver_id: "test-receiver",
      message: "Hello world",
      status: "sent"
    }
  };

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/expo-push`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(payload)
    }
  );
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

testFunction();
