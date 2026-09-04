// Browser Action Engine

export function executeBrowserAction(action) {
  switch (action.type) {
    case 'CLICK': {
      const element = document.querySelector(action.selector);
      if (!element) throw new Error('Element not found');
      element.click();
      return { success: true, action: 'CLICK' };
    }

    case 'TYPE': {
      const element = document.querySelector(action.selector);
      if (!element) throw new Error('Input not found');
      element.focus();
      element.value = action.value || '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return { success: true, action: 'TYPE' };
    }

    case 'SCROLL': {
      window.scrollBy(0, action.amount || 500);
      return { success: true, action: 'SCROLL' };
    }

    default:
      throw new Error('Unsupported browser action');
  }
}
