# SME Order Desk — MVP #1: WhatsApp-first order & sales logging

A mobile-first, low-data web app that turns messy WhatsApp orders into structured,
paid-tracked sales records for small shops in Cameroon and West/Central Africa.

> Part of a series of MVPs tackling the most recurring problems African SMEs face.
> **This run ships problem #1 only** — see [Roadmap](#roadmap) for what comes next.

---

## The problem

A neighbourhood shop in Douala or Yaoundé runs on WhatsApp. Customers send things like:

```
[05/11/2024, 09:12] Clarisse Mbah: Bonjour mami, je veux 2 riz 25kg et 1 bidon huile
[05/11/2024, 09:13] Mami: ok, livraison Mvog-Mbi
[05/11/2024, 09:15] Clarisse Mbah: je paie par MTN
```

Today the shopkeeper copies this into a paper notebook or a phone note. The result:

- orders get lost or double-logged,
- nobody remembers who still owes money (credit sold on trust),
- MoMo screenshots pile up with no link to an order,
- you cannot tell how much you really sold today.

**SME Order Desk** turns one pasted WhatsApp message into a real order with line items,
a running balance, a Mobile Money payment record and a ready-to-send confirmation message.

## What this MVP does

- **Paste-and-parse WhatsApp orders.** A rule-based parser (no external AI, works offline,
  supports French number words like *deux*) turns a chat log into editable order lines that are
  matched against your product catalogue.
- **FCFA-native money.** All amounts are integer FCFA (XAF/XOF have no minor units — no float rounding bugs).
- **Mobile Money aware payments.** Every payment carries provider (`mtn_momo`, `orange_money`, `cash`,
  `bank_transfer`), the MoMo reference, the payer number and the raw SMS text, plus a
  `pending`/`confirmed`/`failed`/`reversed` status.
- **Order totals that can't drift.** Postgres triggers recompute subtotal, total, amount paid,
  balance and payment status whenever items or payments change.
- **Credit ledger.** A per-customer running balance (`debit` on credit sales, `credit` on repayments).
- **Copy-to-WhatsApp confirmation.** One tap produces the confirmation message with totals and
  your MoMo numbers.
- **MoMo SMS reconciliation helper.** Paste the MTN/Orange SMS, the app extracts amount + reference
  and proposes the matching unpaid order.
- **Low-data by design.** Server-rendered pages, no web fonts, no analytics, no chart libraries;
  works fine on a 2G/3G connection and a cheap Android phone.
- **Multi-tenant + RLS.** Each shop owner only ever sees their own rows.

## Stack

- **Next.js 14 (App Router)** — server components + server actions, TypeScript.
- **Supabase** — Postgres, Row Level Security, email/password auth.
- Plain CSS (mobile-first), zero UI dependencies.

## Data model

| Table | Purpose |
|---|---|
| `businesses` | One row per shop owner (`id = auth.uid()`), shop name, MoMo numbers. |
| `customers` | WhatsApp contacts / buyers, preferred MoMo provider + number, zone. |
| `products` | Lightweight catalogue (name, sku, unit, `unit_price_fcfa`, `stock_qty`). |
| `orders` | Channel, status, FCFA totals, `amount_paid_fcfa`, generated `balance_fcfa`, `raw_message`. |
| `order_items` | Line items with `qty`, `unit_price_fcfa`, generated `line_total_fcfa`. |
| `payments` | MoMo/cash payments: provider, `momo_reference`, `momo_number`, `status`, `raw_sms`. |
| `credit_ledger` | Per-customer `debit`/`credit` entries with `balance_after_fcfa`. |

Money columns are `integer` FCFA. `orders.order_code` defaults to `ORD-0001`, `ORD-0002`, …

### Triggers (why the numbers stay correct)

- `orders_totals` (BEFORE INSERT/UPDATE on `orders`) → `total_fcfa = subtotal + delivery - discount`,
  and derives `payment_status` (`unpaid` / `partial` / `paid`).
- `order_items_recalc` → after any item change, recompute the order's `subtotal_fcfa`.
- `payments_recalc` → after any payment change, recompute `amount_paid_fcfa` from **confirmed** payments only
  (so `pending`/`failed` MoMo transfers never inflate sales).
- `credit_ledger_balance` → stamps `balance_after_fcfa` as a running balance per customer.

## Quickstart

### 1. Create the Supabase project

Either reuse the project this MVP was built and validated against (ref `hqualyghmjmqqhvtbhpf`, region `eu-west-3`),
or create a fresh one and run the SQL yourself.

Open the Supabase **SQL Editor** and run, in order:

1. `supabase/migrations/0001_init_order_desk_schema.sql` — tables, triggers, RLS policies.
2. `supabase/seed.sql` — optional demo shop, catalogue, orders, payments and credit ledger.

Or with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push      # applies supabase/migrations/*
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

### 2. Get the API keys

Supabase dashboard → **Project Settings → API**: copy the **Project URL** and the **anon public** key.

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
```

### 3. Auth setting for local dev

Dashboard → **Authentication → Providers → Email**: turn **"Confirm email" OFF** so a new sign-up
is signed in immediately. (Turn it back on in production.)

### 4. Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Create an account on the login screen, then use **"Importer des données de démonstration"**
on the dashboard to load a sample catalogue + customers, or paste a WhatsApp thread into
**+ Nouvelle commande**.

### 5. Verify the build

```bash
npm run typecheck
npm run build
```

## How the WhatsApp parser works

`lib/whatsapp/parse.ts` — pure TypeScript, no network:

1. Strips WhatsApp export noise (`[05/11/2024, 09:12]`, `Name:`) and greeting-only lines.
2. Splits a message into segments (`et`, `+`, `,`, `puis`).
3. Reads quantities (`2 riz`, `riz x2`, `2x riz`, `deux riz`).
4. Matches each segment against your catalogue by token overlap + SKU; unmatched lines are kept so you
   can pick the product/price manually.
5. Detects a delivery fee (`livraison 1000`) and a Cameroonian mobile number (`+237 6xx xxx xxx`).

The result is a **draft** you review before saving — the shopkeeper stays in control.

## Money & MoMo rules

- Amounts are integers in FCFA; formatting uses `fr-FR` thousands separators.
- Only **confirmed** payments count toward `amount_paid_fcfa`. A fake or late MoMo transfer stays
  `pending`/`failed` and the order stays `unpaid` — this is the reconciliation problem made visible.
- `payments.momo_reference` is indexed per owner for SMS-to-order matching.

## Security

- RLS is enabled on every table with an owner-scoped policy (`owner_id = auth.uid()`,
  `businesses.id = auth.uid()`). The anon key alone returns nothing.
- The `recalc_*` trigger functions are `security definer` with a pinned `search_path`.

## Deploy

Vercel: import the repo, set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
deploy. No other services are required.

## Roadmap (next increments)

The task list, in order. Each MVP is shipped and pushed before the next one starts.

1. ✅ **WhatsApp-first order & sales logging** — *this repo*.
2. ⏭️ **Manual bookkeeping & credit ledgers** — deepen the ledger: statements, aging report, PDF/WhatsApp reminders.
3. **Fake/late MoMo payment reconciliation** — MoMo/SMS import, auto-matching, duplicate detection.
4. **Opaque delivery tracking** — rider assignment, per-stop status, customer-facing tracking link.
5. **Memory-based inventory** — stock movements, low-stock alerts, restock suggestions.

## License

MIT.
