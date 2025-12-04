# PrimeCars Frontend Chat Widget

This guide explains how the PrimeCars landing page connects to the customer-support agent exposed at `/api/v1/agent/chat` and `/api/v1/agent/chat-stateless`.

## Overview
- The widget is rendered by `js/chat-widget.js` and styled by `css/chat-widget.css`.
- It loads React and ReactDOM from their public UMD builds and mounts into a dynamic `<div id="pc-chat-widget-root">` at the end of `index.html`.
- State is persisted in `sessionStorage` so the conversation and `session_id` survive page reloads during the same browser session.
- The UI shows a typing indicator, handles network errors with a friendly fallback, and **never** sends internal keys.

## Configuration
- `VITE_API_BASE_URL`: optional base URL for the backend (e.g., `https://primecars.example.com`). If omitted, the widget calls the same-origin `/api/v1/agent/chat` endpoint.
- `VITE_CHAT_USE_STATELESS`: set to `true` to call `/api/v1/agent/chat-stateless` instead of the stateful endpoint.

Expose these values via the `window.ENV` object before loading `chat-widget.js`, for example:

```html
<script>
  window.ENV = {
    VITE_API_BASE_URL: 'https://primecars.example.com',
    VITE_CHAT_USE_STATELESS: 'false'
  };
</script>
```

## Payload contract
User messages send:

```json
{
  "user_id": "web-user",
  "session_id": "<existing or empty>",
  "message": "<texto>"
}
```

Responses expected:

```json
{
  "session_id": "...",
  "response": "..."
}
```

The widget preserves the `session_id` returned by the backend (unless stateless mode is enabled) and appends each reply to the local history.

## Error handling and fallbacks
- Network failures or empty responses display a friendly fallback message in the chat and keep the conversation open for retry.
- The widget shows a typing indicator while waiting for the backend response.
- No `X-Internal-Key` is sent; only the public endpoint is used.
