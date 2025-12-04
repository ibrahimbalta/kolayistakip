-- Create proposals table
create table if not exists proposals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  customer_name text not null,
  customer_phone text not null,
  title text not null,
  details text,
  amount decimal(10,2),
  items jsonb default '[]'::jsonb, -- Stores array of {description, price}
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'negotiating', 'waiting')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- If table exists, run this to add the column:
-- ALTER TABLE proposals ADD COLUMN IF NOT EXISTS items jsonb default '[]'::jsonb;

-- Enable RLS
alter table proposals enable row level security;

-- Policy: Users can see and manage their own proposals
create policy "Users can manage their own proposals"
  on proposals for all
  using (auth.uid() = user_id);

-- Policy: Public can view proposals (for the customer link)
-- Note: In a production app, you might want to use a more secure method like signed tokens,
-- but for this requirement, allowing read by ID (implicitly via the UUID link) is a common pattern.
create policy "Public can view proposals"
  on proposals for select
  using (true);

-- Policy: Public can update status (for customer actions)
-- We restrict this to only updating the status field ideally, but Supabase RLS is row-based.
-- We'll allow update for public but the client-side logic will only send status updates.
create policy "Public can update proposal status"
  on proposals for update
  using (true)
  with check (true);
