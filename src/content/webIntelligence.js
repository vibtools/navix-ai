export const WEBSITE_INTELLIGENCE_LIMIT = 30_000;
export const MAX_ACCESSIBILITY_NODES = 240;
export const MAX_ACTIONS = 180;
export const MAX_CONTENT_BLOCKS = 220;

const PAGE_TYPE_RULES = Object.freeze([
  ['checkout', /\b(checkout|payment|billing|place order)\b/i],
  ['authentication', /\b(sign in|log in|login|register|create account|forgot password)\b/i],
  ['ecommerce', /\b(product|add to cart|buy now|shopping cart|price)\b/i],
  ['search', /\b(search results?|results for)\b/i],
  ['article', /\b(article|blog|news|published|author)\b/i],
  ['dashboard', /\b(dashboard|analytics|overview|workspace)\b/i],
  ['form', /\b(form|application|submit)\b/i]
]);

function cleanText(value, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function inferPageType({ url = '', title = '', signals = [] } = {}) {
  const haystack = [url, title, ...signals].map((value) => cleanText(value, 1_000)).join(' ');
  return PAGE_TYPE_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] || 'webpage';
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record || {}).flatMap(([key, value]) => {
    if (value === '' || value === null || value === undefined || value === false) return [];
    if (Array.isArray(value) && value.length === 0) return [];
    return [[key, value]];
  }));
}

function fitArray(items, maxItems, budget) {
  const accepted = [];
  let used = 2;
  for (const rawItem of items || []) {
    if (accepted.length >= maxItems) break;
    const item = compactRecord(rawItem);
    const size = JSON.stringify(item).length + (accepted.length ? 1 : 0);
    if (used + size > budget) break;
    accepted.push(item);
    used += size;
  }
  return accepted;
}

export function buildWebsiteIntelligence(input = {}, maxCharacters = WEBSITE_INTELLIGENCE_LIMIT) {
  const safeLimit = Math.max(4_000, Math.min(Number(maxCharacters) || WEBSITE_INTELLIGENCE_LIMIT, WEBSITE_INTELLIGENCE_LIMIT));
  const metadata = compactRecord({
    version: 1,
    url: cleanText(input.url, 4_096),
    title: cleanText(input.title, 500),
    language: cleanText(input.language, 32),
    pageType: input.pageType || inferPageType({ url: input.url, title: input.title, signals: input.signals })
  });
  const sections = [...new Set((input.sections || []).map((value) => cleanText(value, 80)).filter(Boolean))].slice(0, 40);
  const baseSize = JSON.stringify({ ...metadata, sections }).length;
  const remaining = Math.max(1_000, safeLimit - baseSize - 200);
  const actions = fitArray(input.actions, MAX_ACTIONS, Math.floor(remaining * 0.34));
  const forms = fitArray(input.forms, 40, Math.floor(remaining * 0.16));
  const accessibilityTree = fitArray(input.accessibilityTree, MAX_ACCESSIBILITY_NODES, Math.floor(remaining * 0.27));
  const content = fitArray(input.content, MAX_CONTENT_BLOCKS, Math.floor(remaining * 0.23));
  const sourceWasTruncated = actions.length < (input.actions || []).length
    || forms.length < (input.forms || []).length
    || accessibilityTree.length < (input.accessibilityTree || []).length
    || content.length < (input.content || []).length;
  const intelligence = { ...metadata, sections, actions, forms, accessibilityTree, content };

  let serialized = JSON.stringify(intelligence);
  if (serialized.length > safeLimit) {
    const overflow = serialized.length - safeLimit;
    const reducedContentBudget = Math.max(0, JSON.stringify(content).length - overflow - 100);
    intelligence.content = fitArray(content, content.length, reducedContentBudget);
    serialized = JSON.stringify(intelligence);
  }
  if (serialized.length > safeLimit) {
    intelligence.accessibilityTree = fitArray(accessibilityTree, accessibilityTree.length, Math.max(0, JSON.stringify(accessibilityTree).length - (serialized.length - safeLimit) - 100));
    serialized = JSON.stringify(intelligence);
  }

  return {
    intelligence,
    serialized: serialized.slice(0, safeLimit),
    characterCount: Math.min(serialized.length, safeLimit),
    truncated: sourceWasTruncated || serialized.length > safeLimit
  };
}

function implicitRole(element) {
  const tag = String(element?.tagName || '').toLowerCase();
  const type = String(element?.getAttribute?.('type') || '').toLowerCase();
  if (tag === 'a' && element.hasAttribute?.('href')) return 'link';
  if (tag === 'button') return 'button';
  if (tag === 'select') return 'combobox';
  if (tag === 'textarea') return 'textbox';
  if (tag === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'range') return 'slider';
    if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button';
    return 'textbox';
  }
  if (/^h[1-6]$/.test(tag)) return 'heading';
  return ({ nav: 'navigation', main: 'main', aside: 'complementary', form: 'form', article: 'article', section: 'region' })[tag] || '';
}

