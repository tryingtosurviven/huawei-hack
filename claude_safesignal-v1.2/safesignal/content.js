/**
 * SafeSignal — Content Script
 * Runs inside https://web.whatsapp.com
 * 
 * Responsibilities:
 *   1. Observe WhatsApp DOM for new incoming messages
 *   2. Run the 4-layer Singlish harm detector
 *   3. Inject the in-page alert card directly on the message bubble
 *   4. Notify the popup (via background relay) so it can update in real time
 *   5. Save incidents to chrome.storage for the Evidence Vault
 */

console.log('SafeSignal v1.1 — monitoring WhatsApp Web...');

// ─── INLINE DETECTOR (copy of singlish_detector.js logic) ────────────────────
// Content scripts cannot use ES module imports, so the detection engine is
// inlined here. Keep singlish_detector.js as the canonical source; copy changes.

const SINGLISH_NORMALISATION_MAP = [
  [/l+a+h?\b/g, 'lah'], [/s+i+a+\b/g, 'sia'], [/l+o+r?\b/g, 'lor'],
  [/m+e+h?\b/g, 'meh'], [/w+o+r?\b/g, 'wor'], [/w+a+[ht]?\b/g, 'wah'],
  [/\bsiao\b/g, 'crazy'], [/\bhumji\b/g, 'coward'], [/\bsuay\b/g, 'unlucky'],
  [/\bbodoh\b/g, 'stupid'], [/\bkena\b/g, 'kena'], [/\bsabo\b/g, 'sabotage'],
  [/\bl8r?\b/g, 'later'], [/\bu\b/g, 'you'], [/\br\b/g, 'are'],
  [/4ever/g, 'forever'], [/\bnvm\b/g, 'nevermind'],
];

function normaliseSinglish(text) {
  let t = text.toLowerCase();
  for (const [p, r] of SINGLISH_NORMALISATION_MAP) t = t.replace(p, r);
  t = t.replace(/(.)\1{2,}/g, '$1$1');
  return t;
}

const HARM_LEXICON = [
  // Grooming
  ["don't tell your parents",1.0,'grooming'],["don't tell cher",1.0,'grooming'],
  ["our secret",0.9,'grooming'],["just between us",0.8,'grooming'],
  ["delete this chat",0.9,'grooming'],["jangan bagitau",1.0,'grooming'],
  ["jangan cakap siapa",1.0,'grooming'],["don't tell anyone lah",1.0,'grooming'],
  ["you're so mature for your age",1.0,'grooming'],["you mature lah",0.9,'grooming'],
  ["you so special sia",0.8,'grooming'],["nobody understands you like me",0.9,'grooming'],
  ["send me a photo",1.0,'grooming'],["send pic only what",1.0,'grooming'],
  ["send pic lah",1.0,'grooming'],["meet me alone",1.0,'grooming'],
  ["come alone",0.8,'grooming'],["trust me only",0.9,'grooming'],
  ["you owe me one",0.9,'grooming'],["don't bring your friends",0.9,'grooming'],
  // Cyberbullying
  ["kill yourself",1.0,'cyberbullying'],["nobody likes you",0.9,'cyberbullying'],
  ["go die",0.9,'cyberbullying'],["kys",1.0,'cyberbullying'],
  ["go die lah",1.0,'cyberbullying'],["go die sia",1.0,'cyberbullying'],
  ["bodoh",0.8,'cyberbullying'],["bangang",0.8,'cyberbullying'],
  ["damn suay lah",0.7,'cyberbullying'],["you humji ah",0.8,'cyberbullying'],
  ["don't so extra lah",0.7,'cyberbullying'],["cb lah",0.9,'cyberbullying'],
  ["knn",0.8,'cyberbullying'],["nabeh",0.8,'cyberbullying'],
  ["everyone hates you",1.0,'cyberbullying'],["no one wants you",0.9,'cyberbullying'],
  ["ugly af",0.8,'cyberbullying'],["fat and ugly",0.8,'cyberbullying'],
  ["block her everyone",0.9,'cyberbullying'],["worthless",0.7,'cyberbullying'],
  // Threats
  ["i will expose you",1.0,'threats'],["later i expose you sia",1.0,'threats'],
  ["i leak your photos",1.0,'threats'],["i post this everywhere",1.0,'threats'],
  ["i know where you live",1.0,'threats'],["send or else",1.0,'threats'],
  ["send if not i tell",1.0,'threats'],["you die lah",0.9,'threats'],
  ["screenshot already",0.8,'threats'],["you'll regret",0.7,'threats'],
  // Scams
  ["send otp",1.0,'scams'],["verify your account",0.9,'scams'],
  ["your account suspended",0.9,'scams'],["urgent transfer",0.9,'scams'],
  ["click this link",0.7,'scams'],["guaranteed returns",0.9,'scams'],
  ["send money first",0.9,'scams'],["singpass login",0.8,'scams'],
  ["myinfo verify",0.8,'scams'],["safra voucher",0.7,'scams'],
  ["free iphone",0.8,'scams'],["limited time only",0.6,'scams'],
  // Oversharing
  ["my nric",1.0,'oversharing'],["my password",1.0,'oversharing'],
  ["credit card number",1.0,'oversharing'],["bank account number",1.0,'oversharing'],
  ["my address is",0.9,'oversharing'],["home alone",0.8,'oversharing'],
  ["parents not home",0.9,'oversharing'],["cvv",1.0,'oversharing'],
  ["pin number",1.0,'oversharing'],
];

