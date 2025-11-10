# Atomic Fuel Runner (API JSON) — Chrome/Edge Side Panel Extension

> **Authorship note:** This project was primarily authored **with AI assistance** (ChatGPT). The maintainer reviewed, tested, and approved all changes.

<img width="1908" height="583" alt="screenshot" src="https://github.com/user-attachments/assets/bdc6f00e-4d92-4f9a-b3d4-0c7f5b7d7375" />

Once installed 

<img width="340" height="154" alt="image" src="https://github.com/user-attachments/assets/ff7e718a-32ad-42d3-bc9d-e3cabf96886b" />

A tiny Chrome/Edge extension that lets you quickly fire API requests **from your browser context**, so you can:

* Reuse your current tab’s cookies/sessions (e.g., `dev.azure.com`)
* Hand‑craft headers and raw body
* See response status, response headers, and pretty‑printed JSON
* Keep the tool **open and resizable** in the **Side Panel**

Great for poking at ADO, internal APIs, or any endpoint where your browser session already has auth.

---

## What’s new (Panel version)

* **Side Panel UI** (no more popup): resizable and persistent while you browse.
* **Prism** syntax highlighting for JSON responses.
* **Clear output** button.

---

## Features

* **Run in active tab origin**: executes `fetch()` in the page context so cookies and SameSite rules apply.
* **Manual headers**: paste a JSON object of headers (e.g., `{ "Content-Type": "application/json" }`).
* **Raw body**: send raw text (JSON, form data, etc.).
* **Status + inspectors**: HTTP code, response headers, and body (auto‑pretty JSON + Prism highlighting).
* **Persists inputs**: last URL/method/headers/body are saved locally.

> **GitHub note:** `github.com` cookies do **not** authenticate `api.github.com` requests due to cross‑site rules. Use a header: `Authorization: Bearer <token>`.

---

## Repo Layout

```none
├── README.md
└── api-requester/
    ├── background.js
    ├── icon128.png
    ├── manifest.json
    ├── panel.html
    ├── panel.js
    └── vendor/
        └── prism/
            ├── prism.css
            └── prism.js
```

---

## Install (Load Unpacked)

### Chrome

1. Clone/download this repo.
2. Go to **chrome://extensions**.
3. Toggle **Developer mode** (top‑right).
4. Click **Load unpacked** and select the `api-requester` folder.
5. Click the extension’s toolbar icon to open it in the **Side Panel**.

### Microsoft Edge

1. Go to **edge://extensions**.
2. Toggle **Developer mode**.
3. Click **Load unpacked** and select the `api-requester` folder.
4. Click the extension’s toolbar icon to open it in the **Side Panel**.

You should see **Atomic Fuel Runner** appear with the icon.

---

## Permissions (Manifest v3)

```json
{
  "manifest_version": 3,
  "name": "Atomic Fuel Runner",
  "version": "1.1.0",
  "permissions": ["activeTab", "scripting", "storage", "sidePanel"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" },
  "action": {},
  "side_panel": { "default_path": "panel.html" },
  "icons": { "128": "icon128.png" }
}
```

* **activeTab + scripting**: allows injecting a function into the **current page** when you check **Run in active tab origin**.
* **storage**: store last used URL/method/headers/body.
* **sidePanel**: open/reserve the side panel and load `panel.html`.
* **host_permissions `<all_urls>`**: allow requests to any URL you choose.

---

## How to Use

1. Open a page on the **target origin** if you want to reuse its cookies. Examples:

   * For ADO: open any `https://dev.azure.com/<org>/...` page.
   * For your internal API: open a page on the **same domain**.
2. Click the extension icon to open the **Side Panel**.
3. Pick a **method** and enter a **URL**.
4. **Headers (JSON object)** — examples below.
5. **Body (raw)** — for POST/PUT/PATCH/DELETE if needed (raw JSON, etc.).
6. Keep **Run in active tab origin** checked to send from the page (with cookies). Uncheck to send from the extension (usually no cookies cross‑site).
7. Click **Send**. Inspect **Status**, **Headers**, and **Body** in the panel. Use **Clear** to reset the output.

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

> Tip: Run from a page on the **same origin** you’re calling so cookies apply (e.g., **dev.azure.com** → ADO REST). **github.com** cookies don’t authenticate **api.github.com**; use a bearer token header instead, e.g.: `{ "Authorization": "Bearer <token>", "Accept": "application/vnd.github+json" }`.

---

## Troubleshooting

**No response after “Sending…”**

* If **Run in active tab origin** is checked, the active tab must be a normal `https://` page (not `chrome://`, `edge://`, `file://`, the Web Store, or a PDF viewer) and usually the **same origin** you’re calling.
* Try unchecking the toggle and calling `https://httpbin.org/anything` to validate extension-context fetches.
* Some endpoints require a PAT/Bearer even if you’re logged in.

**CORS errors (when unchecked)**

* Extension-context requests require proper CORS headers from the server.
* Re‑check **Run in active tab origin** to send from the page context instead.

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

## Roadmap

* Auto‑format/validate JSON.
* Collapsible JSON viewer.

---

## Contributing

Issues and PRs welcome. Keep it tiny, sharp, and dependency‑free.
