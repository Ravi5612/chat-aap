import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  const { data, error } = await supabase
    .from('debug_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching logs:", error);
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
