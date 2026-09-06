import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = Number.parseInt(process.env.NAVIX_SMOKE_PORT || '3100', 10);
const child = spawn(process.execPath, ['dist/server.cjs'], {
  cwd: process.cwd(),
  env: { 
    ...process.env, 
    NODE_ENV: 'production', 
    PORT: String(port),
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    HUGGINGFACE_API_KEY: ''
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString(); });
child.stderr.on('data', (chunk) => { output += chunk.toString(); });
child.on('error', (error) => { output += `${error.message}\n`; });

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await new Promise((resolve) => { setTimeout(resolve, 100); });
  }
  throw new Error(`Server did not become ready. Output: ${output}`);
}

async function stopServer() {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 2_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

try {
  await waitForServer();
  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type') || '', /text\/html/i);
  const provider = await fetch(`http://127.0.0.1:${port}/api/provider/test`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ attempt: { provider: 'gemini', modelId: 'gemini-2.5-flash' } })
  });
  assert.equal(provider.status, 400);
  const payload = await provider.json();
  assert.equal(payload.error?.code, 'PROVIDER_AUTH_FAILED');
  assert.doesNotMatch(JSON.stringify(payload), /(?:AIza|sk-|hf_)[A-Za-z0-9_-]{8,}/);
  console.log(`Production server smoke passed on port ${port}.`);
} finally {
  await stopServer();
}
