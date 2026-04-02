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
  if new.phone is not null and new.phone != '' then
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

-- WALLET LEDGER (immutable transaction history)
create table public.wallet_ledger (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('debit', 'credit')),
  amount decimal(12, 2) not null,
  mode text check (mode in ('real', 'demo')) not null,
  description text not null,
  balance_after decimal(12, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.wallet_ledger enable row level security;

create policy "Users can view own ledger" on public.wallet_ledger
  for select using (auth.uid() = user_id);

-- RPC: Atomic DEBIT
create or replace function public.debit_wallet(
  p_user_id uuid,
  p_amount decimal(12, 2),
  p_mode text,
  p_description text
)
returns decimal(12, 2)
language plpgsql security definer
as $$
declare
  v_current_balance decimal(12, 2);
  v_new_balance decimal(12, 2);
begin
  -- Lock wallet row
  lock table public.wallets in row exclusive mode;
  
  -- Get current balance
  select 
    case p_mode
      when 'real' then balance
      when 'demo' then demo_balance
    end
  into v_current_balance
  from public.wallets where user_id = p_user_id;
  
  if v_current_balance is null or v_current_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;
  
  v_new_balance := v_current_balance - p_amount;
  
  -- Update balance
  execute format('update public.wallets set %I = $1, updated_at = now() where user_id = $2', 
    case p_mode when 'real' then 'balance' else 'demo_balance' end)
  using v_new_balance, p_user_id;
  
  -- Insert ledger
  insert into public.wallet_ledger (user_id, type, amount, mode, description, balance_after)
  values (p_user_id, 'debit', p_amount, p_mode, p_description, v_new_balance);
  
  return v_new_balance;
end;
$$;

-- RPC: Atomic CREDIT
create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount decimal(12, 2),
  p_mode text,
  p_description text
)
returns decimal(12, 2)
language plpgsql security definer
as $$
declare
  v_current_balance decimal(12, 2);
  v_new_balance decimal(12, 2);
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  
  lock table public.wallets in row exclusive mode;
  
  select 
    case p_mode
      when 'real' then balance
      when 'demo' then demo_balance
    end
  into v_current_balance
  from public.wallets where user_id = p_user_id;
  
  v_new_balance := coalesce(v_current_balance, 0) + p_amount;
  
  execute format('update public.wallets set %I = $1, updated_at = now() where user_id = $2', 
    case p_mode when 'real' then 'balance' else 'demo_balance' end)
  using v_new_balance, p_user_id;
  
  insert into public.wallet_ledger (user_id, type, amount, mode, description, balance_after)
  values (p_user_id, 'credit', p_amount, p_mode, p_description, v_new_balance);
  
  return v_new_balance;
end;
$$;

-- SPIN PRIZES (admin configurable)
create table public.spin_prizes (
  id serial primary key,
  name text not null, -- 'Lemon', 'Cherry', etc.
  value decimal(12, 2) not null, -- prize multiplier or fixed KSh
  weight integer not null, -- for weighted random
  image text, -- URL
  created_at timestamp default now()
);

-- Sample data
insert into public.spin_prizes (name, value, weight, image) values
('Loss', 0, 40, '/spin/loss.png'),
('Cherry', 0.5, 25, '/spin/cherry.png'),
('Lemon', 1.0, 15, '/spin/lemon.png'),
('Orange', 2.0, 10, '/spin/orange.png'),
('Bell', 5.0, 5, '/spin/bell.png'),
('7x7', 10.0, 3, '/spin/777.png'),
('Jackpot', 50.0, 2, '/spin/jackpot.png');

alter table public.spin_prizes enable row level security;
create policy "Prizes public read" on public.spin_prizes for select using (true);

-- SPIN RESULTS
create table public.spin_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  bet_amount decimal(12, 2),
  prize_id integer references public.spin_prizes(id),
  prize_value decimal(12, 2),
  mode text check (mode in ('real', 'demo')),
  created_at timestamp default now()
);

alter table public.spin_results enable row level security;
create policy "Users view own spins" on public.spin_results for select using (auth.uid() = user_id);

-- PREDICTIONS
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  market text not null, -- 'USD/KES', 'NSE20'
  direction text check (direction in ('up', 'down')) not null,
  amount decimal(12, 2) not null,
  mode text check (mode in ('real', 'demo')) not null,
  entry_price decimal(8, 4) not null,
  close_price decimal(8, 4),
  status text default 'pending' check (status in ('pending', 'settled', 'cancelled')),
  window_close_at timestamptz not null,
  created_at timestamp default now()
);

alter table public.predictions enable row level security;
create policy "Users view own predictions" on public.predictions for select using (auth.uid() = user_id);

create index idx_predictions_status_close on public.predictions(status, window_close_at);

-- AVIATOR ROUNDS
create table public.aviator_rounds (
  id uuid primary key default gen_random_uuid(),
  server_seed text not null,
  client_seed text not null,
  hash text not null,
  crash_point decimal(8, 4) not null,
  start_time timestamptz,
  status text check (status in ('waiting', 'flying', 'crashed'))
);

alter table public.aviator_rounds enable row level security;
create policy "Rounds public history" on public.aviator_rounds for select using (status != 'waiting');

-- AVIATOR BETS
create table public.aviator_bets (
  id uuid default gen_random_uuid() primary key,
  round_id uuid references public.aviator_rounds(id) on delete cascade,
  user_id uuid references public.profiles(id),
  amount decimal(12, 2) not null,
  mode text check (mode in ('real', 'demo')) not null,
  cashed_out boolean default false,
  cashout_multiplier decimal(8, 4),
  created_at timestamp default now()
);

alter table public.aviator_bets enable row level security;
create policy "Users view own bets" on public.aviator_bets for select using (auth.uid() = user_id);
create policy "Public view settled bets stats" on public.aviator_bets for select using (cashed_out = true or round_id in (select id from aviator_rounds where status = 'crashed'));

-- Indexes for performance
create index idx_wallet_ledger_user on public.wallet_ledger(user_id);
create index idx_wallet_ledger_created on public.wallet_ledger(created_at desc);

-- MPESA DEPOSITS
create table public.mpesa_deposits (
  checkout_request_id text primary key,
  user_id uuid references public.profiles(id) not null,
  amount decimal(12, 2) not null,
  phone text not null,
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mpesa_deposits enable row level security;
create policy "Users view own deposits" on public.mpesa_deposits for select using (auth.uid() = user_id);
create policy "Users can insert own deposits" on public.mpesa_deposits for insert with check (auth.uid() = user_id);

-- MPESA WITHDRAWALS (B2C)
create table public.mpesa_withdrawals (
  conversation_id text primary key, -- Daraja ConversationID
  originator_conversation_id text unique,
  user_id uuid references public.profiles(id) not null,
  amount decimal(12, 2) not null,
  phone text not null,
  status text default 'pending' check (status in ('pending', 'completed', 'failed')),
  result_code text,
  result_desc text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.mpesa_withdrawals enable row level security;
create policy "Users view own withdrawals" on public.mpesa_withdrawals for select using (auth.uid() = user_id);
create policy "Users can insert own withdrawals" on public.mpesa_withdrawals for insert with check (auth.uid() = user_id);
