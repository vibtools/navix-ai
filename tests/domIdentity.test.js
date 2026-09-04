import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureUniqueInteractiveIds } from '../src/content/domIdentity.js';

class FakeElement {
  constructor(id = null) {
    this.attributes = new Map();
    if (id !== null) this.attributes.set('data-ai-id', id);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
}

test('dynamic interactive elements always receive unique numeric IDs', () => {
  const elements = [
    new FakeElement('1'),
    new FakeElement('1'),
    new FakeElement(null),
    new FakeElement('invalid'),
    new FakeElement('8')
  ];
  const root = { querySelectorAll: () => elements };

  assert.equal(ensureUniqueInteractiveIds(root), elements.length);
  const ids = elements.map((element) => element.getAttribute('data-ai-id'));
  assert.equal(ids[0], '1');
  assert.equal(ids[4], '8');
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.every((id) => /^\d+$/.test(id) && Number(id) > 0), true);
});

test('repeated scans keep already-valid identities stable', () => {
  const elements = [new FakeElement(), new FakeElement()];
  const root = { querySelectorAll: () => elements };
  ensureUniqueInteractiveIds(root);
  const first = elements.map((element) => element.getAttribute('data-ai-id'));
  ensureUniqueInteractiveIds(root);
  assert.deepEqual(elements.map((element) => element.getAttribute('data-ai-id')), first);
});

