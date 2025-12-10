-- Create contact_messages table
create table public.contact_messages (
  id uuid not null default gen_random_uuid (),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp with time zone not null default now(),
  constraint contact_messages_pkey primary key (id)
) tablespace pg_default;

-- Create blog_posts table
create table public.blog_posts (
  id uuid not null default gen_random_uuid (),
  title text not null,
  content text not null,
  category text not null,
  image_url text null,
  created_at timestamp with time zone not null default now(),
  constraint blog_posts_pkey primary key (id)
) tablespace pg_default;

-- Enable RLS
alter table public.contact_messages enable row level security;
alter table public.blog_posts enable row level security;

-- Policies for contact_messages
-- Allow ANYONE (including unauthenticated/anon users) to INSERT
create policy "Enable insert for everyone" on public.contact_messages
  for insert 
  to anon, authenticated
  with check (true);

create policy "Enable read for admins only" on public.contact_messages
  for select using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Policies for blog_posts
create policy "Enable read for everyone" on public.blog_posts
  for select using (true);

create policy "Enable all access for admins" on public.blog_posts
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Create career_positions table
create table public.career_positions (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text not null,
  location text not null,
  type text not null,
  experience text not null,
  is_active boolean default true,
  created_at timestamp with time zone not null default now(),
  constraint career_positions_pkey primary key (id)
) tablespace pg_default;

-- Enable RLS for career_positions
alter table public.career_positions enable row level security;

-- Policies for career_positions
create policy "Enable read for everyone" on public.career_positions
  for select using (true);

create policy "Enable all access for admins" on public.career_positions
  for all using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Calendar-based appointment system
-- Main calendar table (one per user)
create table public.appointment_calendars (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null default 'Randevu Takvimim',
  share_token uuid default uuid_generate_v4() unique not null,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- Time slots in the calendar
create table public.appointment_slots (
  id uuid default uuid_generate_v4() primary key,
  calendar_id uuid references public.appointment_calendars(id) on delete cascade not null,
  slot_date date not null,
  slot_time time not null,
  duration_minutes integer default 60,
  customer_name text,
  customer_phone text,
  customer_notes text,
  status text default 'available' check (status in ('available', 'reserved')),
  reserved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  unique(calendar_id, slot_date, slot_time)
);

-- RLS policies for calendars
alter table public.appointment_calendars enable row level security;

create policy "Users can view their own calendars" on public.appointment_calendars
  for select using (auth.uid() = user_id);

create policy "Users can create their own calendars" on public.appointment_calendars
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own calendars" on public.appointment_calendars
  for update using (auth.uid() = user_id);

create policy "Users can delete their own calendars" on public.appointment_calendars
  for delete using (auth.uid() = user_id);

-- RLS policies for slots
alter table public.appointment_slots enable row level security;

create policy "Users can view their own slots" on public.appointment_slots
  for select using (
    exists (
      select 1 from public.appointment_calendars
      where appointment_calendars.id = appointment_slots.calendar_id
      and appointment_calendars.user_id = auth.uid()
    )
  );

create policy "Public can view available slots by token" on public.appointment_slots
  for select using (
    exists (
      select 1 from public.appointment_calendars
      where appointment_calendars.id = appointment_slots.calendar_id
      and appointment_calendars.is_active = true
    )
  );

create policy "Users can create slots in their calendars" on public.appointment_slots
  for insert with check (
    exists (
      select 1 from public.appointment_calendars
      where appointment_calendars.id = appointment_slots.calendar_id
      and appointment_calendars.user_id = auth.uid()
    )
  );

create policy "Users can update their own slots" on public.appointment_slots
  for update using (
    exists (
      select 1 from public.appointment_calendars
      where appointment_calendars.id = appointment_slots.calendar_id
      and appointment_calendars.user_id = auth.uid()
    )
  );

create policy "Public can reserve available slots" on public.appointment_slots
  for update using (status = 'available')
  with check (status = 'reserved');

create policy "Users can delete their own slots" on public.appointment_slots
  for delete using (
    exists (
      select 1 from public.appointment_calendars
      where appointment_calendars.id = appointment_slots.calendar_id
      and appointment_calendars.user_id = auth.uid()
    )
  );