const GROOMING_STAGES = [
  { stage:1, label:'Trust-building', markers:['you are special','you so special','you mature','you different from others','you not like other'] },
  { stage:2, label:'Isolation',      markers:["don't tell",'our secret','just between us','nobody else','jangan bagitau'] },
  { stage:3, label:'Boundary-testing',markers:['send me a photo','send pic','show me','come alone','meet me','what are you wearing'] },
  { stage:4, label:'Pressure',       markers:["why don't you trust me",'you owe me','you promised','i disappointed'] },
  { stage:5, label:'Threat',         markers:['i expose you','i post your photo','send or else','screenshot already'] },
];

const HF_TOKEN = 'hf_YVmOVEkEIdGHjNvllAblk1QlsoswnTQHLU'; // ← fix: removed space

const SAFE_REPLIES = {
  grooming:      ["I'm not comfortable with this. Please stop asking.","No. Do not contact me again.","I'm leaving this chat now.","Hi, I need help. Someone online is making me uncomfortable."],
  cyberbullying: ["I won't respond to this kind of message.","Stop this now. This is harassment.","This is hurtful. Please stop.","Someone is sending me hurtful messages. Can you help me?"],
  threats:       ["(Do not reply. Screenshot and report immediately.)","I am reporting this conversation to the platform and authorities.","I am receiving threats online. I need help now."],
  scams:         ["I need to verify this through official channels first.","I will not be sharing any personal information.","(Block and report this sender.)"],
  oversharing:   ["Please ignore that. I shared something I shouldn't have.","I cannot share that kind of information online."],
};

const RISK_TAGS = {
  grooming:'Boundary Testing', cyberbullying:'Repeated Humiliation',
  threats:'Emotional Blackmail', scams:'Urgency Scam', oversharing:'Sensitive Data Exposed',
};

const EXPLANATIONS = {
  grooming:      'The sender may be encouraging secrecy or trying to build inappropriate trust.',
  cyberbullying: 'This message contains language associated with insults, humiliation, or harassment.',
  threats:       'The message contains language that may pressure, intimidate, or threaten someone.',
  scams:         'The sender is creating urgency or requesting sensitive information.',
  oversharing:   'Sensitive personal information is being shared. This could be used against you.',
};

function scoreKeywords(text) {
  const scores = { grooming:0, cyberbullying:0, threats:0, scams:0, oversharing:0 };
  const flagged = [];
  for (const [phrase, weight, cat] of HARM_LEXICON) {
    if (text.includes(phrase)) { scores[cat] += weight; flagged.push(phrase); }
  }
  let topCat = null, topScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > topScore) { topScore = score; topCat = cat; }
  }
  return topCat && topScore >= 0.4
    ? { isHarmful: topScore >= 0.6, category: topCat, confidence: Math.min(topScore, 1), flaggedPhrases: flagged, escalationStages: [] }
    : { isHarmful: false, confidence: 0, escalationStages: [] };
}

