// panel.js
const $ = (id) => document.getElementById(id);

// ---------- helpers ----------
async function getActiveHttpTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error("No active tab found.");
  const url = tab.url || "";
  const isHttp = /^https?:\/\//i.test(url);
  const isRestricted =
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:") ||
    url.startsWith("file://") ||
    url.includes("chromewebstore.google.com/");
  if (!isHttp || isRestricted) {
    throw new Error(
      `Can't run in this tab (${
        url || "unknown URL"
      }). Open a normal https page (e.g., dev.azure.com).`
    );
  }
  return tab;
}

function withTimeout(promise, ms, msg = "Timed out") {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms)),
  ]);
}

// ---------- init ----------
(async function init() {
  const stored = await chrome.storage.local.get([
    "url",
    "method",
    "headers",
    "body",
    "runInTab",
  ]);
  if (stored.url) $("url").value = stored.url;
  if (stored.method) $("method").value = stored.method;
  if (stored.headers) $("headers").value = stored.headers;
  if (stored.body) $("body").value = stored.body;
  $("runInTab").checked = stored.runInTab ?? true;

  // bind buttons
  $("send").addEventListener("click", onSend); // <-- present
  const clearBtn = $("clear");
  if (clearBtn) clearBtn.addEventListener("click", () => resetOutput());
})();

// ---------- main ----------
async function onSend() {
  const url = $("url").value.trim();
  const method = ($("method").value || "").trim().toUpperCase();
  const rawHeaders = $("headers").value.trim();
  const body = $("body").value;
  const runInTab = $("runInTab").checked;

  await chrome.storage.local.set({
    url,
    method,
    headers: rawHeaders,
    body,
    runInTab,
  });

  let headers = {};
  if (rawHeaders) {
    try {
      headers = JSON.parse(rawHeaders);
      if (headers && typeof headers !== "object")
        throw new Error("headers must be an object");
    } catch (e) {
      return renderError(`Header JSON error: ${e.message}`);
    }
  }

  resetOutput();
  setStatus("Sending…");

  try {
    if (!url) throw new Error("URL is required.");
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      throw new Error(`Unsupported method: ${method}`);
    }

    let result;

    if (runInTab) {
      const tab = await getActiveHttpTab();
      const inj = await withTimeout(
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: injectedFetch,
          args: [{ url, method, headers, body }],
          world: "MAIN",
        }),
        20000,
        "Injection or in-page fetch timed out (20s)."
      );
      if (!inj || !inj.length)
        throw new Error("Script injected but returned no results.");
      result = inj[0]?.result;
      if (!result) throw new Error("In-page fetch returned no data.");
    } else {
      result = await withTimeout(
        extensionFetch({ url, method, headers, body }),
        20000,
        "Extension fetch timed out (20s)."
      );
    }

    return renderResult(result);
  } catch (err) {
    return renderError(err?.message || String(err));
  }
}

// runs in the page
async function injectedFetch({ url, method, headers, body }) {
  try {
    const init = {
      method,
      headers,
      credentials: "include",
      body:
        ["POST", "PUT", "PATCH", "DELETE"].includes(method) && body
          ? body
          : undefined,
    };
    const resp = await fetch(url, init);
    const text = await resp.text();
    const headersObj = {};
    resp.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      headers: headersObj,
      body: text,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      statusText: "FETCH_ERROR",
      headers: {},
      body: String(e),
    };
  }
}

// runs in the extension
async function extensionFetch({ url, method, headers, body }) {
  try {
    const init = {
      method,
      headers,
      credentials: "include",
      body:
        ["POST", "PUT", "PATCH", "DELETE"].includes(method) && body
          ? body
          : undefined,
    };
    const resp = await fetch(url, init);
    const text = await resp.text();
    const headersObj = {};
    resp.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      headers: headersObj,
      body: text,
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      statusText: "FETCH_ERROR",
      headers: {},
      body: String(e),
    };
  }
}

// ---------- UI ----------
function renderResult(res) {
  setStatus(`${res.status} ${res.statusText}`, !res.ok);

  // headers (Prism)
  const headersWrap = document.getElementById("headers-wrap");
  const headersEl = $("out-headers");
  headersWrap.style.display = "block";
  headersEl.textContent = JSON.stringify(res.headers || {}, null, 2);
  if (window.Prism) Prism.highlightElement(headersEl);

  // body (Prism, try to pretty JSON)
  const bodyWrap = document.getElementById("body-wrap");
  const bodyEl = $("out-body");
  bodyWrap.style.display = "block";
  let bodyText = res.body ?? "";
  try {
    bodyText = JSON.stringify(JSON.parse(bodyText), null, 2);
  } catch {}
  bodyEl.textContent = bodyText;
  if (window.Prism) Prism.highlightElement(bodyEl);
}

function setStatus(text, isError = false) {
  const el = $("out-status");
  el.textContent = text;
  el.classList.toggle("danger", !!isError);
}

function resetOutput() {
  setStatus("");
  document.getElementById("headers-wrap").style.display = "none";
  document.getElementById("body-wrap").style.display = "none";
  $("out-headers").textContent = "";
  $("out-body").textContent = "";
}

function renderError(msg) {
  setStatus(msg, true);
}
