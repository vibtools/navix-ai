export function createWebsiteSummaryPrompt(pageData) {
  return `Analyze this website and provide a concise summary.\n\nTitle: ${pageData.title}\nURL: ${pageData.url}\nContent:\n${pageData.text}`;
}
