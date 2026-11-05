const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

// An isolated Postgres fixture: no hosted credentials or production writes.
test('sales RPC rejects missing/null/unauthorized roles before changing stock', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create function auth.uid() returns uuid language sql as
        $$ select nullif(current_setting('test.user_id', true), '')::uuid $$;
      create table profiles (id uuid primary key, role text);
      create table products (id uuid primary key, name text, price numeric);
      create table finished_goods_inventory (
        product_name text primary key, quantity integer, unit_cost numeric,
        costed_quantity integer, total_cost numeric, updated_at timestamptz
      );
      create table sales (
        id uuid default gen_random_uuid(), customer_name text, product_name text,
        quantity integer, unit_price numeric, total_amount numeric,
        payment_method text, amount_paid numeric, balance_due numeric,
        cost_per_unit numeric, cogs numeric, gross_profit numeric, gross_margin numeric
      );
      insert into products values ('00000000-0000-0000-0000-000000000001', 'Test block', 10);
      insert into finished_goods_inventory values ('Test block', 100, 4, 100, 400, now());
    `);
    const original = readFileSync(join(__dirname, '../supabase/migrations/202611020001_create_website_order_requests.sql'), 'utf8');
    // Install the already-deployed function, then apply the follow-up migration.
    await db.exec(original.slice(original.indexOf('CREATE OR REPLACE FUNCTION public.create_sale_with_current_price')));
    await db.exec(readFileSync(join(__dirname, '../supabase/migrations/20261105025627_deny_sales_without_staff_role.sql'), 'utf8'));
    const userId = '00000000-0000-0000-0000-000000000002';
    const sale = () => db.query(`select * from create_sale_with_current_price('Test customer', '00000000-0000-0000-0000-000000000001', 2, 'Credit')`);
    await assert.rejects(sale(), /Not authenticated/);
    await db.query(`select set_config('test.user_id', $1, false)`, [userId]);
    await assert.rejects(sale(), /permission to create sales/); // no profile
    await db.query('insert into profiles values ($1, null)', [userId]);
    await assert.rejects(sale(), /permission to create sales/);
    for (const role of ['', 'customer', 'accountant']) {
      await db.query('update profiles set role = $1', [role]);
      await assert.rejects(sale(), /permission to create sales/);
    }
    assert.equal((await db.query('select quantity from finished_goods_inventory')).rows[0].quantity, 100);
    assert.equal((await db.query('select count(*)::int as n from sales')).rows[0].n, 0);
    for (const role of ['admin', 'manager', 'operator']) {
      await db.query('update profiles set role = $1', [role]);
      const result = await sale();
      assert.equal(Number(result.rows[0].total_amount), 20);
      assert.equal(Number(result.rows[0].balance_due), 20);
    }
    assert.equal((await db.query('select quantity from finished_goods_inventory')).rows[0].quantity, 94);
    const privileges = await db.query(`select
      has_function_privilege('anon', 'create_sale_with_current_price(text,uuid,integer,text)', 'execute') as anon,
      has_function_privilege('authenticated', 'create_sale_with_current_price(text,uuid,integer,text)', 'execute') as staff`);
    assert.deepEqual(privileges.rows[0], { anon: false, staff: true });
  } finally {
    await db.close();
  }
});
