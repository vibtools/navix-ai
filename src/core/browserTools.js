import { AppError, ErrorCode } from './errorContract.js';

export const BROWSER_TOOL_DEFINITIONS = Object.freeze([
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate the active browser tab to a full URL.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Full URL to navigate to.' } },
        required: ['url'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the user-selected web search engine in the active browser tab.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query.' } },
        required: ['query'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_page',
      description: 'Read visible text from the active page.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'click_element',
      description: 'Click an element using a CSS or data-ai-id selector.',
      parameters: {
        type: 'object',
        properties: { selector: { type: 'string', description: 'Element selector.' } },
        required: ['selector'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Type text into an input using a CSS or data-ai-id selector.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string', description: 'Input selector.' },
          text: { type: 'string', description: 'Text to type.' }
        },
        required: ['selector', 'text'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'press_enter',
      description: 'Press Enter on an input using a CSS or data-ai-id selector.',
      parameters: {
        type: 'object',
        properties: { selector: { type: 'string', description: 'Input selector.' } },
        required: ['selector'],
        additionalProperties: false
      }
    }
  }
]);

const definitionsByName = new Map(BROWSER_TOOL_DEFINITIONS.map((tool) => [tool.function.name, tool.function]));
definitionsByName.set('google_search', definitionsByName.get('web_search'));

export function validateBrowserToolCall(call) {
  const definition = definitionsByName.get(call?.name);
  if (!definition) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider requested an unknown browser tool.');
  }
  const args = call.args;
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider returned invalid browser tool arguments.');
  }
  for (const key of definition.parameters.required || []) {
    if (typeof args[key] !== 'string' || !args[key].trim()) {
      throw new AppError(ErrorCode.TOOL_CALL_INVALID, `Browser tool argument ${key} is required.`);
    }
  }
  const allowed = new Set(Object.keys(definition.parameters.properties || {}));
  if (Object.keys(args).some((key) => !allowed.has(key))) {
    throw new AppError(ErrorCode.TOOL_CALL_INVALID, 'The provider returned unsupported browser tool arguments.');
  }
  return { ...call, args: { ...args } };
}

export function toGeminiTools() {
  return [{
    functionDeclarations: BROWSER_TOOL_DEFINITIONS.map(({ function: definition }) => ({
      name: definition.name,
      description: definition.description,
      parameters: {
        ...definition.parameters,
        type: 'OBJECT',
        properties: Object.fromEntries(Object.entries(definition.parameters.properties || {}).map(([key, value]) => [
          key,
          { ...value, type: String(value.type).toUpperCase() }
        ]))
      }
    }))
  }];
}
