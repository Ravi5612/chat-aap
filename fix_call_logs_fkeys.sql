-- Fix for call_logs foreign key constraints
ALTER TABLE IF EXISTS public.call_logs
  DROP CONSTRAINT IF EXISTS call_logs_caller_id_fkey,
  DROP CONSTRAINT IF EXISTS call_logs_receiver_id_fkey;

ALTER TABLE public.call_logs
  ADD CONSTRAINT call_logs_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT call_logs_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also ensure the schema cache is reloaded
NOTIFY pgrst, 'reload schema';