function checkEscalation(text, history) {
  const allText = [...history.map(normaliseSinglish), text].join(' ');
  const stagesDetected = GROOMING_STAGES.filter(s => s.markers.some(m => allText.includes(m)));
  if (stagesDetected.length >= 2) {
    const conf = Math.min(0.3 + stagesDetected.length * 0.15, 1.0);
    return {
      isHarmful: true, category: 'grooming', confidence: conf,
      flaggedPhrases: stagesDetected.map(s => s.label),
      tag: 'Grooming Escalation Pattern',
      explanation: `${stagesDetected.length} escalating grooming stages detected: ${stagesDetected.map(s=>s.label).join(' → ')}.`,
      escalationStages: stagesDetected,
    };
  }
  return { isHarmful: false, confidence: 0, escalationStages: stagesDetected };
}

async function callLionGuard(text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch('https://api-inference.huggingface.co/models/govtech/lionguard-2.1', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: text }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const scores = Array.isArray(data[0]) ? data[0] : data;
    const top = scores.reduce((a, b) => a.score > b.score ? a : b);
    if (top.label === 'safe' || top.score < 0.7) return null;
    const MAP = { toxic:'cyberbullying', insult:'cyberbullying', sexual:'grooming', scam:'scams', spam:'scams', threat:'threats' };
    const category = MAP[top.label] || 'cyberbullying';
    return {
      isHarmful: true, category, confidence: top.score,
      flaggedPhrases: [], tag: RISK_TAGS[category],
      explanation: `LionGuard 2.1: "${top.label}" at ${(top.score*100).toFixed(0)}% confidence.`,
      escalationStages: [], aiLayer: true,
    };
  } catch (e) { clearTimeout(timer); throw e; }
}

async function detectHarm(messageText, history = []) {
  const normalised = normaliseSinglish(messageText);

  // Layer 1: Privacy guard
  for (const [phrase,,cat] of HARM_LEXICON.filter(([,,c]) => c === 'oversharing')) {
    if (normalised.includes(phrase)) {
      return { isHarmful:true, category:'oversharing', confidence:1.0,
        flaggedPhrases:[phrase], tag:RISK_TAGS.oversharing,
        explanation:EXPLANATIONS.oversharing, escalationStages:[], aiLayer:false };
    }
  }

  // Layer 2 + 3
  const kw  = scoreKeywords(normalised);
  const esc = checkEscalation(normalised, history);
  const mergedConf = Math.max(kw.confidence || 0, esc.confidence || 0);
  const mergedStages = [...(kw.escalationStages||[]), ...(esc.escalationStages||[])]
    .filter((s, i, arr) => arr.findIndex(x => x.stage === s.stage) === i);

  const merged = (kw.confidence >= esc.confidence ? kw : esc);
  merged.escalationStages = mergedStages;
  merged.confidence = mergedConf;
  merged.isHarmful = (kw.confidence||0) + (esc.confidence||0) >= 0.6 || mergedConf >= 0.6;
  merged.tag         = merged.tag || RISK_TAGS[merged.category];
  merged.explanation = merged.explanation || EXPLANATIONS[merged.category];

  if (merged.isHarmful && merged.confidence >= 0.6) return merged;

  // Layer 4: LionGuard
  try {
    const ai = await callLionGuard(messageText);
    if (ai) return ai;
  } catch (_) {
    if (mergedConf >= 0.4) return { ...merged, aiLayer: false };
  }

  return { isHarmful: false };
}

// ─── INCIDENT STORAGE ────────────────────────────────────────────────────────

async function saveIncident(incident) {
  const { incidents = [] } = await chrome.storage.local.get(['incidents']);
  incidents.push({ ...incident, timestamp: new Date().toISOString() });
  // Cap at 200 incidents so storage doesn't bloat
  if (incidents.length > 200) incidents.splice(0, incidents.length - 200);
  await chrome.storage.local.set({ incidents });
}

async function updateStats(category) {
  const { detectionStats = { grooming:0, cyberbullying:0, threats:0, scams:0, oversharing:0 } }
    = await chrome.storage.local.get(['detectionStats']);
  if (category in detectionStats) detectionStats[category]++;
  await chrome.storage.local.set({ detectionStats });
}

// ─── EVIDENCE EXPORT ─────────────────────────────────────────────────────────
// Called by the alert card's "Save Evidence" button.
// Creates a downloadable text report from the incident data.

