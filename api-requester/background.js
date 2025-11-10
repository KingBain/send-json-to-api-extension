chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.setOptions({ enabled: true, path: "panel.html" });
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch (e) {
    console.error("Failed to open side panel:", e);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setOptions({ enabled: true, path: "panel.html" });
  } catch (e) {
    console.warn("sidePanel.setOptions on install failed:", e);
  }
});
