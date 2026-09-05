import React from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { artifactExtension } from '../capabilities/artifacts.js';
import { createXlsx, serializeCsv } from '../capabilities/structuredData.js';
import { formatAnalysis } from '../capabilities/dataAnalysis.js';
import { formatEmailGroups } from '../capabilities/emailGrouper.js';

function downloadBlob(content, type, filename) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CapabilityDrawer({ item, onClose }) {
  if (!item) return null;
  const artifact = item.kind === 'artifact';
  const filename = artifact ? `navix-artifact.${artifactExtension(item.language)}` : item.name.replace(/\.[^.]+$/, '');
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/30" role="dialog" aria-modal="true">
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="flex min-w-0 items-center gap-2"><FileSpreadsheet className="h-4 w-4 shrink-0 text-blue-600" /><h3 className="truncate text-sm font-semibold text-slate-800">{artifact ? `Artifact · ${item.language}` : item.name}</h3></div><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></header>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
          {artifact ? <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-100">{item.content}</pre> : <>
            {item.analysis && <section><h4 className="mb-1.5 font-semibold text-slate-700">Local data analysis</h4><pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">{formatAnalysis(item.analysis)}</pre></section>}
            {item.emailGroups && <section><h4 className="mb-1.5 font-semibold text-slate-700">Email groups</h4><pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700">{formatEmailGroups(item.emailGroups)}</pre></section>}
            <section><h4 className="mb-1.5 font-semibold text-slate-700">Data preview</h4><div className="max-h-[42vh] overflow-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-[10px]"><tbody>{item.rows?.slice(0, 50).map((row, rowIndex) => <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-100 font-semibold' : 'border-t border-slate-100'}>{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-48 truncate px-2 py-1.5">{String(cell ?? '')}</td>)}</tr>)}</tbody></table></div></section>
          </>}
        </div>
        <footer className="flex gap-2 border-t border-slate-100 p-4">
          {artifact ? <button onClick={() => downloadBlob(item.content, 'text/plain;charset=utf-8', filename)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Download className="h-3.5 w-3.5" />Download</button> : <>
            <button onClick={() => downloadBlob(serializeCsv(item.rows || []), 'text/csv;charset=utf-8', `${filename}.csv`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"><Download className="h-3.5 w-3.5" />CSV</button>
            <button onClick={() => downloadBlob(createXlsx(item.rows || []), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', `${filename}.xlsx`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white"><Download className="h-3.5 w-3.5" />Excel</button>
          </>}
        </footer>
      </aside>
    </div>
  );
}
