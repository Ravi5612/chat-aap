const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sfdhmdcmevutgghzxcnm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGhtZGNtZXZ1dGdnaHp4Y25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTU0MjgsImV4cCI6MjA4MDkzMTQyOH0.3KjwDgASibw37aPt__8V85h22N2iGI7iFmictx-Z2VY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    try {
        console.log("Searching in profiles for ravirai5612...");
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', '%ravirai5612%')
            .limit(5);
            
        if (error) {
            console.error("Error fetching from profiles:", error.message);
        } else {
            console.log("Profiles found with username:", JSON.stringify(data, null, 2));
        }

        // We can also try fetching all profiles and filtering in JS if we want to check email,
        // but email might not even be in the profiles table!
        const { data: cols } = await supabase.rpc('get_columns_for_table', { table_name: 'profiles' });
        // Actually rpc might not exist.
        
    } catch (e) {
        console.error("Exception:", e);
    }
}

checkUser();
