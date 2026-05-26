/**
 * SafeSignal — Background Service Worker
 * 
 * Acts as the message relay between content.js (page context) and
 * popup.js (extension context). The popup cannot receive messages from
 * content scripts directly in MV3 — they must go through the background.
 */

console.log('[SafeSignal] Background service worker started.');

// Store the most recent detection so the popup can read it on open
let latestDetection = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    detectionStats: { grooming: 0, cyberbullying: 0, threats: 0, scams: 0, oversharing: 0 },
    incidents:      [],
    falsePositives: [],
  });
  chrome.storage.sync.set({ familyMode: false });
  console.log('[SafeSignal] Storage initialised.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ── From content.js ──────────────────────────────────────────────────────
  if (message.action === 'HARM_DETECTED') {
    latestDetection = message;

    // Forward to popup if it's open (it will be listening)
    chrome.runtime.sendMessage({ action: 'POPUP_UPDATE', ...message })
      .catch(() => { /* popup closed — that's fine */ });

    sendResponse({ ok: true });
    return;
  }

  // ── Popup requesting the latest detection on open ────────────────────────
  if (message.action === 'GET_LATEST') {
    sendResponse({ detection: latestDetection });
    return;
  }

  // ── Popup requesting full incident list ──────────────────────────────────
  if (message.action === 'GET_INCIDENTS') {
    chrome.storage.local.get(['incidents'], ({ incidents = [] }) => {
      sendResponse({ incidents });
    });
    return true; // async sendResponse
  }
});
