# Actual Implementation Status

## Status definitions

- **Verified:** focused audit evidence exists.
- **Implemented, unverified:** production code exists but full E2E acceptance is absent.
- **Partial:** only part of the promised behavior exists.
- **Prompt-only/demo:** UI/prompt describes a capability without a complete engine.
- **Missing:** no complete implementation exists.

| Capability | Baseline status | Evidence/gap | Phase |
| --- | --- | --- | --- |
| Manifest V3 build | Verified | Clean build and manifest-reference validation pass | 01/04 gate |
| Side-panel React UI | Verified | Declared entry builds | Regression each phase |
| Settings persistence | Implemented, unverified | Completion/race/error behavior incomplete | 01 |
| Saved provider configs | Implemented, unverified | Duplicate truth sources remain | 01/02 |
| Chat history/sessions | Partial | UI persists sessions; background uses global history | 01 |
| New/Clear/Load/Delete chat | Partial | Background synchronization incomplete | 01 |
| Stop Generation | Partial | UI disconnect does not reliably abort work | 01 |
| DOM context | Implemented, unverified | Dynamic identifiers may collide | 01 |
| Navigation/Google search | Implemented, unverified | Gemini-only; safety/outcome checks incomplete | 02/03 |
| Click/type/Enter | Implemented, unverified | Ambiguity/confirmation protections absent | 01-03 |
| Gemini streaming/tools | Implemented, unverified | Retries/screenshots/tool loop exist | 02 |
| OpenAI streaming | Partial | Fragmented SSE can be lost | 02 |
| Hugging Face chat | Partial | Narrow endpoint/shape assumptions | 02 |
| Ollama chat | Partial | Environment diagnostics incomplete | 02 |
| Non-Gemini browser tools | Missing | No normalized tool loop | 02 |
| Auto fallback | Partial | Isolation and duplicate-output tests missing | 02 |
| System prompt | Partial | Stored but not consistently applied | 02 |
| Custom instruction/language | Partial | Context-based; consistency/trust boundary incomplete | 02/03 |
| Screenshot context | Partial | Gemini/OpenAI paths only | 02 |
| Text attachment | Implemented, unverified | Limits/privacy/error contract incomplete | 03 |
| PDF extraction | Implemented, unverified | E2E/resource tests missing | 03/04 |
| Image OCR | Implemented, unverified | Resource/failure tests missing | 03/04 |
| Copy response | Verified in source/build | Clipboard API and fallback exist | Regression each phase |
| Search engine choice | Partial | Browser action is Google-specific | 02/03 |
| Data analysis | Prompt-only/demo | No computation engine | 03 |
| Artifacts | Prompt-only/demo | No lifecycle/preview/export engine | 03 |
| Image generation | Prompt-only/demo | No provider execution | 03 |
| Name generator | Prompt-only/demo | Static sample data | 03 |
| Address generator | Prompt-only/demo | Static sample data | 03 |
| CSV/Excel/TXT tool | Prompt-only/demo | No complete read/write/export engine | 03 |
| Email grouper | Prompt-only/demo | Prompt flag only | 03 |
| Risky-action confirmation | Missing | Security principle not implemented | 03 |
| Prompt-injection protection | Missing | No enforceable trust layer | 03 |
| Unit/integration/E2E tests | Missing | Root scripts are ad hoc diagnostics | 01-04 |
| Real lint/type check | Missing | Lint script prints a message | 01 |
| Optimized extension artifact | Partial | Builds; composition/bundle need work | 04 |
| Formal release | Missing | No tag/release | 04 |

After every phase, affected rows must record new evidence, tests, limitations, and commit references. UI presence, compilation, or one successful API response is insufficient for **Verified**.

Current completion count: **0 of 4 phases**.
