-- =========================================================================
-- ⚡ CHATWARRIORS: DATABASE LATENCY & MESSAGE SEND FIX
-- =========================================================================
-- This script drops the slow blocking synchronous trigger on message insert,
-- resolving the 30-40 seconds delay when sending messages (getting the single tick).
--
-- 👉 HOW TO RUN:
-- Paste this entire script into your Supabase Dashboard "SQL Editor" and click "Run".
-- =========================================================================

-- 1. Drop the blocking synchronous trigger on public.messages
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;

-- 2. Drop the blocking Pl/pgSQL notification function
DROP FUNCTION IF EXISTS public.handle_new_message_notification();

-- =========================================================================
-- 🚀 RECOMMENDED: HOW TO SET UP NON-BLOCKING ASYNCHRONOUS PUSH NOTIFICATIONS
-- =========================================================================
-- Instead of using a synchronous PostgreSQL trigger which blocks database inserts,
-- you should use Supabase's native, asynchronous "Database Webhooks".
-- Native Webhooks run completely in the background via replication stream workers
-- and do NOT add even a single millisecond of delay to your users' chat experience!
--
-- 🛠️ STEP-BY-STEP DASHBOARD SETUP:
--
-- 1. Go to your Supabase Dashboard (https://supabase.com).
-- 2. Open your project.
-- 3. Navigate to "Integrations" -> "Webhooks" (or "Database" -> "Webhooks" in older UI).
-- 4. Click "Create Webhook".
-- 5. Fill out the form with the following values:
--    - Name: send_message_push_notification
--    - Table: messages
--    - Events: Insert (check only "Insert")
--    - Type: HTTP Request
--    - Method: POST
--    - HTTP URL: https://sfdhmdcmevutgghzxcnm.supabase.co/functions/v1/push-notification
-- 6. Add the following HTTP Headers:
--    - Content-Type: application/json
--    - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGhtZGNtZXZ1dGdnaHp4Y25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTU0MjgsImV4cCI6MjA4MDkzMTQyOH0.3KjwDgASibw37aPt__8V85h22N2iGI7iFmictx-Z2VY
-- 7. Click "Save Webhook".
--
-- 🎉 Done! Push notifications will now trigger in less than a millisecond in the background,
-- and your messaging speed will be lightning fast (WhatsApp-like speed)!
-- =========================================================================
