# Error Taxonomy and Recovery UX (Epic 7.1)

## Purpose
Define a consistent error model for generation, send, auth, and data operations so the UI can always show clear next actions.

## Severity Classes

| Class | Recoverable | UX Pattern | Retry Strategy |
| --- | --- | --- | --- |
| ValidationError | Yes | Inline field error or toast | User fixes input and retries |
| AuthExpiredError | Yes | Toast + redirect/CTA to reconnect/login | Re-auth and retry |
| ProviderTransientError | Yes | Toast with retry guidance | Automatic retry (when safe) or manual retry |
| NotFoundError | Conditional | Toast + navigation hint | Refresh state or return to parent screen |
| ConflictError | Conditional | Toast with state explanation | Refresh state and retry if still valid |
| PermissionError | No | Blocking message/toast | No retry; require owner/admin action |
| ProviderFatalError | No | Toast + support/log reference | No immediate retry |
| InternalError | Conditional | Generic toast + logged context | Retry once; escalate if repeated |

## Domain Mapping

| Domain | Typical Failure | Class | Recoverable | User Message Pattern |
| --- | --- | --- | --- | --- |
| Generation (`draft_generate`) | Missing style email/missionary input | ValidationError | Yes | "Complete os campos obrigatórios e tente novamente." |
| Generation (`draft_generate`) | OpenAI/provider timeout | ProviderTransientError | Yes | "Houve uma falha temporária ao gerar. Tente novamente." |
| Send (`campaign_send`) | Gmail not connected | AuthExpiredError | Yes | "Conecte o Gmail em Configurações e tente novamente." |
| Send (`campaign_send`) | Campaign not approved | ConflictError | Conditional | "A campanha precisa estar aprovada antes do envio." |
| Send (`campaign_send`) | Recipient-specific Gmail failure | ProviderTransientError | Yes | "Alguns destinatários falharam. Reenvie para os que falharam." |
| OAuth (`oauth_google_callback`) | Invalid callback/user profile payload | ProviderFatalError | No | "Não foi possível concluir a conexão com o Google." |
| Data ops (Supabase CRUD) | RLS denial | PermissionError | No | "Você não tem permissão para esta ação." |
| Data ops (Supabase CRUD) | Record missing/stale | NotFoundError | Conditional | "Registro não encontrado. Atualize e tente novamente." |

## Recovery Rules
- Recoverable errors must always provide a concrete next action (retry, reconnect, refresh, or edit input).
- Non-recoverable errors must avoid infinite retry loops and should preserve relevant context in logs.
- Partial send failures are recoverable at recipient level and should not be treated as full campaign fatal errors.
- Unknown errors default to `InternalError` with a generic user-safe message and structured server logs.

## UX Enforcement
- Use `useToast()` for non-blocking recoverable/non-recoverable feedback.
- Use `useConfirm()` only for destructive user decisions, not error delivery.
- Do not use browser-native `alert()` or `confirm()` in `src/`.
