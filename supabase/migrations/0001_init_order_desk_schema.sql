-- =============================================================================
-- SME Order Desk — MVP #1 schema
-- WhatsApp-first order & sales logging for African SMEs.
-- Money is stored as INTEGER FCFA (XAF/XOF have no minor units).
-- =============================================================================

-- ---------- businesses (one row per shop owner; id == auth uid) ----------
create table if not exists public.businesses (
  id uuid primary key default auth.uid(),
  name text not null default 'Ma Boutique',
  country text not null default 'CM',
  currency text not null default 'XAF',
  whatsapp_number text,
  momo_mtn_number text,
  momo_orange_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp_handle text,
  momo_provider text check (momo_provider in ('mtn_momo','orange_money','other')),
  momo_number text,
  zone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_owner_idx on public.customers (owner_id);
create index if not exists customers_owner_phone_idx on public.customers (owner_id, phone);

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  name text not null,
  sku text,
  unit text not null default 'unite',
  unit_price_fcfa integer not null default 0 check (unit_price_fcfa >= 0),
  stock_qty integer not null default 0,
  low_stock_threshold integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_owner_idx on public.products (owner_id);

-- ---------- orders ----------
create sequence if not exists public.order_code_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  order_code text not null default ('ORD-' || lpad(nextval('public.order_code_seq')::text, 4, '0')),
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp','instagram','facebook','tiktok','in_person','phone','other')),
  status text not null default 'new'
    check (status in ('new','confirmed','packed','out_for_delivery','delivered','cancelled','returned')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','partial','paid','refunded')),
  subtotal_fcfa integer not null default 0 check (subtotal_fcfa >= 0),
  delivery_fee_fcfa integer not null default 0 check (delivery_fee_fcfa >= 0),
  discount_fcfa integer not null default 0 check (discount_fcfa >= 0),
  total_fcfa integer not null default 0,
  amount_paid_fcfa integer not null default 0,
  balance_fcfa integer generated always as (total_fcfa - amount_paid_fcfa) stored,
  delivery_address text,
  delivery_zone text,
  rider_name text,
  raw_message text,
  notes text,
  ordered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists orders_order_code_key on public.orders (order_code);
create index if not exists orders_owner_idx on public.orders (owner_id);
create index if not exists orders_owner_status_idx on public.orders (owner_id, status);
create index if not exists orders_owner_customer_idx on public.orders (owner_id, customer_id);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name_snapshot text not null,
  qty integer not null default 1 check (qty > 0),
  unit_price_fcfa integer not null default 0 check (unit_price_fcfa >= 0),
  line_total_fcfa integer generated always as (qty * unit_price_fcfa) stored,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_owner_idx on public.order_items (owner_id);

-- ---------- payments ----------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  amount_fcfa integer not null check (amount_fcfa > 0),
  provider text not null default 'mtn_momo'
    check (provider in ('mtn_momo','orange_money','cash','bank_transfer','other')),
  momo_reference text,
  momo_number text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed','reversed')),
  raw_sms text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists payments_owner_idx on public.payments (owner_id);
create index if not exists payments_order_idx on public.payments (order_id);
create index if not exists payments_ref_idx on public.payments (owner_id, momo_reference);

-- ---------- credit_ledger ----------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  entry_type text not null check (entry_type in ('debit','credit')),
  amount_fcfa integer not null check (amount_fcfa > 0),
  balance_after_fcfa integer,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists credit_ledger_owner_idx on public.credit_ledger (owner_id);
create index if not exists credit_ledger_customer_idx on public.credit_ledger (customer_id, created_at);

-- =============================================================================
-- Triggers: keep order totals and paid amounts consistent
-- =============================================================================
create or replace function public.trg_orders_totals()
returns trigger language plpgsql as $$
begin
  new.total_fcfa := new.subtotal_fcfa + new.delivery_fee_fcfa - new.discount_fcfa;
  new.payment_status := case
    when new.amount_paid_fcfa <= 0 then 'unpaid'
    when new.amount_paid_fcfa >= new.total_fcfa then 'paid'
    else 'partial'
  end;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists orders_totals on public.orders;
create trigger orders_totals
before insert or update on public.orders
for each row execute function public.trg_orders_totals();

create or replace function public.recalc_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders o
  set subtotal_fcfa = coalesce((select sum(oi.line_total_fcfa) from public.order_items oi where oi.order_id = o.id), 0),
      amount_paid_fcfa = coalesce((select sum(p.amount_fcfa) from public.payments p
                                   where p.order_id = o.id and p.status = 'confirmed'), 0),
      updated_at = now()
  where o.id = p_order_id;
end; $$;

create or replace function public.trg_order_items_recalc()
returns trigger language plpgsql as $$
begin
  perform public.recalc_order(coalesce(new.order_id, old.order_id));
  return null;
end; $$;

drop trigger if exists order_items_recalc on public.order_items;
create trigger order_items_recalc
after insert or update or delete on public.order_items
for each row execute function public.trg_order_items_recalc();

create or replace function public.trg_payments_recalc()
returns trigger language plpgsql as $$
begin
  if coalesce(new.order_id, old.order_id) is not null then
    perform public.recalc_order(coalesce(new.order_id, old.order_id));
  end if;
  return null;
end; $$;

drop trigger if exists payments_recalc on public.payments;
create trigger payments_recalc
after insert or update or delete on public.payments
for each row execute function public.trg_payments_recalc();

create or replace function public.trg_credit_ledger_balance()
returns trigger language plpgsql as $$
declare
  v_prev integer;
  v_delta integer;
begin
  select l.balance_after_fcfa into v_prev
  from public.credit_ledger l
  where l.customer_id = new.customer_id
    and l.created_at <= new.created_at
    and l.id <> new.id
  order by l.created_at desc, l.id desc
  limit 1;

  v_delta := case when new.entry_type = 'debit' then new.amount_fcfa else -new.amount_fcfa end;
  new.balance_after_fcfa := coalesce(v_prev, 0) + v_delta;
  return new;
end; $$;

drop trigger if exists credit_ledger_balance on public.credit_ledger;
create trigger credit_ledger_balance
before insert on public.credit_ledger
for each row execute function public.trg_credit_ledger_balance();

-- =============================================================================
-- Row Level Security: each shop owner only sees their own rows
-- =============================================================================
alter table public.businesses    enable row level security;
alter table public.customers     enable row level security;
alter table public.products      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.payments      enable row level security;
alter table public.credit_ledger enable row level security;

create policy businesses_owner_all on public.businesses
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy customers_owner_all on public.customers
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy products_owner_all on public.products
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy orders_owner_all on public.orders
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy order_items_owner_all on public.order_items
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy payments_owner_all on public.payments
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy credit_ledger_owner_all on public.credit_ledger
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