async function exportEvidence(incident) {
  const lines = [
    '══════════════════════════════════',
    '   SafeSignal — Incident Report   ',
    '══════════════════════════════════',
    `Date/Time  : ${new Date(incident.timestamp || Date.now()).toLocaleString('en-SG')}`,
    `Category   : ${incident.category}`,
    `Risk Tag   : ${incident.tag}`,
    `Confidence : ${incident.confidence ? (incident.confidence * 100).toFixed(0) + '%' : 'N/A'}`,
    `AI Engine  : ${incident.aiLayer ? 'LionGuard 2.1' : 'Local Engine'}`,
    '',
    'Flagged message:',
    `"${incident.text}"`,
    '',
    'Explanation:',
    incident.explanation,
    '',
    'Flagged phrases:',
    ...(incident.flaggedPhrases || []).map(p => `  • "${p}"`),
    '',
    incident.escalationStages?.length
      ? `Escalation stages:\n${incident.escalationStages.map(s => `  Stage ${s.stage}: ${s.label}`).join('\n')}`
      : '',
    '',
    'Recommended next steps:',
    '  1. Stop replying to the sender',
    '  2. Block the sender if it is safe to do so',
    '  3. Report to the platform (WhatsApp → Report Contact)',
    '  4. Tell a trusted adult or school counsellor',
    '  5. If in immediate danger, call 999',
    '',
    '══════════════════════════════════',
    'SafeSignal — AI Harm Pattern Recognition',
    'Built for Singapore — Huawei Hackathon 2025',
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `safesignal-incident-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── ALERT CARD UI ───────────────────────────────────────────────────────────

function buildAlertCard(detection, incidentRef) {
  const card = document.createElement('div');
  card.className = `ss-alert ss-alert--${detection.category}`;

  // Escalation timeline (only for grooming with multiple stages)
  let timelineHTML = '';
  if (detection.escalationStages && detection.escalationStages.length >= 2) {
    const dots = detection.escalationStages.map(s =>
      `<div class="ss-stage">
         <span class="ss-stage__dot"></span>
         <span class="ss-stage__label">Stage ${s.stage}: ${s.label}</span>
       </div>`
    ).join('');
    timelineHTML = `<div class="ss-timeline"><div class="ss-timeline__title">⚠ Escalation Pattern</div>${dots}</div>`;
  }

  // Reply options
  const replies = (SAFE_REPLIES[detection.category] || []).map(r =>
    `<button class="ss-reply" data-text="${r.replace(/"/g, '&quot;')}">${r}</button>`
  ).join('');

  card.innerHTML = `
    <div class="ss-header">
      <span class="ss-icon">🛡️</span>
      <div class="ss-header__text">
        <div class="ss-title">SafeSignal Alert</div>
        <div class="ss-tag ss-tag--${detection.category}">${detection.tag || RISK_TAGS[detection.category]}</div>
      </div>
      <button class="ss-close" aria-label="Dismiss">×</button>
    </div>

    <div class="ss-body">
      <p class="ss-why"><strong>Why am I seeing this?</strong><br>${detection.explanation}</p>

      ${timelineHTML}

      ${detection.flaggedPhrases?.length
        ? `<div class="ss-flagged">Flagged: ${detection.flaggedPhrases.slice(0,3).map(p=>`<code>"${p}"</code>`).join(', ')}</div>`
        : ''}

      <div class="ss-confidence">
        Confidence: <strong>${detection.confidence ? (detection.confidence*100).toFixed(0)+'%' : 'High'}</strong>
        ${detection.aiLayer ? '<span class="ss-ai-badge">🤖 LionGuard 2.1</span>' : ''}
      </div>

      <div class="ss-section-label">💬 Reply Coach</div>
      <div class="ss-replies">${replies}</div>

      <div class="ss-actions">
        <button class="ss-btn ss-btn--primary" data-action="save-evidence">📥 Save Evidence</button>
        <button class="ss-btn ss-btn--secondary" data-action="false-positive">Not harmful</button>
      </div>
    </div>
  `;

  // Close
  card.querySelector('.ss-close').addEventListener('click', () => card.remove());

  // Reply Coach — copy to clipboard + visual feedback
  card.querySelectorAll('.ss-reply').forEach(btn => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.text).catch(() => {});
      btn.textContent = '✓ Copied!';
      btn.classList.add('ss-reply--copied');
      setTimeout(() => { btn.textContent = btn.dataset.text; btn.classList.remove('ss-reply--copied'); }, 2000);
    });
  });

  // Action buttons
  card.querySelector('[data-action="save-evidence"]').addEventListener('click', () => {
    exportEvidence(incidentRef);
  });
  card.querySelector('[data-action="false-positive"]').addEventListener('click', () => {
    // Save false-positive feedback for model improvement
    chrome.storage.local.get(['falsePositives'], ({ falsePositives = [] }) => {
      falsePositives.push({ text: incidentRef.text, category: incidentRef.category, reportedAt: new Date().toISOString() });
      chrome.storage.local.set({ falsePositives });
    });
    card.style.opacity = '0.5';
    card.querySelector('.ss-body').innerHTML = '<p style="text-align:center;padding:8px">Thanks for the feedback. This helps improve SafeSignal.</p>';
    setTimeout(() => card.remove(), 2500);
  });

  return card;
}

