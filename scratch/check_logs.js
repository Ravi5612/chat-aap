const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sfdhmdcmevutgghzxcnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGhtZGNtZXZ1dGdnaHp4Y25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTU0MjgsImV4cCI6MjA4MDkzMTQyOH0.3KjwDgASibw37aPt__8V85h22N2iGI7iFmictx-Z2VY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLogs() {
  console.log('Fetching latest debug logs...');
  const { data, error } = await supabase
    .from('debug_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('--- LATEST 10 DEBUG LOGS ---');
  data.forEach((log, index) => {
    console.log(`[${index + 1}] Time: ${log.created_at || log.metadata?.timestamp}`);
    console.log(`User: ${log.user_name} (${log.user_id})`);
    console.log(`Context: ${log.context}`);
    console.log(`Error: ${log.error_message}`);
    console.log(`Metadata:`, JSON.stringify(log.metadata, null, 2));
    console.log('-----------------------------------');
  });
}

checkLogs();
