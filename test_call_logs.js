const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const SUPABASE_URL = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/)[1];
const SUPABASE_ANON_KEY = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1];

async function test() {
  const url = `${SUPABASE_URL}/rest/v1/profiles?id=in.()`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  const data = await response.json();
  console.log("Empty IN result:", data);
}

test();
