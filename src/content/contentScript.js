import { ensureUniqueInteractiveIds, queryInteractiveElements } from './domIdentity.js';
import { collectWebsiteIntelligence } from './webIntelligence.js';

function queryAllDeep(selector, root = document) {
  const matches = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.shift();
    if (!current?.querySelectorAll) continue;
    matches.push(...current.querySelectorAll(selector));
    for (const element of current.querySelectorAll('*')) {
      if (element.shadowRoot) pending.push(element.shadowRoot);
    }
  }
  return matches;
}

function nextPaint() {
  return new Promise((resolve) => {
    globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve));
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // Robust selector function that handles data-ai-id, CSS selectors, and fuzzy attribute/text matching
    const findElement = (selector) => {
      if (!selector) return { el: null };
      const chooseUnique = (matches) => {
        if (matches.length === 1) return { el: matches[0] };
        if (matches.length > 1) {
          return { error: `Selector is ambiguous and matches ${matches.length} elements: ${selector}`, code: 'DOM_TARGET_AMBIGUOUS' };
        }
        return null;
      };
      
      // 1. Check for pure numeric data-ai-id
      if (/^\d+$/.test(selector)) {
        const match = chooseUnique(queryAllDeep(`[data-ai-id="${selector}"]`));
        if (match) return match;
      }
      
      // 2. Try standard CSS querySelector
      try {
        const match = chooseUnique(queryAllDeep(selector));
        if (match) return match;
      } catch(e) {
        // Selector was invalid CSS, we will fallback to fuzzy matching
      }
      
      // 3. Fuzzy matching across common interactive attributes
      const lowerSelector = selector.toLowerCase().trim();
      const interactives = queryInteractiveElements(document);
      
      // Phase A: Exact match on important attributes or text
      const exactMatches = [];
      for (const el of interactives) {
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        const text = (el.textContent || '').toLowerCase().trim();
        
        if (
          ariaLabel === lowerSelector || 
          name === lowerSelector || 
          placeholder === lowerSelector || 
          id === lowerSelector ||
          text === lowerSelector ||
          type === lowerSelector
        ) {
          exactMatches.push(el);
        }
      }
      const exact = chooseUnique(exactMatches);
      if (exact) return exact;
      
      // Phase B: Partial match fallback
      const partialMatches = [];
      for (const el of interactives) {
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const text = (el.textContent || '').toLowerCase().trim();
        
        if (
          (ariaLabel && ariaLabel.includes(lowerSelector)) || 
          (name && name.includes(lowerSelector)) || 
          (placeholder && placeholder.includes(lowerSelector)) || 
          (text && text.includes(lowerSelector))
        ) {
          partialMatches.push(el);
        }
      }
      const partial = chooseUnique(partialMatches);
      if (partial) return partial;
      
      return { el: null };
    };

    const targetDetails = (el) => {
      if (!el) return null;
      const form = el.form || el.closest?.('form');
      const href = el.href || el.closest?.('a[href]')?.href || '';
      const details = {
        tag: String(el.tagName || '').toLowerCase(),
        type: String(el.getAttribute?.('type') || ''),
        name: String(el.getAttribute?.('name') || ''),
        ariaLabel: String(el.getAttribute?.('aria-label') || ''),
        text: String(el.innerText || el.value || el.textContent || '').trim().slice(0, 240),
        href,
        formAction: String(form?.action || ''),
        formMethod: String(form?.method || '').toUpperCase(),
        isPassword: el.getAttribute?.('type') === 'password',
        isSubmit: ['submit', 'image'].includes(el.getAttribute?.('type')) || String(el.tagName).toLowerCase() === 'button' && (!el.getAttribute?.('type') || el.getAttribute?.('type') === 'submit'),
        disabled: Boolean(el.disabled || el.getAttribute?.('aria-disabled') === 'true'),
        hidden: !(el.getClientRects?.().length) || window.getComputedStyle(el).visibility === 'hidden'
      };
      details.fingerprint = JSON.stringify([details.tag, details.type, details.name, details.ariaLabel, details.text, details.href, details.formAction]);
      return details;
    };

    const verifiedTarget = (selector) => {
      const match = findElement(selector);
      if (match.error) return match;
      const el = match.el;
      if (!el) return { error: `Element not found: ${selector}` };
      const target = targetDetails(el);
      if (request.expectedTarget && request.expectedTarget !== target.fingerprint) {
        return { error: 'Element changed after approval.', code: 'DOM_TARGET_STALE' };
      }
      if (target.disabled || target.hidden) return { error: 'The selected element is disabled or not visible.', code: 'DOM_TARGET_STALE' };
      return { el, target };
    };

    if (request.action === 'inspect_target') {
      const result = verifiedTarget(request.args?.selector);
      if (result.error) sendResponse({ success: false, code: result.code || 'DOM_TARGET_STALE', error: result.error });
      else sendResponse({ success: true, target: result.target });
    }
    else if (request.action === "get_page_context" || request.action === "read_page") {
      ensureUniqueInteractiveIds(document);
      const website = collectWebsiteIntelligence(document);
      sendResponse({ 
        success: true,
        text: website.serialized,
        intelligence: website.intelligence,
        characterCount: website.characterCount,
        truncated: website.truncated,
        title: document.title, 
        url: window.location.href 
      });
    } 
    else if (request.action === "click_element") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        nextPaint().then(() => {
          try {
            const current = verifiedTarget(request.args.selector);
            if (!current.el) {
              sendResponse({ success: false, error: current.error, code: current.code || 'DOM_TARGET_STALE' });
              return;
            }
            current.el.click();
            sendResponse({ success: true, message: `Clicked element ${request.args.selector}` });
          } catch(e) {
            sendResponse({ success: false, error: `Error clicking element ${request.args.selector}: ${e.message}` });
          }
        });
      } else {
        sendResponse({ success: false, error: verified.error, code: verified.code });
      }
    } 
    else if (request.action === "type_text") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        nextPaint().then(() => {
          try {
            const current = verifiedTarget(request.args.selector);
            if (!current.el) {
              sendResponse({ success: false, error: current.error, code: current.code || 'DOM_TARGET_STALE' });
              return;
            }
            const targetElement = current.el;
            targetElement.focus();
            // Use native value setter for React/Vue compatibility
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            )?.set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              "value"
            )?.set;

            const textToType = request.args.text;
            if (targetElement.tagName === 'SELECT') {
              const option = [...targetElement.options].find((entry) => entry.value === textToType || entry.text.trim().toLowerCase() === textToType.trim().toLowerCase());
              if (!option) throw new Error(`No option matching "${textToType}" was found.`);
              targetElement.value = option.value;
            } else if (targetElement.isContentEditable) {
              targetElement.textContent = textToType;
            } else if (targetElement.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
              nativeTextAreaValueSetter.call(targetElement, textToType);
            } else if (nativeInputValueSetter) {
              nativeInputValueSetter.call(targetElement, textToType);
            } else {
              targetElement.value = textToType;
            }

            targetElement.dispatchEvent(new globalThis.InputEvent('input', { bubbles: true, inputType: 'insertText', data: textToType }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));

            globalThis.requestAnimationFrame(() => {
              const currentValue = targetElement.isContentEditable ? targetElement.textContent : targetElement.value || "";
              if (currentValue === textToType || currentValue.includes(textToType) || targetElement.tagName === 'SELECT' && targetElement.selectedOptions?.[0]?.text.trim().toLowerCase() === textToType.trim().toLowerCase()) {
                sendResponse({ success: true, message: `Successfully typed text into ${request.args.selector}` });
              } else {
                sendResponse({ success: false, error: `Verification failed for ${request.args.selector}. The form rejected or changed the supplied value.`, code: 'TOOL_RESULT_UNVERIFIED' });
              }
            });
          } catch(err) {
             sendResponse({ success: false, error: `Error typing in ${request.args.selector}: ${err.message}` });
          }
        });
      } else {
        sendResponse({ success: false, error: verified.error, code: verified.code });
      }
    }
    else if (request.action === "press_enter") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.focus();
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        sendResponse({ success: true, message: `Pressed Enter on ${request.args.selector}` });
      } else {
        sendResponse({ success: false, error: verified.error, code: verified.code });
      }
    }
    else {
      sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
  return true; // Keep channel open
});
