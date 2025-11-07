# Atomic Fuel Runner

A tiny Chrome/Edge extension that lets you quickly fire API requests **from your browser context**, so you can:

* Reuse your current tab’s cookies/sessions (e.g., `dev.azure.com`)
* Hand‑craft headers and a raw body
* See response status, headers, and pretty‑printed JSON

Great for poking at ADO, internal APIs, or any endpoint where your browser session already has auth.

---

## Features

* **Run in active tab origin**: executes a `fetch()` in the page context so cookies and same‑site rules apply.
* **Manual headers**: paste a JSON object of headers (e.g., `{"Content-Type":"application/json"}`).
* **Raw body**: send raw text (JSON, form data, etc.).
* **Status + inspectors**: shows HTTP code, response headers, and body (auto‑pretty JSON).
* **Persists inputs**: last URL/method/headers/body are saved locally.

> ⚠️ GitHub note: `github.com` cookies do **not** authenticate `api.github.com` requests due to cross‑site rules. Use a header: `Authorization: Bearer <token>`.

---

## Repo Layout

```
├── README.md
└── api-requester
    ├── icon128.png
    ├── manifest.json
    ├── popup.html
    └── popup.js
```

---

## Install (Load Unpacked)

### Chrome

1. Clone/download this repo.
2. Go to **chrome://extensions**.
3. Toggle **Developer mode** (top‑right).
4. Click **Load unpacked** and select the `api-requester` folder.

### Microsoft Edge

1. Go to **edge://extensions**.
2. Toggle **Developer mode**.
3. Click **Load unpacked** and select the `api-requester` folder.

You should see **Atomic Fuel Runner** appear with the icon.

---

## Permissions (Manifest v3)

```json
{
  "manifest_version": 3,
  "name": "Atomic Fuel Runner",
  "version": "1.0.0",
  "action": { "default_popup": "popup.html" },
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["<all_urls>"],
  "icons": { "128": "icon128.png" }
}
```

* **activeTab + scripting**: lets the popup inject a function into the **current page** when you check **Run in active tab origin**.
* **storage**: store last used URL/method/headers/body.
* **host_permissions `<all_urls>`**: allow requests to any URL you choose.

---

## How to Use

1. Open a page on the **target origin** if you want to reuse its cookies. Examples:

   * For ADO: open any `https://dev.azure.com/<org>/...` page.
   * For your internal API: open a page on the same domain.
2. Click the extension icon to open the popup.
3. Pick a **method** and enter a **URL**.
4. **Headers (JSON object)** — examples below.
5. **Body (raw)** — for POST/PUT/PATCH/DELETE if needed (raw JSON, etc.).
6. Keep **Run in active tab origin** checked to send from the page (with cookies). Uncheck to send from the extension (usually no cookies cross‑site).
7. Click **Send**. Inspect **Status**, **Headers**, and **Body** in the popup.

### Header snippets

Minimal JSON:

```json
{"Content-Type":"application/json"}
```

JSON + Accept + charset (safe default):

```json
{
  "Content-Type": "application/json; charset=utf-8",
  "Accept": "application/json"
}
```

GitHub API with token:

```json
{
  "Authorization": "Bearer <YOUR_TOKEN>",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json"
}
```

ADO PAT (Base64 of `username:PAT`):

```json
{
  "Authorization": "Basic <BASE64>",
  "Content-Type": "application/json"
}
```

### Body examples

Create with JSON (POST):

```json
{"name":"example","enabled":true}
```

PATCH with JSON:

```json
[{"op":"add","path":"/fields/System.Title","value":"New title"}]
```

---

## Why “Run in active tab origin” matters

* When **checked**, the extension injects a small function into the current page and calls `fetch()` **from that page’s origin** with `credentials: "include"`.
* This makes the request behave like any in‑page XHR/fetch: **cookies**, **SameSite**, **CORS**, and enterprise policies all apply normally.
* When **unchecked**, the request comes from the **extension context**. Cookies usually **won’t** be sent cross‑site and CORS may block you unless the server allows it.

---

## Common Workflows

### Azure DevOps (reuse cookies)

1. Open any `dev.azure.com/<org>` page (logged in).
2. In the popup, method = GET, URL = an ADO REST endpoint (same origin).
3. Leave **Run in active tab origin** checked.
4. Headers may be empty or add `Accept: application/json`.

### GitHub API (token required)

1. Use **api.github.com** endpoints.
2. Provide a token header (see snippet above).
3. **Run in active tab origin** doesn’t grant `github.com` cookies to `api.github.com`.

---

## Troubleshooting

**Popup takes ~10 seconds to appear**

* First open after install/update can feel slow while Chrome spins up the service worker.
* Very heavy active tabs can delay `chrome.scripting.executeScript`.
* Try closing/reopening the popup or testing on a lighter page.

**401/403 even on the right page**

* Verify you’re on a page of the **exact origin** you’re calling.
* Some endpoints require **PAT/Bearer** even if you’re logged in via cookies.

**CORS errors** (when unchecked)

* If you send from the extension context, server must allow it via proper CORS headers.
* Re‑check **Run in active tab origin** to bypass CORS as the call comes from the page.

**Header JSON error**

* The **Headers** textarea must be a **JSON object**. Example: `{"Accept":"application/json"}`.

**Body not sent**

* Body is only attached for `POST`, `PUT`, `PATCH`, `DELETE` and only if the textarea is non‑empty.

---

## Security & Privacy

* No analytics, no external calls other than the requests **you trigger**.
* Your inputs (URL, method, headers, body, toggle) are stored locally via `chrome.storage.local` for convenience.
* Requests run **either** in the page (using page cookies) **or** from the extension, exactly as configured.

---

## Roadmap Ideas

* Save named request presets.
* Import/export collections.
* Auto‑format JSON body and headers.
* Syntax highlighting.

---

## Contributing

Issues and PRs welcome. Keep it tiny, sharp, and dependency‑free.

