const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  'https://qsxhaaqtzdfmtuvbkvtw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeGhhYXF0emRmbXR1dmJrdnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzc1MTMsImV4cCI6MjA5NTQ1MzUxM30.kRVlMc81SbIUVyWlYWCpoVKw-Ru67fvqT64tnKMWVpI',
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

async function check() {
  const userId = 'c3d10114-fc76-4b7f-9ee6-5b60ec26bc41';
  const longString = '{"iv":[101,169,51,103,95,70,64,199,138,26,129,88],"content":[241,223,255,237,93,79,188,159,48,245,50,82,26,16,225,89,6,248,161,232,132,180,139,101,16,118,173,79,243,114,3,184,76,174,233,106,214,156,204,83,200,100,164,139,63,218,186,238,55,244,165,134,199,109,139,63,230,160,100,154,1,2,3,4,5]}';
  console.log('String length:', longString.length);
  const { error } = await supabase.from('profiles').update({ encrypted_private_key: longString }).eq('id', userId);
  console.log('Update error:', error);
}
check();
