import { AppError, ErrorCode } from './errorContract.js';

export const ActionRisk = Object.freeze({
  READ_ONLY: 'read-only',
  STATE_CHANGING: 'state-changing',
  SENSITIVE: 'sensitive',
  DESTRUCTIVE: 'destructive'
});

const SEARCH_ENGINES = Object.freeze({
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q='
});

const DESTRUCTIVE_WORDS = /\b(delete|remove|erase|destroy|cancel subscription|close account|purchase|buy now|pay|transfer|send money|publish|post publicly)\b/i;
const SENSITIVE_WORDS = /\b(submit|sign in|log in|login|authorize|allow|grant|confirm|send|upload|save|checkout|password|passcode|token|secret|credit|card|bank|ssn|national id)\b/i;

function boundedString(value, field, maxLength) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, `${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(normalized)) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, `${field} is invalid or exceeds its safe limit.`);
  }
  return normalized;
}

export function validateNavigationUrl(value) {
  const raw = boundedString(value, 'Navigation URL', 4096);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (cause) {
    throw new AppError(ErrorCode.UNSAFE_URL, 'Navigation requires a valid absolute HTTP or HTTPS URL.', { cause });
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new AppError(ErrorCode.UNSAFE_URL, 'This navigation target is blocked by the browser-action policy.');
  }
  return parsed.href;
}

export function validateSelector(value) {
  const selector = boundedString(value, 'Element selector', 512);
  if (/^(?:javascript|data|file):/i.test(selector)) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The element selector contains a blocked protocol.');
  }
  return selector;
}

export function normalizeBrowserAction(name, rawArgs = {}, options = {}) {
  const args = { ...rawArgs };
  if (name === 'google_search' || name === 'web_search') {
    const engine = Object.hasOwn(SEARCH_ENGINES, options.searchEngine) ? options.searchEngine : 'google';
    const query = boundedString(args.query, 'Search query', 2048);
    return {
      name: 'web_search',
      args: { query, engine, url: `${SEARCH_ENGINES[engine]}${encodeURIComponent(query)}` }
    };
  }
  if (name === 'navigate') return { name, args: { url: validateNavigationUrl(args.url) } };
  if (name === 'read_page') return { name, args: {} };
  if (['click_element', 'press_enter'].includes(name)) {
    return { name, args: { selector: validateSelector(args.selector) } };
  }
  if (name === 'type_text') {
    return {
      name,
      args: {
        selector: validateSelector(args.selector),
        text: boundedString(args.text, 'Text input', 20_000)
      }
    };
  }
  throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider requested an unknown browser tool.');
}

function targetSummary(target = {}) {
  return [target.text, target.ariaLabel, target.name, target.type, target.href, target.formAction]
    .filter(Boolean)
    .join(' ')
    .slice(0, 1000);
}

function httpOrigin(value, base) {
  try {
    const parsed = base ? new URL(value, base) : new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

export function classifyBrowserAction(action, context = {}) {
  const target = context.target || {};
  const summary = targetSummary(target);
  if (action.name === 'read_page') {
    return { risk: ActionRisk.READ_ONLY, requiresConfirmation: false, reason: 'Reads visible page context only.' };
  }
  if (action.name === 'type_text' || action.name === 'press_enter' || target.isPassword) {
    return { risk: ActionRisk.SENSITIVE, requiresConfirmation: true, reason: 'Writes or submits data on the active page.' };
  }
  if (action.name === 'web_search') {
    return { risk: ActionRisk.SENSITIVE, requiresConfirmation: true, reason: `Sends the query to ${action.args.engine}.` };
  }
  if (action.name === 'navigate') {
    const currentOrigin = httpOrigin(context.currentUrl);
    const targetOrigin = httpOrigin(action.args.url);
    const crossOrigin = currentOrigin !== targetOrigin;
    return {
      risk: ActionRisk.STATE_CHANGING,
      requiresConfirmation: crossOrigin,
      reason: crossOrigin ? `Navigates to a different origin: ${targetOrigin}.` : 'Navigates within the current origin.'
    };
  }
  if (action.name === 'click_element') {
    if (target.isSubmit || DESTRUCTIVE_WORDS.test(summary)) {
      return { risk: ActionRisk.DESTRUCTIVE, requiresConfirmation: true, reason: 'The target may submit, publish, purchase, or delete data.' };
    }
    const currentOrigin = httpOrigin(context.currentUrl);
    const targetOrigin = target.href ? httpOrigin(target.href, context.currentUrl) : '';
    if (SENSITIVE_WORDS.test(summary) || (targetOrigin && targetOrigin !== currentOrigin)) {
      return { risk: ActionRisk.SENSITIVE, requiresConfirmation: true, reason: 'The target may transmit data or leave the current origin.' };
    }
    return { risk: ActionRisk.STATE_CHANGING, requiresConfirmation: false, reason: 'Performs a non-submit interaction on the current page.' };
  }
  return { risk: ActionRisk.SENSITIVE, requiresConfirmation: true, reason: 'Unclassified action requires approval.' };
}

export function describeAction(action, target = {}) {
  const destination = action.args.url || target.href || target.formAction || '';
  const text = action.name === 'type_text'
    ? (target.isPassword ? `•••••••• (${action.args.text.length} characters)` : action.args.text.slice(0, 240))
    : action.args.query || '';
  return {
    name: action.name,
    selector: action.args.selector || '',
    destination,
    target: target.text || target.ariaLabel || target.name || target.type || '',
    text
  };
}