function injectAlertCard(msgElement, detection, incident) {
  if (msgElement.querySelector('.ss-alert')) return; // deduplicate
  const card = buildAlertCard(detection, incident);
  msgElement.style.position = 'relative';
  msgElement.appendChild(card);
}

// ─── POPUP NOTIFICATION ──────────────────────────────────────────────────────
// Sends the latest detection to background.js, which relays it to the popup.

function notifyPopup(detection) {
  chrome.runtime.sendMessage({
    action:     'HARM_DETECTED',
    category:   detection.category,
    tag:        detection.tag,
    confidence: detection.confidence,
    replies:    SAFE_REPLIES[detection.category] || [],
    explanation: detection.explanation,
  }).catch(() => {
    // Popup may be closed — that's fine
  });
}

// ─── DOM OBSERVER ────────────────────────────────────────────────────────────

let conversationHistory = [];
const processedIds = new Set();

// WhatsApp Web uses data-id on message rows. We use this as a dedup key.
function getMessageId(el) {
  return el.getAttribute('data-id') || el.querySelector('[data-id]')?.getAttribute('data-id') || null;
}

function extractText(node) {
  // Try the most specific selectors first, then fall back
  const selectors = [
    'span.selectable-text.copyable-text',
    'span[class*="selectable-text"]',
    '.copyable-text span',
    'span[dir="ltr"]',
  ];
  for (const sel of selectors) {
    const el = node.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return null;
}

async function processNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  // WhatsApp wraps each message in a div[data-id] inside a role=row container
  const candidates = node.querySelectorAll(
    '.message-in, .message-out, [data-id], div[role="row"]'
  );

  for (const msgEl of candidates) {
    const msgId = getMessageId(msgEl);
    if (msgId && processedIds.has(msgId)) continue;
    if (msgId) processedIds.add(msgId);

    const text = extractText(msgEl);
    if (!text || text.length < 5) continue;   // skip timestamps / single chars

    conversationHistory.push(text);
    if (conversationHistory.length > 30) conversationHistory.shift();

    const detection = await detectHarm(text, conversationHistory);

    if (detection.isHarmful) {
      console.log(`[SafeSignal] ${detection.category} @ ${(detection.confidence*100).toFixed(0)}%`, detection);

      const incident = {
        text,
        category:        detection.category,
        tag:             detection.tag,
        confidence:      detection.confidence,
        flaggedPhrases:  detection.flaggedPhrases,
        explanation:     detection.explanation,
        escalationStages: detection.escalationStages,
        aiLayer:         detection.aiLayer,
        timestamp:       new Date().toISOString(),
      };

      await saveIncident(incident);
      await updateStats(detection.category);
      injectAlertCard(msgEl, detection, incident);
      notifyPopup(detection);
    }
  }
}

const observer = new MutationObserver(mutations => {
  for (const mut of mutations) {
    mut.addedNodes.forEach(node => processNode(node));
  }
});

function initObserver() {
  // Observe document.body — more resilient to WhatsApp's SPA route changes
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[SafeSignal] Stable body observer active.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}

// Re-process visible messages after route changes (WhatsApp is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    conversationHistory = [];  // reset context on chat switch
    processedIds.clear();
    console.log('[SafeSignal] Chat switched — context reset.');
  }
}).observe(document.body, { childList: true, subtree: true });
