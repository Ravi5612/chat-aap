const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const crypto = require('crypto');

const supabase = createClient(
  'https://qsxhaaqtzdfmtuvbkvtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeGhhYXF0emRmbXR1dmJrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzc1MTMsImV4cCI6MjA5NTQ1MzUxM30.kRVlMc81SbIUVyWlYWCpoVKw-Ru67fvqT64tnKMWVpI',
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

async function testUpdate() {
  const userId = 'c3d10114-fc76-4b7f-9ee6-5b60ec26bc41';
  
  // Try to update with kdf_algorithm
  const { error } = await supabase.from('profiles').update({
      kdf_algorithm: 'scrypt_N16384_r8_p1'
  }).eq('id', userId);
  
  console.log('Update kdf_algorithm error:', error);
}

testUpdate();
