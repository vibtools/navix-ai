import React, { useState } from 'react';
import { Check, KeyRound, LockKeyhole, ShieldAlert, X } from 'lucide-react';

export function ActionConfirmationDialog({ confirmation, onDecision }) {
  const [busy, setBusy] = useState(false);
  if (!confirmation) return null;
  const decide = async (approved) => {
    setBusy(true);
    try { await onDecision(approved); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="action-confirmation-title">
      <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700"><ShieldAlert className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <h3 id="action-confirmation-title" className="text-sm font-semibold text-slate-900">Approve browser action</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{confirmation.reason}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-[11px]">
          <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Risk</dt><dd className="mt-0.5 text-slate-700">{confirmation.risk}</dd></div>
          <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Action</dt><dd className="mt-0.5 break-words font-mono text-slate-700">{confirmation.action?.name}</dd></div>
          {confirmation.action?.target && <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Target</dt><dd className="mt-0.5 break-words text-slate-700">{confirmation.action.target}</dd></div>}
          {confirmation.action?.destination && <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Destination</dt><dd className="mt-0.5 break-all text-slate-700">{confirmation.action.destination}</dd></div>}
          {confirmation.action?.text && <div><dt className="font-semibold uppercase tracking-wide text-slate-400">Data</dt><dd className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-slate-700">{confirmation.action.text}</dd></div>}
        </dl>
        <div className="mt-4 flex justify-end gap-2">
          <button disabled={busy} onClick={() => decide(false)} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"><X className="h-3.5 w-3.5" />Deny</button>
          <button disabled={busy} onClick={() => decide(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" />Approve once</button>
        </div>
      </div>
    </div>
  );
}

export function CredentialVaultDialog({ mode, error, onSessionOnly, onEncrypt, onUnlock, onClose }) {
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action) => {
    setBusy(true);
    try { await action(passphrase); } finally { setBusy(false); }
  };
  const encrypted = mode === 'encrypted';
  return (
    <div className="fixed inset-0 z-[75] bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="vault-title">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3"><div className="rounded-lg bg-blue-100 p-2 text-blue-700">{encrypted ? <LockKeyhole className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</div><div><h3 id="vault-title" className="text-sm font-semibold text-slate-900">{encrypted ? 'Unlock credential vault' : 'Secure stored API keys'}</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-500">{encrypted ? 'Enter the vault passphrase. It stays in memory only.' : 'Legacy plaintext keys were detected. Choose session-only storage or encrypt them with a passphrase.'}</p></div></div>
          {onClose && <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
        </div>
        <input type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" placeholder="Vault passphrase (10+ characters)" className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
        {error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-[11px] text-red-700">{error}</p>}
        <div className="mt-4 flex flex-col gap-2">
          {encrypted ? (
            <button disabled={busy || passphrase.length < 10} onClick={() => run(onUnlock)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Unlock</button>
          ) : (
            <>
              <button disabled={busy || passphrase.length < 10} onClick={() => run(onEncrypt)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">Encrypt and migrate</button>
              <button disabled={busy} onClick={() => run(onSessionOnly)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-40">Use session-only storage</button>
            </>
          )}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">Session-only keys are cleared when Chrome restarts. A lost encrypted-vault passphrase cannot be recovered; clear the vault and re-enter keys.</p>
      </div>
    </div>
  );
}
