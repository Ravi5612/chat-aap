const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim();
  }
});

async function checkLogs() {
  const url = `${supabaseUrl}/rest/v1/debug_logs?select=*&order=created_at.desc&limit=20`;
  
  const response = await fetch(url, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Error fetching logs:", data);
    return;
  }

  console.log("=== LATEST DEBUG LOGS ===");
  data.forEach((log, index) => {
    console.log(`\n[${index + 1}] ${log.created_at}`);
    console.log(`User: ${log.user_name} (${log.user_id})`);
    console.log(`Context: ${log.context}`);
    console.log(`Error: ${log.error_message}`);
  });
}

checkLogs();
