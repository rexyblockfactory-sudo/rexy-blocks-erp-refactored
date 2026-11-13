/* eslint-disable @typescript-eslint/no-require-imports -- Uses the existing node:test harness. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(join(__dirname, '../src/lib/property-map.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, URL });

test('a shared viewport keeps its center and zoom without turning it into a pin', () => {
  const map = api.normalizePropertyMapLink('https://www.google.com/maps/@6.7301034,-1.7082904,17z/data=!4m2!29m1!3sabc?entry=ttu');
  const url = new URL(map.href);
  assert.equal(url.searchParams.get('center'), '6.7301034,-1.7082904');
  assert.equal(url.searchParams.get('zoom'), '17');
  assert.equal(url.searchParams.get('map_action'), 'map');
  assert.equal(url.searchParams.has('entry'), false);
  assert.equal(map.isArea, true);
  assert.equal(api.normalizePropertyMapLink(map.href).href, map.href);
});

test('a shared pin retains its target and a blank link falls back to the neighborhood', () => {
  const pin = api.normalizePropertyMapLink('https://www.google.com/maps/search/?api=1&query=6.73%2C-1.71');
  assert.equal(pin.isArea, false);
  assert.equal(new URL(pin.href).searchParams.get('query'), '6.73,-1.71');
  const place = 'https://www.google.com/maps/place/Example/data=!3d6.73!4d-1.71';
  assert.equal(api.normalizePropertyMapLink(place + '?entry=ttu').href, place);
  const fallback = api.publicPropertyMap({ map_url: null, neighborhood: 'Example', city: 'Kumasi', region: 'Ashanti Region' });
  assert.equal(fallback.isArea, true);
  assert.equal(new URL(fallback.href).searchParams.get('query'), 'Example, Kumasi, Ashanti Region, Ghana');
});

test('other hosts, executable URLs, arbitrary Google routes and invalid viewport coordinates are rejected', () => {
  for (const value of [
    'javascript:alert(1)',
    'http://www.google.com/maps/?q=Kumasi',
    'https://www.google.com.example.com/maps/?q=Kumasi',
    'https://www.google.com/url?q=https://example.com',
    'https://www.google.com/maps/@96,22,17z',
    'https://www.google.com/maps/search/?api=1&query=96,22',
  ]) assert.equal(api.normalizePropertyMapLink(value), null);
});
