export const ALL_SITE_ORIGINS = Object.freeze(['https://*/*', 'http://*/*']);

export function originPatternFromUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? `${url.origin}/*` : '';
  } catch {
    return '';
  }
}

function callbackResult(environment, invoke, fallbackMessage) {
  return new Promise((resolve, reject) => {
    invoke((value) => {
      const error = environment.chrome?.runtime?.lastError;
      if (error) reject(new Error(error.message || fallbackMessage));
      else resolve(value);
    });
  });
}

export async function inspectActiveSiteAccess(environment = globalThis) {
  const chromeApi = environment.chrome;
  if (!chromeApi?.tabs?.query || !chromeApi?.permissions?.contains) {
    return { supported: false, granted: false, allSites: false, url: '', origin: '', pattern: '' };
  }
  const tabs = await callbackResult(environment, (done) => chromeApi.tabs.query({ active: true, currentWindow: true }, done), 'Unable to inspect the active tab.');
  const url = tabs?.[0]?.url || '';
  const pattern = originPatternFromUrl(url);
  const allSites = await callbackResult(environment, (done) => chromeApi.permissions.contains({ origins: ALL_SITE_ORIGINS }, done), 'Unable to inspect all-site access.');
  
  if (!pattern) {
    return { supported: true, restricted: true, granted: Boolean(allSites), allSites: Boolean(allSites), url: '', origin: 'this restricted page', pattern: '' };
  }
  
  const granted = allSites || await callbackResult(environment, (done) => chromeApi.permissions.contains({ origins: [pattern] }, done), 'Unable to inspect site access.');
  return { supported: true, restricted: false, granted: Boolean(granted), allSites: Boolean(allSites), url, origin: new URL(url).origin, pattern };
}

export async function requestSiteAccess({ pattern, allSites = false }, environment = globalThis) {
  const chromeApi = environment.chrome;
  if (!chromeApi?.permissions?.request) throw new Error('Chrome site permissions are unavailable.');
  const origins = allSites ? ALL_SITE_ORIGINS : [pattern];
  if (!allSites && !originPatternFromUrl(pattern.replace(/\/\*$/, '/'))) throw new Error('The current page cannot receive extension access.');
  const granted = await callbackResult(environment, (done) => chromeApi.permissions.request({ origins }, done), 'Chrome did not grant page access.');
  return Boolean(granted);
}
