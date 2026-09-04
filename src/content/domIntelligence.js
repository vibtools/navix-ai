// DOM Intelligence Engine

export function analyzeDOM() {
  const elements = [...document.querySelectorAll('button, input, textarea, select, a')]
    .slice(0, 200)
    .map((element, index) => ({
      id: index,
      tag: element.tagName.toLowerCase(),
      type: element.type || null,
      text: element.innerText || element.placeholder || element.value || '',
      name: element.name || null,
      ariaLabel: element.getAttribute('aria-label') || null
    }));

  return {
    title: document.title,
    url: window.location.href,
    forms: document.forms.length,
    elements
  };
}
