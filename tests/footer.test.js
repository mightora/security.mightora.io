import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('footer uses Mightora shared component and validated local YAML', async () => {
  const html = await read('index.html');
  const yaml = await read('footer.yaml');
  assert.match(html, /<mightora-footer local-yaml-url="\.\/footer\.yaml">/);
  assert.match(html, /<mightora-author>/);
  assert.match(html, /quality-badges/);
  assert.match(html, /actions\/workflows\/ci\.yml/);
  assert.match(html, /actions\/workflows\/codeql\.yml/);
  assert.match(html, /actions\/workflows\/pages\.yml/);
  assert.match(html, /blob\/main\/LICENSE/);
  assert.match(yaml, /sections:/);
  assert.match(yaml, /brands:/);
  assert.ok(html.indexOf('quality-badges') < html.indexOf('<mightora-author>'));
  assert.ok(html.indexOf('<mightora-author>') < html.indexOf('<mightora-footer'));
  assert.ok(html.indexOf('js-yaml.min.js') < html.indexOf('shared-ui@main/components.js'));
});
test('offline build preserves footer content without shared UI network scripts', async () => {
  const build = await read('scripts/build.mjs');
  assert.match(build, /footer\.yaml/);
  assert.match(build, /offline-footer/);
  assert.match(build, /connect-src/);
});
