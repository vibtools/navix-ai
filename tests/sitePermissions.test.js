import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_SITE_ORIGINS, inspectActiveSiteAccess, originPatternFromUrl, requestSiteAccess } from '../src/core/sitePermissions.js';

function environment({ allSites = false, currentSite = false } = {}) {
  const requests = [];
  const env = {
    chrome: {
      runtime: { lastError: null },
      tabs: { query: (_query, done) => done([{ url: 'https://example.com/form' }]) },
      permissions: {
        contains: ({ origins }, done) => done(origins.length === 2 ? allSites : currentSite || allSites),
        request: ({ origins }, done) => { requests.push(origins); done(true); }
      }
    }
  };
  return { env, requests };
}

test('site URL is converted to the exact Chrome origin pattern', () => {
  assert.equal(originPatternFromUrl('https://example.com/path?q=1'), 'https://example.com/*');
  assert.equal(originPatternFromUrl('chrome://settings'), '');
});

test('all-site permission satisfies current page access without another prompt', async () => {
  const { env } = environment({ allSites: true });
  const access = await inspectActiveSiteAccess(env);
  assert.equal(access.granted, true);
  assert.equal(access.allSites, true);
});

test('permission requests are limited to the chosen exact or all-site scope', async () => {
  const exact = environment();
  await requestSiteAccess({ pattern: 'https://example.com/*', allSites: false }, exact.env);
  assert.deepEqual(exact.requests, [['https://example.com/*']]);
  const broad = environment();
  await requestSiteAccess({ pattern: 'https://example.com/*', allSites: true }, broad.env);
  assert.deepEqual(broad.requests, [ALL_SITE_ORIGINS]);
});
