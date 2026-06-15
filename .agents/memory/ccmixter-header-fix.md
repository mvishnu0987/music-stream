---
name: ccMixter API header overflow fix
description: How we fixed Node.js HTTP header overflow errors when fetching from ccmixter.org
---

## The Problem
ccmixter.org sends oversized HTTP response headers (>16KB default, possibly 128KB–1MB).
This causes `Parse Error: Header overflow` from Node's built-in `http`/`https` client,
and `HeadersOverflowError` from `fetch` (undici).

## The Fix (all three parts required)

1. **Global flag**: Add `--max-http-header-size=1048576` to the Node.js start command in `package.json`.
2. **SSL cert**: ccmixter.org's HTTPS cert is expired — use `new https.Agent({ rejectUnauthorized: false })` and pass it as `agent` in request options.
3. **Do NOT set per-request `maxHeaderSize`**: Setting `maxHeaderSize: N` in `http.request`/`https.request` options OVERRIDES the global flag with a lower value, defeating the fix.

**Why:** The per-request option overrides the global `--max-http-header-size` flag, so if you set it lower than the global, the overflow still occurs. The global flag is the only reliable way to raise the parser limit.

**How to apply:** When fetching from ccmixter in `artifacts/api-server/src/routes/music.ts`, use only the agent option (no per-request maxHeaderSize). The server start script must include `--max-http-header-size=1048576`.
