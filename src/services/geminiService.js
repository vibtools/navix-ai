import { probeProvider, runProviderRequest } from '../providers/providerRunner.js';

// Backward-compatible web/server facade. Provider behavior lives in the shared runner.
export async function generateChatResponse(rawRequest, onChunk, signal) {
  return runProviderRequest(rawRequest, { onChunk, signal });
}

export async function testProviderConnection(attempt, signal) {
  return probeProvider(attempt, { signal });
}
