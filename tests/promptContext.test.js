import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPromptContext } from '../src/core/promptContext.js';

test('prompt inputs are structured and included exactly once', () => {
  const prompt = buildPromptContext({
    message: 'Question',
    systemPrompt: 'System alpha',
    customInstruction: 'Custom beta',
    customInstructionsEnabled: true,
    responseLanguage: 'Bangla',
    pageContext: 'Page gamma',
    attachments: [{ name: 'file.txt', content: 'File delta' }],
    screenshotDataUrl: 'data:image/jpeg;base64,abc'
  });
  for (const expected of ['System alpha', 'Custom beta', 'Respond in Bangla.']) {
    assert.equal(prompt.systemInstruction.split(expected).length - 1, 1);
  }
  for (const expected of ['Question', 'Page gamma', 'File delta']) {
    assert.equal(prompt.userText.split(expected).length - 1, 1);
  }
  assert.equal(prompt.screenshotDataUrl, 'data:image/jpeg;base64,abc');
});

test('disabled custom instructions are not applied', () => {
  const prompt = buildPromptContext({
    message: 'Question',
    customInstruction: 'Do not include me',
    customInstructionsEnabled: false
  });
  assert.doesNotMatch(prompt.systemInstruction, /Do not include me/);
});
