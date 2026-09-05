import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRisk, classifyBrowserAction, describeAction, normalizeBrowserAction, validateNavigationUrl } from '../src/core/actionPolicy.js';
import { ErrorCode } from '../src/core/errorContract.js';

test('navigation validation allows absolute HTTP(S) and blocks unsafe schemes or credentials', () => {
  assert.equal(validateNavigationUrl('https://example.com/path'), 'https://example.com/path');
  for (const url of ['javascript:alert(1)', 'file:///tmp/a', 'https://user:secret@example.com']) {
    assert.throws(() => validateNavigationUrl(url), (error) => error.code === ErrorCode.UNSAFE_URL);
  }
});

test('search engine choice is normalized without preserving the legacy tool name', () => {
  const action = normalizeBrowserAction('google_search', { query: 'safe query' }, { searchEngine: 'duckduckgo' });
  assert.deepEqual(action, {
    name: 'web_search',
    args: { query: 'safe query', engine: 'duckduckgo', url: 'https://duckduckgo.com/?q=safe%20query' }
  });
});

test('read-only actions are automatic while sensitive and destructive actions require approval', () => {
  assert.deepEqual(classifyBrowserAction({ name: 'read_page', args: {} }), {
    risk: ActionRisk.READ_ONLY, requiresConfirmation: false, reason: 'Reads visible page context only.'
  });
  assert.equal(classifyBrowserAction({ name: 'type_text', args: { text: 'x' } }).requiresConfirmation, true);
  assert.equal(classifyBrowserAction({ name: 'click_element', args: {} }, { target: { text: 'Delete account' } }).risk, ActionRisk.DESTRUCTIVE);
  assert.equal(classifyBrowserAction({ name: 'navigate', args: { url: 'https://other.example' } }, { currentUrl: 'chrome://settings' }).requiresConfirmation, true);
});

test('confirmation descriptions mask password values', () => {
  const detail = describeAction({ name: 'type_text', args: { selector: '#password', text: 'super-secret' } }, { isPassword: true, type: 'password' });
  assert.doesNotMatch(detail.text, /super-secret/);
  assert.match(detail.text, /12 characters/);
});
