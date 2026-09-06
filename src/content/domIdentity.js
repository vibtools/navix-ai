export const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

export function queryInteractiveElements(root = document) {
  const elements = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.shift();
    if (!current?.querySelectorAll) continue;
    const matches = [...current.querySelectorAll(INTERACTIVE_SELECTOR)];
    elements.push(...matches);
    for (const element of current.querySelectorAll('*')) {
      if (element.shadowRoot) pending.push(element.shadowRoot);
    }
  }
  return elements;
}

export function ensureUniqueInteractiveIds(root = document) {
  const elements = queryInteractiveElements(root);
  const used = new Set();
  const needsId = [];
  let maximumId = 0;

  for (const element of elements) {
    const rawId = element.getAttribute('data-ai-id');
    const numericId = /^\d+$/.test(rawId || '') ? Number(rawId) : 0;
    if (numericId > 0) maximumId = Math.max(maximumId, numericId);

    if (numericId > 0 && !used.has(numericId)) {
      used.add(numericId);
    } else {
      needsId.push(element);
    }
  }

  let nextId = Math.max(1, maximumId + 1);
  for (const element of needsId) {
    while (used.has(nextId)) nextId += 1;
    element.setAttribute('data-ai-id', String(nextId));
    used.add(nextId);
    nextId += 1;
  }

  return elements.length;
}
