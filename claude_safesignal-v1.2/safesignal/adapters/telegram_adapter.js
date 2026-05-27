/**
 * SafeSignal — Telegram Web Adapter
 *
 * Supports both Telegram Web K (web.telegram.org/k/) and Web A (/a/).
 *
 * BUG FIX: The original used node.querySelectorAll('.bubble') which only
 * searches DESCENDANTS. When Telegram's DOM fires a mutation, the added
 * node IS the .bubble itself — so querySelectorAll never found it.
 * The fix is _getCandidates(), which checks node itself first, then children.
 */

// ─── PLATFORM-SPECIFIC SELECTORS ─────────────────────────────────────────────

// Telegram Web K: messages are .bubble elements
// Telegram Web A: messages are .Message elements
const MESSAGE_SELECTOR = '.bubble, .Message, .message-list-item';

function extractText(node) {
  // Ordered from most-specific to broadest.
  // Telegram Web K uses .text-content and .translatable-message
  // Telegram Web A uses .message (inner div)
  const selectors = [
    '.text-content',
    '.translatable-message',
    '.message-text',
    '.bubble-content .message',
    '.message span',
  ];
  for (const sel of selectors) {
    const el = node.querySelector(sel);
    const text = el?.innerText?.trim();
    if (text) return text;
  }
  return null;
}

// ─── THE KEY FIX: check the node itself, not just its children ───────────────

function _getCandidates(node) {
  const results = [];
  // 1. The added node might itself be a message bubble — check it first
  try {
    if (node.matches && node.matches(MESSAGE_SELECTOR)) {
      results.push(node);
    }
  } catch (_) { /* node.matches can throw on non-element nodes */ }

  // 2. Also search inside it for nested containers (e.g. a chat-list wrapper added at once)
  try {
    results.push(...node.querySelectorAll(MESSAGE_SELECTOR));
  } catch (_) {}

  // Deduplicate (a node could match both conditions)
  return [...new Set(results)];
}

// ─── SHARED ADAPTER LOGIC ────────────────────────────────────────────────────

const PLATFORM_NAME = 'Telegram';
let conversationHistory = [];
const PROCESSED_ATTR = 'data-ss-processed';

async function processNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const candidates = _getCandidates(node); // ← was: getMessageContainers(node)

  for (const msgEl of candidates) {
    // Synchronous stamp to prevent double-processing across async gaps
    if (msgEl.hasAttribute(PROCESSED_ATTR)) continue;
    msgEl.setAttribute(PROCESSED_ATTR, '1');

    const text = extractText(msgEl);
    if (!text || text.length < 5) continue;

    conversationHistory.push(text);
    if (conversationHistory.length > 30) conversationHistory.shift();

    // detectHarm() is provided by core/singlish_detector.js (loaded first)
    const detection = await detectHarm(text, conversationHistory);

    if (detection.isHarmful) {
      console.log(`[SafeSignal][${PLATFORM_NAME}] ${detection.category} @ ${(detection.confidence * 100).toFixed(0)}%`);

      const incident = {
        text,
        category:        detection.category,
        tag:             detection.tag,
        confidence:      detection.confidence,
        flaggedPhrases:  detection.flaggedPhrases,
        explanation:     detection.explanation,
        escalationStages: detection.escalationStages,
        aiLayer:         detection.aiLayer,
        platform:        PLATFORM_NAME,
        timestamp:       new Date().toISOString(),
      };

      await saveIncident(incident);
      await updateStats(detection.category);
      injectAlertCard(msgEl, detection, incident);
      notifyPopup(detection);
    }
  }
}

function injectAlertCard(msgElement, detection, incident) {
  if (msgElement.querySelector('.ss-alert')) return; // deduplicate
  const card = buildAlertCard(detection, incident);  // from singlish_detector.js
  msgElement.style.position = 'relative';
  msgElement.appendChild(card);
}

// ─── OBSERVER ────────────────────────────────────────────────────────────────

const observer = new MutationObserver(mutations => {
  for (const mut of mutations) {
    mut.addedNodes.forEach(node => processNode(node));
  }
});

function initObserver() {
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`[SafeSignal] ${PLATFORM_NAME} observer active.`);
}

initObserver();

// SPA navigation reset (Telegram is a single-page app)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    conversationHistory = [];
    document.querySelectorAll(`[${PROCESSED_ATTR}]`)
      .forEach(el => el.removeAttribute(PROCESSED_ATTR));
    console.log(`[SafeSignal] ${PLATFORM_NAME} chat switch — context reset.`);
  }
}).observe(document.body, { childList: true, subtree: true });