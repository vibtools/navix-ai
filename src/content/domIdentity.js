export const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

export function ensureUniqueInteractiveIds(root = document) {
  const elements = Array.from(root.querySelectorAll(INTERACTIVE_SELECTOR));
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

