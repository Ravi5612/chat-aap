async function checkSchema() {
  const { data, error } = await supabase.rpc('get_column_info', { table_name: 'profiles', column_name: 'encrypted_private_key' });
  console.log('RPC info:', data, error);
}
checkSchema();
