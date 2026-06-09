async function checkLogs() {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/push_logs?select=*&order=created_at.desc&limit=5`,
    {
      headers: {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`
      }
    }
  );
  const data = await response.json();
  console.log('Recent push_logs:', JSON.stringify(data, null, 2));
}

checkLogs();
