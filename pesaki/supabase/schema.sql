-- Create a table for public profiles (optional but good practice)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  phone text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- WALLETS TABLE
create table public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  balance decimal(12, 2) default 0.00 not null,
  is_demo boolean default false, -- This wallet tracks REAL money. Demo balance can be separate or a separate row. 
  -- actually, let's keep it simple: One user has ONE real wallet row. Demo balance can be a column or we use a separate strategy.
  -- The PDF says "One account = one wallet".
  -- "Demo Mode: Virtual wallet balance: KSh 10,000". "Real Play Mode: Wallet starts at KSh 0.00".
  -- Let's add a 'demo_balance' column to the same wallet for simplicity, or just handle it purely client-side/session based?
  -- Security wise, demo balance should also be server-side to prevent "infinite" demo money exploits if we gamify it.
  demo_balance decimal(12, 2) default 10000.00 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.wallets enable row level security;

create policy "Users can view own wallet." on public.wallets
  for select using (auth.uid() = user_id);

-- TRANSACTIONS TABLE
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'withdrawal', 'bet', 'win', 'loss')),
  amount decimal(12, 2) not null,
  reference text, -- e.g., M-Pesa code or Game ID
  game_type text, -- 'aviator', 'spin_dogo', etc.
  status text default 'completed',
  is_demo boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.transactions enable row level security;

create policy "Users can view own transactions." on public.transactions
  for select using (
    exists (
      select 1 from public.wallets 
      where wallets.id = transactions.wallet_id 
      and wallets.user_id = auth.uid()
    )
  );

-- FUNCTIONS & TRIGGERS

-- 1. Handle New User (Create Profile + Wallet)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  cleaned_phone text;
begin
  -- If phone is available directly, use it. 
  -- Otherwise, if it's an email-based workaround, strip "@pesaki.com"
  if new.phone is not null then
    cleaned_phone := new.phone;
  elsif new.email like '%@pesaki.com' then
    cleaned_phone := replace(new.email, '@pesaki.com', '');
  else
    cleaned_phone := new.email; -- Fallback to full email
  end if;

  insert into public.profiles (id, phone)
  values (new.id, cleaned_phone);
  
  insert into public.wallets (user_id, balance, demo_balance)
  values (new.id, 0.00, 10000.00);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
