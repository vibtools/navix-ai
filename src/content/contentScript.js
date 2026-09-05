import { ensureUniqueInteractiveIds } from './domIdentity.js';

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
        const match = chooseUnique([...document.querySelectorAll(`[data-ai-id="${selector}"]`)]);
        if (match) return match;
      }
      
      // 2. Try standard CSS querySelector
      try {
        const match = chooseUnique([...document.querySelectorAll(selector)]);
        if (match) return match;
      } catch(e) {
        // Selector was invalid CSS, we will fallback to fuzzy matching
      }
      
      // 3. Fuzzy matching across common interactive attributes
      const lowerSelector = selector.toLowerCase().trim();
      const interactives = document.querySelectorAll('a, button, input, textarea, select, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
      
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
      // Assign unique IDs to interactive elements in the live DOM for reliable AI targeting
      ensureUniqueInteractiveIds(document);

      // Extract visible text and structure
      const clone = document.body.cloneNode(true);
      
      // Remove noisy elements
      const elementsToRemove = clone.querySelectorAll('script, style, noscript, iframe, svg, path, symbol, defs');
      elementsToRemove.forEach(el => el.remove());
      
      // Basic structure extraction
      let structureText = "";
      const walkDOM = (node, depth = 0) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text) structureText += "  ".repeat(depth) + text + "\n";
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          const aiId = node.getAttribute('data-ai-id');
          const id = node.id ? `#${node.id}` : "";
          const role = node.getAttribute('role') ? ` [role="${node.getAttribute('role')}"]` : "";
          const ariaLabel = node.getAttribute('aria-label') ? ` [aria-label="${node.getAttribute('aria-label')}"]` : "";
          const nameAttr = node.getAttribute('name') ? ` [name="${node.getAttribute('name')}"]` : "";
          
          const isInteractive = aiId !== null;
          
          if (['h1','h2','h3','h4','h5','h6','p','article','section','nav','main'].includes(tag) || isInteractive) {
             let nodeInfo = `<${tag}`;
             if (aiId) nodeInfo += ` data-ai-id="${aiId}"`; // ALWAYS show data-ai-id if present
             if (id && !aiId) nodeInfo += id; // only show id if no ai-id to save space
             nodeInfo += `${role}${ariaLabel}${nameAttr}>`;
             
             if (tag === 'a' && node.href) nodeInfo += ` [href="${node.href.replace(window.location.origin, '')}"]`;
             if (tag === 'img' && node.src) nodeInfo += ` [alt="${node.alt || ''}"]`;
             if (['input', 'textarea'].includes(tag)) nodeInfo += ` [type="${node.type}"] [placeholder="${node.placeholder || ''}"]`;
             
             structureText += "  ".repeat(depth) + nodeInfo + "\n";
             
             for (let i = 0; i < node.childNodes.length; i++) {
               walkDOM(node.childNodes[i], depth + 1);
             }
             
             structureText += "  ".repeat(depth) + `</${tag}>\n`;
          } else {
             for (let i = 0; i < node.childNodes.length; i++) {
               walkDOM(node.childNodes[i], depth);
             }
          }
        }
      };
      
      walkDOM(clone);
      
      // Truncate if too large to fit in context window gracefully
      if (structureText.length > 80000) {
        structureText = structureText.substring(0, 80000) + "\n...[truncated]";
      }
      
      sendResponse({ 
        text: structureText, 
        title: document.title, 
        url: window.location.href 
      });
    } 
    else if (request.action === "click_element") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // slight delay to allow scroll
        setTimeout(() => {
          try {
            el.click();
            sendResponse({ success: true, message: `Clicked element ${request.args.selector}` });
          } catch(e) {
            sendResponse({ error: `Error clicking element ${request.args.selector}: ${e.message}` });
          }
        }, 300);
      } else {
        sendResponse({ error: verified.error, code: verified.code });
      }
    } 
    else if (request.action === "type_text") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          try {
            el.focus();
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
            if (el.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
              nativeTextAreaValueSetter.call(el, textToType);
            } else if (nativeInputValueSetter) {
              nativeInputValueSetter.call(el, textToType);
            } else {
              el.value = textToType;
            }
            
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Verification step to ensure value was set correctly
            setTimeout(() => {
              const currentValue = el.value || "";
              if (currentValue === textToType || currentValue.includes(textToType)) {
                sendResponse({ success: true, message: `Successfully typed text into ${request.args.selector}` });
              } else {
                sendResponse({ error: `Verification failed for ${request.args.selector}. Expected "${textToType}", but got "${currentValue}". Form may be rejecting input.` });
              }
            }, 150);
          } catch(err) {
             sendResponse({ error: `Error typing in ${request.args.selector}: ${err.message}` });
          }
        }, 300);
      } else {
        sendResponse({ error: verified.error, code: verified.code });
      }
    }
    else if (request.action === "press_enter") {
      const verified = verifiedTarget(request.args.selector);
      const el = verified.el;
      if (el) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        // Sometimes forms listen to submit or keypress
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
        sendResponse({ success: true, message: `Pressed Enter on ${request.args.selector}` });
      } else {
        sendResponse({ error: verified.error, code: verified.code });
      }
    }
    else {
      sendResponse({ error: "Unknown action" });
    }
  } catch (err) {
    sendResponse({ error: err.message });
  }
  return true; // Keep channel open
});
