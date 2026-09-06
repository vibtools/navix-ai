import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWebsiteIntelligence, inferPageType, WEBSITE_INTELLIGENCE_LIMIT } from '../src/content/webIntelligence.js';

test('semantic page type is inferred from page signals', () => {
  assert.equal(inferPageType({ url: 'https://shop.example/product/1', title: 'Buy Now' }), 'ecommerce');
  assert.equal(inferPageType({ url: 'https://example.com/login', title: 'Sign in' }), 'authentication');
  assert.equal(inferPageType({ url: 'https://example.com/about', title: 'About us' }), 'webpage');
});

test('website intelligence contains semantic map, actions, forms, and accessibility tree', () => {
  const result = buildWebsiteIntelligence({
    url: 'https://shop.example/checkout',
    title: 'Checkout',
    sections: ['navigation', 'product', 'checkout'],
    actions: [{ name: 'Buy Now', target: '[data-ai-id="12"]', role: 'button', bounds: { x: 10, y: 20, width: 100, height: 40 } }],
    forms: [{ name: 'Checkout form', fields: [{ name: 'Email', target: '[data-ai-id="13"]' }] }],
    accessibilityTree: [{ role: 'button', name: 'Buy Now', target: '[data-ai-id="12"]' }],
    content: [{ type: 'p', text: 'Product description' }]
  });
  assert.equal(result.intelligence.pageType, 'checkout');
  assert.deepEqual(result.intelligence.sections, ['navigation', 'product', 'checkout']);
  assert.equal(result.intelligence.actions[0].target, '[data-ai-id="12"]');
  assert.equal(result.intelligence.forms[0].fields[0].name, 'Email');
  assert.equal(result.intelligence.accessibilityTree[0].role, 'button');
});

test('website intelligence is deterministically compressed to the AI context budget', () => {
  const repeated = Array.from({ length: 5_000 }, (_, index) => ({ type: 'p', text: `${index}-${'x'.repeat(500)}` }));
  const result = buildWebsiteIntelligence({ url: 'https://example.com', content: repeated }, WEBSITE_INTELLIGENCE_LIMIT);
  assert.ok(result.serialized.length <= WEBSITE_INTELLIGENCE_LIMIT);
  assert.ok(result.intelligence.content.length < repeated.length);
  assert.deepEqual(JSON.parse(result.serialized), result.intelligence);
});
