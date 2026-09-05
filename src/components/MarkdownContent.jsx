import React from 'react';
import ReactMarkdown from 'react-markdown';
import { extractArtifacts } from '../capabilities/artifacts.js';
import { isSafeRenderedUrl } from '../core/trustBoundary.js';

const CodeHighlighter = React.lazy(async () => {
  const [
    { default: PrismLight },
    { default: vscDarkPlus },
    { default: javascript },
    { default: jsx },
    { default: typescript },
    { default: tsx },
    { default: json },
    { default: css },
    { default: markup },
    { default: bash },
    { default: python },
    { default: sql },
    { default: markdown },
    { default: yaml }
  ] = await Promise.all([
    import('react-syntax-highlighter/dist/esm/prism-light.js'),
    import('react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/javascript.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/jsx.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/typescript.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/tsx.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/json.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/css.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/markup.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/bash.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/python.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/sql.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/markdown.js'),
    import('react-syntax-highlighter/dist/esm/languages/prism/yaml.js')
  ]);
  const languages = { javascript, js: javascript, jsx, typescript, ts: typescript, tsx, json, css, html: markup, xml: markup, markup, bash, sh: bash, shell: bash, python, py: python, sql, markdown, md: markdown, yaml, yml: yaml };
  for (const [name, grammar] of Object.entries(languages)) PrismLight.registerLanguage(name, grammar);
  return {
    default: function HighlightedCode(props) {
      return <PrismLight {...props} style={vscDarkPlus} />;
    }
  };
});

export default function MarkdownContent({ text, artifactsEnabled = false, onArtifactOpen }) {
  const artifacts = artifactsEnabled ? extractArtifacts(text) : [];

  return (
    <div className="markdown-body text-[13px]">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <React.Suspense fallback={<pre className="rounded-md bg-slate-800 p-3 !mt-2 !mb-2 !text-[12px]"><code>{String(children).replace(/\n$/, '')}</code></pre>}>
                <CodeHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-md !mt-2 !mb-2 !text-[12px]"
                />
              </React.Suspense>
            ) : (
              <code {...props} className={`${className || ''} bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[12px] break-all`}>
                {children}
              </code>
            );
          },
          a({ href, children }) {
            return isSafeRenderedUrl(href)
              ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a>
              : <span title="Blocked unsafe link">{children}</span>;
          },
          img({ alt }) {
            return <span className="inline-flex rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700" title="Remote images are blocked to prevent tracking and data exfiltration">[Remote image blocked{alt ? `: ${alt}` : ''}]</span>;
          }
        }}
      >
        {text}
      </ReactMarkdown>
      {artifacts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {artifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              onClick={() => onArtifactOpen?.(artifact)}
              className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-100"
            >
              Open {artifact.language} artifact
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
