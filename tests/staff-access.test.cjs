/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing CommonJS node:test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/lib/staff-access.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function fixture({ user = { id: 'staff-id' }, authError = null, profile = null, profileError = null } = {}) {
  let profileReads = 0;
  const exports = {};
  vm.runInNewContext(compiled, { exports, console: { error() {} }, require: name => {
    if (name === 'react') return { cache: fn => fn };
    if (name !== '@/lib/supabase/server') throw new Error(`Unexpected import: ${name}`);
    return { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      from: table => {
        assert.equal(table, 'profiles');
        ++profileReads;
        return { select: () => ({ eq: (column, id) => {
          assert.equal(column, 'id');
          assert.equal(id, user.id);
          return { maybeSingle: async () => ({ data: profile, error: profileError }) };
        } }) };
      },
    }) };
  } });
  return { check: exports.getStaffAccess, profileReads: () => profileReads };
}

test('signed-out and invalid sessions cannot read a staff profile', async () => {
  for (const options of [{ user: null }, { authError: new Error('Invalid session') }]) {
    const f = fixture(options);
    assert.equal((await f.check()).status, 'signed-out');
    assert.equal(f.profileReads(), 0);
  }
});

test('missing profiles, null roles, and non-staff roles fail closed', async () => {
  for (const profile of [null, { role: null }, { role: 'customer' }, { role: 'viewer' }]) {
    assert.equal((await fixture({ profile }).check()).status, 'denied');
  }
});

test('profile lookup errors do not grant ERP access', async () => {
  const f = fixture({ profile: { role: 'admin' }, profileError: new Error('Lookup failed') });
  assert.equal((await f.check()).status, 'denied');
});

test('approved staff roles reach the ERP with their existing role', async () => {
  for (const role of ['admin', 'manager', 'operator', 'accountant']) {
    const access = await fixture({ profile: { role } }).check();
    assert.equal(access.status, 'staff');
    assert.equal(access.role, role);
  }
});
