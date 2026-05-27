CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the edge function to run every hour
SELECT cron.schedule(
    'cleanup-expired-statuses',
    '0 * * * *', -- Every hour on the hour
    $$
    SELECT net.http_post(
        url:='https://kzvxiuxwuisojirjvlhy.supabase.co/functions/v1/cleanup-statuses',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer sb_publishable_1nQYqn2bJMCcMmscfxIJKQ_ccDsA9FD"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
    $$
);
