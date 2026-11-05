const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const { NextResponse } = require('next/server');

const orderId = '00000000-0000-0000-0000-000000000001';
const source = readFileSync(join(__dirname, '../src/app/api/website-orders/[orderId]/quote/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function fixture({ readers = 1, beforeUpdate, updateError = false } = {}) {
  let row = { id: orderId, status: 'pending_review', amount_paid: 0 };
  let readCount = 0;
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const client = createClient('https://fixture.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(input);
      if (url.pathname.endsWith('/profiles')) return Response.json({ role: 'manager' });
      if (init.method === 'GET') {
        const snapshot = { ...row };
        if (++readCount === readers) release();
        await barrier; // All requests read pending_review before any writes.
        return Response.json(snapshot);
      }
      if (updateError) return Response.json({ message: 'Database unavailable' }, { status: 500 });
      if (beforeUpdate) row = beforeUpdate(row);
      const matches = [...url.searchParams].filter(([key]) => key !== 'select')
        .every(([key, value]) => value === `eq.${row[key]}`);
      if (!matches) return Response.json([]);
      row = { ...row, ...JSON.parse(init.body) };
      return Response.json([{ id: row.id }]);
    } },
  });
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console: { error() {} },
    require: name => {
      if (name === 'next/server') return { NextResponse };
      if (name === '@/lib/supabase/admin') return { supabaseAdmin: client };
      if (name === '@/lib/supabase/server') return { createSupabaseServerClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'manager' } }, error: null }) },
      }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    quote: subtotal => exports.PATCH(new Request('https://fixture.invalid/quote', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoted_subtotal: subtotal, delivery_charge: 10 }),
    }), { params: Promise.resolve({ orderId }) }),
    row: () => row,
  };
}

test('a new quote saves its total and deposit', async () => {
  const f = fixture();
  const response = await f.quote(100);
  assert.equal(response.status, 200);
  assert.equal(f.row().quoted_total, 110);
  assert.equal(f.row().deposit_required, 55);
});

test('concurrent managers cannot overwrite the winning quote', async () => {
  const f = fixture({ readers: 2 });
  const responses = await Promise.all([f.quote(100), f.quote(200)]);
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
  const winner = responses.findIndex(r => r.status === 200);
  assert.equal(f.row().quoted_total, winner === 0 ? 110 : 210);
  const conflict = await responses.find(r => r.status === 409).json();
  assert.match(conflict.error, /order changed/i);
});

test('a deposit received after the read is preserved', async () => {
  const f = fixture({ beforeUpdate: row => ({ ...row, status: 'deposit_received', amount_paid: 55, balance_due: 55 }) });
  assert.equal((await f.quote(200)).status, 409);
  assert.equal(f.row().status, 'deposit_received');
  assert.equal(f.row().balance_due, 55);
});

test('payments block the update even if status is still pending', async () => {
  const f = fixture({ beforeUpdate: row => ({ ...row, amount_paid: 1 }) });
  assert.equal((await f.quote(100)).status, 409);
  assert.equal(f.row().amount_paid, 1);
});

test('database errors remain server errors', async () => {
  const f = fixture({ updateError: true });
  assert.equal((await f.quote(100)).status, 500);
  assert.equal(f.row().status, 'pending_review');
});