function accessibleName(element) {
  const labelledBy = cleanText(element?.getAttribute?.('aria-labelledby'), 240);
  const labelledText = labelledBy.split(/\s+/).filter(Boolean).map((id) => cleanText(element.ownerDocument?.getElementById?.(id)?.textContent, 160)).filter(Boolean).join(' ');
  const label = element?.labels?.length ? [...element.labels].map((entry) => cleanText(entry.textContent, 160)).filter(Boolean).join(' ') : '';
  return cleanText(
    element?.getAttribute?.('aria-label') || labelledText || label || element?.getAttribute?.('alt') ||
    element?.getAttribute?.('title') || element?.getAttribute?.('placeholder') || element?.innerText ||
    (String(element?.getAttribute?.('type') || '').toLowerCase() === 'password' ? '' : element?.value) || element?.textContent,
    240
  );
}

function isVisible(element) {
  if (!element || element.hidden || element.getAttribute?.('aria-hidden') === 'true') return false;
  const style = globalThis.getComputedStyle?.(element);
  return style?.display !== 'none' && style?.visibility !== 'hidden' && style?.opacity !== '0' && Boolean(element.getClientRects?.().length);
}

function targetId(element) {
  const id = cleanText(element?.getAttribute?.('data-ai-id'), 32);
  return id ? `[data-ai-id="${id}"]` : '';
}

function visualBounds(element) {
  const bounds = element?.getBoundingClientRect?.();
  if (!bounds) return undefined;
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height)
  };
}

export function collectWebsiteIntelligence(documentObject = document) {
  const body = documentObject?.body;
  if (!body) return buildWebsiteIntelligence({ url: documentObject?.location?.href, title: documentObject?.title });
  const all = [];
  const pendingRoots = [body];
  while (pendingRoots.length) {
    const root = pendingRoots.shift();
    const elements = [...root.querySelectorAll('*')];
    all.push(...elements);
    for (const element of elements) {
      if (element.shadowRoot) pendingRoots.push(element.shadowRoot);
    }
  }
  const semantic = all.filter((element) => isVisible(element));
  const interactive = semantic.filter((element) => element.hasAttribute?.('data-ai-id'));
  const landmarks = semantic.filter((element) => implicitRole(element) || element.getAttribute?.('role'));

  const actions = interactive.map((element) => compactRecord({
    name: accessibleName(element) || implicitRole(element) || String(element.tagName || '').toLowerCase(),
    target: targetId(element),
    role: element.getAttribute?.('role') || implicitRole(element),
    type: cleanText(element.getAttribute?.('type'), 40),
    href: cleanText(element.href, 1_000),
    bounds: visualBounds(element),
    disabled: Boolean(element.disabled || element.getAttribute?.('aria-disabled') === 'true') || undefined
  }));

  const accessibilityTree = landmarks.map((element) => compactRecord({
    role: element.getAttribute?.('role') || implicitRole(element),
    name: accessibleName(element),
    target: targetId(element),
    level: /^H[1-6]$/.test(String(element.tagName)) ? Number(String(element.tagName).slice(1)) : undefined,
    checked: typeof element.checked === 'boolean' ? element.checked : undefined,
    selected: typeof element.selected === 'boolean' ? element.selected : undefined,
    expanded: element.getAttribute?.('aria-expanded') || undefined,
    bounds: visualBounds(element)
  }));

  const forms = semantic.filter((element) => String(element.tagName).toLowerCase() === 'form').map((form, index) => compactRecord({
    name: accessibleName(form) || `form-${index + 1}`,
    action: cleanText(form.action, 1_000),
    method: cleanText(form.method, 16).toUpperCase(),
    fields: [...form.querySelectorAll('input, textarea, select')].filter(isVisible).slice(0, 80).map((field) => compactRecord({
      name: accessibleName(field) || cleanText(field.name, 120),
      target: targetId(field),
      role: field.getAttribute?.('role') || implicitRole(field),
      type: cleanText(field.type, 40),
      required: Boolean(field.required) || undefined
    }))
  }));

  const sectionElements = semantic.filter((element) => ['NAV', 'MAIN', 'ARTICLE', 'SECTION', 'ASIDE', 'FOOTER', 'HEADER'].includes(element.tagName) || /^H[1-6]$/.test(element.tagName));
  const sections = sectionElements.map((element) => accessibleName(element) || implicitRole(element)).filter(Boolean);
  const content = semantic.filter((element) => ['H1', 'H2', 'H3', 'P', 'LI', 'TD', 'TH'].includes(element.tagName)).map((element) => compactRecord({
    type: String(element.tagName).toLowerCase(),
    text: cleanText(element.innerText || element.textContent, 500)
  })).filter((entry) => entry.text);
  const signals = [...sections, ...actions.slice(0, 30).map((action) => action.name)];

  return buildWebsiteIntelligence({
    url: documentObject.location?.href,
    title: documentObject.title,
    language: documentObject.documentElement?.lang,
    signals,
    sections,
    actions,
    forms,
    accessibilityTree,
    content
  });
}
