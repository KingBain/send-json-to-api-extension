const $ = (id) => document.getElementById(id);

(async function init() {
  // restore last values (nice for quick iteration)
  const stored = await chrome.storage.local.get(["url","method","headers","body","runInTab"]);
  if (stored.url) $("url").value = stored.url;
  if (stored.method) $("method").value = stored.method;
  if (stored.headers) $("headers").value = stored.headers;
  if (stored.body) $("body").value = stored.body;
  $("runInTab").checked = stored.runInTab ?? true;

  $("send").addEventListener("click", onSend);
})();

async function onSend() {
  const url = $("url").value.trim();
  const method = $("method").value.trim().toUpperCase();
  const rawHeaders = $("headers").value.trim();
  const body = $("body").value;
  const runInTab = $("runInTab").checked;

  await chrome.storage.local.set({
    url, method, headers: rawHeaders, body, runInTab
  });

  let headers = {};
  if (rawHeaders) {
    try {
      headers = JSON.parse(rawHeaders);
      if (headers && typeof headers !== "object") throw new Error("headers must be an object");
    } catch (e) {
      return renderError(`Header JSON error: ${e.message}`);
    }
  }

  resetOutput();
  setStatus("Sending…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return renderError("No active tab.");

    if (runInTab) {
      // Inject a function into the page to use its origin/cookies.
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: injectedFetch,
        args: [{ url, method, headers, body }]
      });
      return renderResult(result);
    } else {
      // Background fetch (cookies often won’t be sent due to SameSite/cross-site)
      const res = await extensionFetch({ url, method, headers, body });
      return renderResult(res);
    }
  } catch (err) {
    renderError(err.message || String(err));
  }
}

// Runs in the page context
async function injectedFetch({ url, method, headers, body }) {
  try {
    const init = {
      method,
      headers,
      // include cookies from this origin
      credentials: "include",
      // Only send body for methods that allow it
      body: ["POST","PUT","PATCH","DELETE"].includes(method) && body ? body : undefined
    };
    const resp = await fetch(url, init);
    const text = await resp.text();

    const headersObj = {};
    resp.headers.forEach((v, k) => { headersObj[k] = v; });

    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      headers: headersObj,
      body: text
    };
  } catch (e) {
    return { ok: false, status: 0, statusText: "FETCH_ERROR", headers: {}, body: String(e) };
  }
}

// Runs in the extension context
async function extensionFetch({ url, method, headers, body }) {
  try {
    const init = {
      method,
      headers,
      credentials: "include", // may not send cookies cross-site due to SameSite
      body: ["POST","PUT","PATCH","DELETE"].includes(method) && body ? body : undefined
    };
    const resp = await fetch(url, init);
    const text = await resp.text();
    const headersObj = {};
    resp.headers.forEach((v, k) => { headersObj[k] = v; });
    return {
      ok: resp.ok, status: resp.status, statusText: resp.statusText, headers: headersObj, body: text
    };
  } catch (e) {
    return { ok: false, status: 0, statusText: "FETCH_ERROR", headers: {}, body: String(e) };
  }
}

function renderResult(res) {
  setStatus(`${res.status} ${res.statusText}`, !res.ok);
  $("out-headers").style.display = "block";
  $("out-body").style.display = "block";

  $("out-headers").textContent = JSON.stringify(res.headers, null, 2);
  let pretty = res.body;
  try {
    pretty = JSON.stringify(JSON.parse(res.body), null, 2);
  } catch { /* keep raw */ }
  $("out-body").textContent = pretty;
}

function setStatus(text, isError = false) {
  const el = $("out-status");
  el.textContent = text;
  el.classList.toggle("danger", !!isError);
}

function resetOutput() {
  setStatus("");
  $("out-headers").style.display = "none";
  $("out-body").style.display = "none";
  $("out-headers").textContent = "";
  $("out-body").textContent = "";
}

function renderError(msg) {
  setStatus(msg, true);
}
