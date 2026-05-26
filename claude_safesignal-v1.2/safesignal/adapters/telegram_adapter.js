// Telegram Web DOM Selectors (A version)
function extractText(node) {
  const el = node.querySelector('.text-content, .message-text, .bubble-content .text');
  return el?.innerText?.trim() || null;
}

function getMessageContainers(node) {
  return node.querySelectorAll('.Message, .message-list-item, .bubble');
}

const PLATFORM_NAME = 'Telegram';
// [Paste the processNode, injectAlertCard, and initObserver functions from claudefix_content.js here]
// ─── SHARED ADAPTER LOGIC ──────────────────────────────────────────────────
let conversationHistory = [];
const PROCESSED_ATTR = 'data-ss-processed';

async function processNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  // Use the specific containers defined at the top of this file
  const candidates = getMessageContainers(node);

  for (const msgEl of candidates) {
    if (msgEl.hasAttribute(PROCESSED_ATTR)) continue;
    msgEl.setAttribute(PROCESSED_ATTR, '1');

    const text = extractText(msgEl);
    if (!text || text.length < 5) continue;

    conversationHistory.push(text);
    if (conversationHistory.length > 30) conversationHistory.shift();

    // detectHarm is provided by core/singlish_detector.js
    const detection = await detectHarm(text, conversationHistory);

    if (detection.isHarmful) {
      console.log(`[SafeSignal][${PLATFORM_NAME}] ${detection.category} detected`);

      const incident = {
        text,
        category: detection.category,
        tag: detection.tag,
        confidence: detection.confidence,
        flaggedPhrases: detection.flaggedPhrases,
        explanation: detection.explanation,
        escalationStages: detection.escalationStages,
        aiLayer: detection.aiLayer,
        platform: PLATFORM_NAME, // <--- This helps the Evidence Vault!
        timestamp: new Date().toISOString(),
      };

      await saveIncident(incident);
      await updateStats(detection.category);
      injectAlertCard(msgEl, detection, incident);
      notifyPopup(detection);
    }
  }
}

function injectAlertCard(msgElement, detection, incident) {
  if (msgElement.querySelector('.ss-alert')) return;
  const card = buildAlertCard(detection, incident); // buildAlertCard is in singlish_detector.js
  msgElement.style.position = 'relative';
  msgElement.appendChild(card);
}

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

// Reset logic for SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    conversationHistory = [];
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => el.removeAttribute(PROCESSED_ATTR));
    console.log(`[SafeSignal] ${PLATFORM_NAME} chat switch — context reset.`);
  }
}).observe(document.body, { childList: true, subtree: true });