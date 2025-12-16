-- Create website_messages table for storing contact form submissions
CREATE TABLE public.website_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  subdomain text NOT NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT website_messages_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.website_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can view their own messages" ON public.website_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can insert messages (from public website)
CREATE POLICY "Anyone can send messages" ON public.website_messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their messages" ON public.website_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their messages" ON public.website_messages
  FOR DELETE USING (auth.uid() = user_id);
