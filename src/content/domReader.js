// Current page DOM reader foundation

export function readCurrentPage() {
  return {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText.slice(0, 5000),
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(e => e.innerText)
  };
}
