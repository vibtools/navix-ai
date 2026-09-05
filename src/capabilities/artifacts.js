export function extractArtifacts(markdown) {
  const artifacts = [];
  const pattern = /```([\w.+-]*)\n([\s\S]*?)```/g;
  let match;
  while ((match = pattern.exec(String(markdown || ''))) !== null) {
    const language = (match[1] || 'text').toLowerCase();
    artifacts.push({ id: `artifact_${match.index}`, language, content: match[2].replace(/\n$/, '') });
  }
  return artifacts;
}

export function artifactExtension(language) {
  return ({ javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', json: 'json', markdown: 'md', bash: 'sh' })[language] || 'txt';
}
