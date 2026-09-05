export function groupEmailRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const headers = rows[0].map((value) => String(value).trim().toLowerCase());
  const senderIndex = headers.findIndex((value) => ['from', 'sender', 'email', 'from_email'].includes(value));
  const subjectIndex = headers.findIndex((value) => ['subject', 'title'].includes(value));
  const dateIndex = headers.findIndex((value) => ['date', 'sent', 'timestamp'].includes(value));
  if (senderIndex < 0) return [];
  const groups = new Map();
  for (const row of rows.slice(1)) {
    const sender = String(row[senderIndex] || 'Unknown').trim();
    const domain = sender.includes('@') ? sender.split('@').pop().toLowerCase() : 'unknown';
    const key = `${domain}\u0000${sender.toLowerCase()}`;
    const existing = groups.get(key) || { sender, domain, count: 0, subjects: new Set(), latest: '' };
    existing.count += 1;
    if (subjectIndex >= 0 && row[subjectIndex]) existing.subjects.add(String(row[subjectIndex]));
    if (dateIndex >= 0 && String(row[dateIndex] || '') > existing.latest) existing.latest = String(row[dateIndex]);
    groups.set(key, existing);
  }
  return [...groups.values()].map((group) => ({ ...group, subjects: [...group.subjects] })).sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender));
}

export function formatEmailGroups(groups) {
  if (!groups.length) return 'No sender column was found. Use a header named From, Sender, Email, or From_Email.';
  return groups.map((group) => `- ${group.sender} (${group.domain}): ${group.count} message(s)${group.latest ? `, latest ${group.latest}` : ''}`).join('\n');
}
