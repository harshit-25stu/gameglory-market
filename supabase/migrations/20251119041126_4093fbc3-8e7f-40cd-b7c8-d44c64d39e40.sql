-- Add foreign key references to profiles table
ALTER TABLE public.watch_parties
ADD CONSTRAINT watch_parties_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.watch_party_participants
ADD CONSTRAINT watch_party_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.watch_party_messages
ADD CONSTRAINT watch_party_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.watch_party_events
ADD CONSTRAINT watch_party_events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;