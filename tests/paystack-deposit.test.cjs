/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing CommonJS node:test harness. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");

test("verified deposits are recorded once and conflicting payments are flagged", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create table public.website_order_requests (
        id uuid primary key,
        amount_paid numeric not null default 0,
        quoted_total numeric,
        deposit_required numeric,
        balance_due numeric,
        deposit_verified_at timestamptz,
        status text
      );
      create table public.website_order_payments (
        order_id uuid references public.website_order_requests,
        amount numeric,
        payment_method text,
        reference text,
        verified_by uuid not null
      );
    `);
    await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261105163501_website_order_paystack_deposits.sql"), "utf8"));
    const order = "00000000-0000-0000-0000-000000000001";
    const otherOrder = "00000000-0000-0000-0000-000000000002";
    for (const id of [order, otherOrder]) {
      await db.query("insert into public.website_order_requests (id, quoted_total, deposit_required, balance_due, status) values ($1, 200, 100, 200, 'awaiting_deposit')", [id]);
    }
    const reserve = async id => (await db.query("insert into public.website_order_checkouts (order_id, amount_pesewas) values ($1, 10000) returning reference", [id])).rows[0].reference;
    const record = async (reference, amount) => (await db.query("select public.record_paystack_website_deposit($1, $2) as result", [reference, amount])).rows[0].result;
    const first = await reserve(order);
    assert.equal(await record(first, 10000), "recorded");
    assert.equal(await record(first, 10000), "recorded");
    assert.equal((await db.query("select count(*)::int as count from public.website_order_payments")).rows[0].count, 1);
    assert.deepEqual((await db.query("select amount_paid::int, balance_due::int, status from public.website_order_requests where id = $1", [order])).rows[0],
      { amount_paid: 100, balance_due: 100, status: "deposit_received" });

    const second = await reserve(otherOrder);
    await db.query("update public.website_order_requests set amount_paid = 25 where id = $1", [otherOrder]);
    assert.equal(await record(second, 10000), "needs_review");
    assert.equal((await db.query("select count(*)::int as count from public.website_order_payments")).rows[0].count, 1);
    assert.equal((await db.query("select has_function_privilege('anon', 'public.record_paystack_website_deposit(uuid,bigint)', 'execute') as allowed")).rows[0].allowed, false);
  } finally {
    await db.close();
  }
});
