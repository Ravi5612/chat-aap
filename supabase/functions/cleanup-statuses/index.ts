import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` && authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
            // Optional: verify basic auth if triggered by pg_cron or webhook
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch all expired statuses or those marked as deleted
        const nowIso = new Date().toISOString()
        const { data: statuses, error: fetchError } = await supabaseClient
            .from('statuses')
            .select('id, storage_paths')
            .or(`expires_at.lt.${nowIso},is_deleted.eq.true`)

        if (fetchError) {
            throw fetchError
        }

        if (!statuses || statuses.length === 0) {
            return new Response(JSON.stringify({ message: "No statuses to clean up." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 2. Collect all storage paths
        let pathsToDelete: string[] = []
        let statusIdsToDelete: string[] = []

        for (const status of statuses) {
            statusIdsToDelete.push(status.id)
            if (status.storage_paths && Array.isArray(status.storage_paths)) {
                pathsToDelete.push(...status.storage_paths)
            }
        }

        // 3. Delete files from storage in batches (if there are any)
        if (pathsToDelete.length > 0) {
            // Remove nulls or empty
            pathsToDelete = pathsToDelete.filter(Boolean)
            console.log(`Deleting ${pathsToDelete.length} files from storage...`)
            
            const { data: storageData, error: storageError } = await supabaseClient
                .storage
                .from('chat-files')
                .remove(pathsToDelete)

            if (storageError) {
                console.error("Storage deletion error:", storageError)
                // Continue anyway to delete from DB, or we can choose to throw.
                // We'll log it and continue so DB isn't clogged.
            }
        }

        // 4. Delete the rows from the DB
        console.log(`Deleting ${statusIdsToDelete.length} rows from database...`)
        const { error: dbError } = await supabaseClient
            .from('statuses')
            .delete()
            .in('id', statusIdsToDelete)

        if (dbError) {
            throw dbError
        }

        return new Response(
            JSON.stringify({
                message: "Cleanup successful",
                deleted_statuses: statusIdsToDelete.length,
                deleted_files: pathsToDelete.length
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        console.error('Error in cleanup-statuses:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
