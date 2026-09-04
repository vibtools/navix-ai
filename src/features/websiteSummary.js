// First live command: Website Summary

export function buildWebsiteSummaryPrompt(pageData) {
  return `Analyze this website and provide a clear summary.

Title: ${pageData.title}
URL: ${pageData.url}
Content:
${pageData.text}`;
}
