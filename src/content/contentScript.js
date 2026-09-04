chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "get_page_context" || request.action === "read_page") {
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
          const id = node.id ? `#${node.id}` : "";
          const classNames = node.className && typeof node.className === 'string' ? `.${node.className.split(' ').filter(c => c).join('.')}` : "";
          
          // Only add structure lines for semantic tags or tags with IDs/classes
          if (['h1','h2','h3','h4','h5','h6','p','a','button','input','select','textarea','article','section','nav','main'].includes(tag) || id) {
             let nodeInfo = `<${tag}${id}${classNames.substring(0, 50)}${classNames.length > 50 ? '...' : ''}>`;
             if (tag === 'a' && node.href) nodeInfo += ` [href="${node.href}"]`;
             if (tag === 'img' && node.src) nodeInfo += ` [src="${node.src}"] [alt="${node.alt || ''}"]`;
             if (['input', 'textarea'].includes(tag)) nodeInfo += ` [type="${node.type}"] [name="${node.name}"] [placeholder="${node.placeholder || ''}"]`;
             
             structureText += "  ".repeat(depth) + nodeInfo + "\n";
             
             // Process children with increased depth
             for (let i = 0; i < node.childNodes.length; i++) {
               walkDOM(node.childNodes[i], depth + 1);
             }
             
             structureText += "  ".repeat(depth) + `</${tag}>\n`;
          } else {
             // For divs and spans, just process children without adding depth
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
      const el = document.querySelector(request.args.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // slight delay to allow scroll
        setTimeout(() => {
          el.click();
          sendResponse({ success: true, message: `Clicked element ${request.args.selector}` });
        }, 300);
      } else {
        sendResponse({ error: `Element not found: ${request.args.selector}` });
      }
    } 
    else if (request.action === "type_text") {
      const el = document.querySelector(request.args.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.focus();
          el.value = request.args.text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          sendResponse({ success: true, message: `Typed text into ${request.args.selector}` });
        }, 300);
      } else {
        sendResponse({ error: `Element not found: ${request.args.selector}` });
      }
    }
    else if (request.action === "press_enter") {
      const el = document.querySelector(request.args.selector);
      if (el) {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
        // Sometimes forms listen to submit or keypress
        el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
        sendResponse({ success: true, message: `Pressed Enter on ${request.args.selector}` });
      } else {
        sendResponse({ error: `Element not found: ${request.args.selector}` });
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
