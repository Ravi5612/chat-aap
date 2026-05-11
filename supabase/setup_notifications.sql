-- ==========================================
-- ⚔️ CHATWARRIORS PUSH NOTIFICATION SETUP
-- ==========================================
-- Ise Supabase Dashboard ke "SQL Editor" mein paste karein aur Run karein.

-- 1. Profiles table mein push_token column add karein (agar nahi hai toh)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. New message par trigger lagane ke liye ek function
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Hum Edge function ko call karenge (Function ka naam 'push-notification' rakhenge)
  -- Ye tabhi kaam karega jab aapne Edge Function deploy kar diya ho.
  PERFORM
    net.http_post(
      url := 'https://sfdhmdcmevutgghzxcnm.supabase.co/functions/v1/push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json', 
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGhtZGNtZXZ1dGdnaHp4Y25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTU0MjgsImV4cCI6MjA4MDkzMTQyOH0.3KjwDgASibw37aPt__8V85h22N2iGI7iFmictx-Z2VY'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger ko activate karein (Messages ke liye)
DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();
