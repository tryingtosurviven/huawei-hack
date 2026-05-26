/**
 * SafeSignal — Singlish & Code-Mixed Harm Detection Engine
 */

// ─── SINGLISH NORMALISATION ──────────────────────────────────────────────────
const SINGLISH_NORMALISATION_MAP = [
  [/l+a+h?\b/g, 'lah'], [/s+i+a+\b/g, 'sia'], [/l+o+r?\b/g, 'lor'],
  [/m+e+h?\b/g, 'meh'], [/w+o+r?\b/g, 'wor'], [/w+a+[ht]?\b/g, 'wah'],
  [/a+y+o+\b/g, 'ayo'], [/\bsiao\b/g, 'crazy'], [/\bhumji\b/g, 'coward'],
  [/\bsuay\b/g, 'unlucky'], [/\bbo liao\b/g, 'bored troublemaker'],
  [/\bchao keng\b/g, 'fake'], [/\bkena\b/g, 'kena'], [/\bsabo\b/g, 'sabotage'],
  [/\bpokpok\b/g, 'promiscuous'], [/\bah beng\b/g, 'thug'],
  [/\bskali\b/g, 'suddenly perhaps'], [/\bnvm\b/g, 'nevermind'],
  [/\bpler?s?\b/g, 'please'], [/\bcos\b/g, 'because'], [/\bl8r?\b/g, 'later'],
  [/\bu\b/g, 'you'], [/\br\b/g, 'are'], [/\bn\b/g, 'and'],
  [/4ever/g, 'forever'], [/2day/g, 'today'],
];

function normaliseSinglish(text) {
  let t = text.toLowerCase();
  for (const [pattern, replacement] of SINGLISH_NORMALISATION_MAP) {
    t = t.replace(pattern, replacement);
  }
  t = t.replace(/(.)\1{2,}/g, '$1$1');
  return t;
}

// ─── HARM LEXICON ────────────────────────────────────────────────────────────
const HARM_LEXICON = [
  ["don't tell your parents", 1.0, 'grooming'], ["don't tell cher", 1.0, 'grooming'],
  ["our secret", 0.9, 'grooming'], ["just between us", 0.8, 'grooming'],
  ["delete this chat", 0.9, 'grooming'], ["jangan bagitau", 1.0, 'grooming'],
  ["jangan cakap siapa", 1.0, 'grooming'], ["don't tell anyone lah", 1.0, 'grooming'],
  ["you're so mature for your age", 1.0, 'grooming'], ["you mature lah", 0.9, 'grooming'],
  ["nobody understands you like me", 0.9, 'grooming'], ["i understand you better", 0.7, 'grooming'],
  ["you're different from others", 0.7, 'grooming'], ["you so special sia", 0.8, 'grooming'],
  ["send me a photo", 1.0, 'grooming'], ["send pic only what", 1.0, 'grooming'],
  ["send pic lah", 1.0, 'grooming'], ["meet me alone", 1.0, 'grooming'],
  ["meet outside school", 0.9, 'grooming'], ["don't bring your friends", 0.9, 'grooming'],
  ["come alone", 0.8, 'grooming'], ["you owe me one", 0.9, 'grooming'],
  ["after i help you", 0.7, 'grooming'], ["i do so much for you", 0.7, 'grooming'],
  ["trust me only", 0.9, 'grooming'], ["kill yourself", 1.0, 'cyberbullying'],
  ["nobody likes you", 0.9, 'cyberbullying'], ["go die", 0.9, 'cyberbullying'],
  ["ugly freak", 0.8, 'cyberbullying'], ["worthless", 0.7, 'cyberbullying'],
  ["kys", 1.0, 'cyberbullying'], ["you're pathetic", 0.8, 'cyberbullying'],
  ["loser", 0.5, 'cyberbullying'], ["idiot", 0.5, 'cyberbullying'],
  ["stupid", 0.4, 'cyberbullying'], ["go die lah", 1.0, 'cyberbullying'],
  ["go die sia", 1.0, 'cyberbullying'], ["bodoh", 0.8, 'cyberbullying'],
  ["bangang", 0.8, 'cyberbullying'], ["bahlol", 0.8, 'cyberbullying'],
  ["damn suay lah", 0.7, 'cyberbullying'], ["sotong", 0.6, 'cyberbullying'],
  ["you humji ah", 0.8, 'cyberbullying'], ["don't so extra lah", 0.7, 'cyberbullying'],
  ["cb lah", 0.9, 'cyberbullying'], ["knn", 0.8, 'cyberbullying'],
  ["nabeh", 0.8, 'cyberbullying'], ["cheebye", 0.9, 'cyberbullying'],
  ["lanjiao", 0.9, 'cyberbullying'], ["kena bully every day", 0.9, 'cyberbullying'],
  ["everyone hates you", 1.0, 'cyberbullying'], ["no one wants you", 0.9, 'cyberbullying'],
  ["ugly af", 0.8, 'cyberbullying'], ["fat and ugly", 0.8, 'cyberbullying'],
  ["don't invite her", 0.8, 'cyberbullying'], ["block her everyone", 0.9, 'cyberbullying'],
  ["leave the group", 0.6, 'cyberbullying'], ["i will expose you", 1.0, 'threats'],
  ["later i expose you sia", 1.0, 'threats'], ["i leak your photos", 1.0, 'threats'],
  ["i post this everywhere", 1.0, 'threats'], ["i know where you live", 1.0, 'threats'],
  ["i know where you study", 1.0, 'threats'], ["send or else", 1.0, 'threats'],
  ["send if not i tell", 1.0, 'threats'], ["watch out", 0.5, 'threats'],
  ["you'll regret", 0.7, 'threats'], ["i'll make your life", 0.8, 'threats'],
  ["you die lah", 0.9, 'threats'], ["screenshot already", 0.8, 'threats'],
  ["send otp", 1.0, 'scams'], ["verify your account", 0.9, 'scams'],
  ["your account suspended", 0.9, 'scams'], ["bank call", 0.7, 'scams'],
  ["urgent transfer", 0.9, 'scams'], ["click this link", 0.7, 'scams'],
  ["claim your prize", 0.8, 'scams'], ["you won", 0.5, 'scams'],
  ["investment opportunity", 0.7, 'scams'], ["guaranteed returns", 0.9, 'scams'],
  ["send money first", 0.9, 'scams'], ["singpass login", 0.8, 'scams'],
  ["myinfo verify", 0.8, 'scams'], ["safra voucher", 0.7, 'scams'],
  ["grab promo", 0.6, 'scams'], ["limited time only", 0.6, 'scams'],
  ["free iphone", 0.8, 'scams'], ["my nric", 1.0, 'oversharing'],
  ["my password", 1.0, 'oversharing'], ["credit card number", 1.0, 'oversharing'],
  ["bank account number", 1.0, 'oversharing'], ["my address is", 0.9, 'oversharing'],
  ["home alone", 0.8, 'oversharing'], ["parents not home", 0.9, 'oversharing'],
  ["postal code", 0.7, 'oversharing'], ["cvv", 1.0, 'oversharing'],
  ["pin number", 1.0, 'oversharing'],
];

const GROOMING_STAGES = [
  { stage: 1, label: 'Trust-building', markers: ['you are special', 'you so special', 'you mature', 'i like talking to you', 'you understand me', 'you different from others', 'you not like other'] },
  { stage: 2, label: 'Isolation', markers: ["don't tell", 'our secret', 'just between us', 'nobody else', 'keep this private', 'jangan bagitau', "don't tell your parents", "don't tell cher"] },
  { stage: 3, label: 'Boundary-testing', markers: ['send me a photo', 'send pic', 'show me', 'send video', 'what are you wearing', 'send pic only what', 'come alone', 'meet me'] },
  { stage: 4, label: 'Pressure', markers: ["why don't you trust me", 'i thought you trusted me', 'you owe me', 'after all i did', 'you promised', 'i disappointed', 'you let me down'] },
  { stage: 5, label: 'Threat / Coercion', markers: ['i expose you', 'i post your photo', 'i tell everyone', 'send or else', "you'll regret", 'i leak', 'screenshot already'] },
];

// ─── MAIN DETECTOR ───────────────────────────────────────────────────────────
async function detectHarm(messageText, conversationHistory = []) {
  const raw = messageText;
  const normalised = normaliseSinglish(raw);
  const privacyResult = _checkPrivacy(normalised, raw);
  if (privacyResult) return privacyResult;
  const keywordResult = _scoreKeywords(normalised);
  const escalationResult = _checkEscalation(normalised, conversationHistory);
  const merged = _mergeResults(keywordResult, escalationResult);
  if (merged.isHarmful && merged.confidence >= 0.6) return merged;
  try {
    const aiResult = await _callLionGuard(raw);
    if (aiResult) return aiResult;
  } catch (_) {
    if (merged.confidence >= 0.4) return { ...merged, aiLayer: false };
  }
  return { isHarmful: false };
}

function _checkPrivacy(text) {
  const PRIVACY_PATTERNS = ['my nric', 'my password', 'credit card number', 'cvv', 'bank account number', 'pin number', 'otp is', 'my otp'];
  for (const p of PRIVACY_PATTERNS) {
    if (text.includes(p)) {
      return { isHarmful: true, category: 'oversharing', confidence: 1.0, flaggedPhrases: [p], tag: 'Sensitive Data Exposed', explanation: 'You appear to be sharing sensitive personal information. Do not send this.', escalationStages: [], aiLayer: false };
    }
  }
  return null;
}

function _scoreKeywords(normalisedText) {
  const scores = { grooming: 0, cyberbullying: 0, threats: 0, scams: 0, oversharing: 0 };
  const flagged = [];
  for (const [phrase, weight, category] of HARM_LEXICON) {
    if (normalisedText.includes(phrase)) { scores[category] += weight; flagged.push({ phrase, category, weight }); }
  }
  let topCategory = null; let topScore = 0;
  for (const [cat, score] of Object.entries(scores)) { if (score > topScore) { topScore = score; topCategory = cat; } }
  if (topCategory && topScore >= 0.4) {
    return { isHarmful: topScore >= 0.6, category: topCategory, confidence: Math.min(topScore, 1.0), flaggedPhrases: flagged.map(f => f.phrase), tag: _riskTag(topCategory), explanation: _explanation(topCategory), escalationStages: [], aiLayer: false };
  }
  return { isHarmful: false, confidence: 0, escalationStages: [] };
}

function _checkEscalation(normalisedText, history) {
  const allText = [...history.map(normaliseSinglish), normalisedText].join(' ');
  const stagesDetected = [];
  for (const stage of GROOMING_STAGES) { if (stage.markers.some(m => allText.includes(m))) { stagesDetected.push(stage); } }
  if (stagesDetected.length >= 2) {
    const confidence = Math.min(0.3 + stagesDetected.length * 0.15, 1.0);
    return { isHarmful: true, category: 'grooming', confidence, flaggedPhrases: stagesDetected.map(s => s.label), tag: 'Grooming Escalation Pattern', explanation: `This conversation shows ${stagesDetected.length} escalating grooming stages: ${stagesDetected.map(s => s.label).join(' → ')}.`, escalationStages: stagesDetected, aiLayer: false };
  }
  return { isHarmful: false, confidence: 0, escalationStages: stagesDetected };
}

function _mergeResults(keywordResult, escalationResult) {
  const base = keywordResult.confidence >= escalationResult.confidence ? keywordResult : escalationResult;
  return { ...base, escalationStages: [...(keywordResult.escalationStages || []), ...(escalationResult.escalationStages || [])].filter((s, i, arr) => arr.findIndex(x => x.stage === s.stage) === i), confidence: Math.max(keywordResult.confidence || 0, escalationResult.confidence || 0), isHarmful: (keywordResult.confidence || 0) + (escalationResult.confidence || 0) >= 0.6 };
}

const HF_TOKEN = 'hf_YVmOVEkEIdGHjNvllAblk1QlsoswnTQHLU';

async function _callLionGuard(text) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/govtech/lionguard-2.1', { method: 'POST', headers: { 'Authorization': `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: text }), signal: controller.signal });
    clearTimeout(timeout); if (!response.ok) return null;
    const result = await response.json(); const scores = Array.isArray(result[0]) ? result[0] : result;
    const topLabel = scores.reduce((a, b) => a.score > b.score ? a : b);
    if (topLabel.label === 'safe' || topLabel.score < 0.7) return null;
    const LABEL_MAP = { toxic: 'cyberbullying', insult: 'cyberbullying', sexual: 'grooming', scam: 'scams', spam: 'scams', threat: 'threats' };
    const category = LABEL_MAP[topLabel.label] || 'cyberbullying';
    return { isHarmful: true, category, confidence: topLabel.score, flaggedPhrases: [], tag: _riskTag(category), explanation: `LionGuard 2.1 classified this message as "${topLabel.label}" with ${(topLabel.score * 100).toFixed(0)}% confidence.`, escalationStages: [], aiLayer: true };
  } catch (err) { clearTimeout(timeout); throw err; }
}

function _riskTag(category) { return { grooming: 'Boundary Testing', cyberbullying: 'Repeated Humiliation', threats: 'Emotional Blackmail', scams: 'Urgency Scam', oversharing: 'Sensitive Data Exposed' }[category] || 'Harmful Content'; }
function _explanation(category) { return { grooming: 'The sender may be encouraging secrecy or trying to build inappropriate trust.', cyberbullying: 'This message contains language commonly associated with insults, humiliation, or harassment.', threats: 'The message contains language that may pressure, intimidate, or threaten someone.', scams: 'The sender is creating urgency or requesting sensitive information.', oversharing: 'Sensitive personal information is being shared. This could be used against you.' }[category] || 'A harmful pattern has been detected.'; }

const SAFE_REPLIES = {
  grooming: [{ label: 'Gentle', text: "I'm not comfortable with this. Please stop asking." }, { label: 'Firm', text: 'No. Do not contact me again.' }, { label: 'Exit', text: "I'm leaving this chat now." }, { label: 'Ask for help', text: "Hi, I need help. Someone online is making me uncomfortable and asking me to keep secrets." }],
  cyberbullying: [{ label: 'Disengage', text: "I won't respond to this kind of message." }, { label: 'Firm', text: 'Stop this now. This is harassment.' }, { label: 'Bystander', text: "This is hurtful. Please stop." }, { label: 'Ask for help', text: "Someone is sending me hurtful messages. Can you help me?" }],
  threats: [{ label: 'No reply', text: "(Do not reply. Screenshot and report immediately.)" }, { label: 'Firm', text: 'I am reporting this conversation to the platform and authorities.' }, { label: 'Ask for help', text: "I am receiving threats online. I need help now." }],
  scams: [{ label: 'Verify', text: "I need to verify this through official channels before proceeding." }, { label: 'Disengage', text: "I will not be sharing any personal information." }, { label: 'Block', text: "(Block and report this sender.)" }],
  oversharing: [{ label: 'Retract', text: "Please ignore that. I shared something I shouldn't have." }, { label: 'Stop sharing', text: "I cannot share that kind of information online." }],
};

// ─── UI & STORAGE BUILDERS ───────────────────────────────────────────────────

async function saveIncident(incident) {
  const { incidents = [] } = await chrome.storage.local.get(['incidents']);
  incidents.push({ ...incident, timestamp: new Date().toISOString() });
  if (incidents.length > 200) incidents.splice(0, incidents.length - 200);
  await chrome.storage.local.set({ incidents });
}

async function updateStats(category) {
  const { detectionStats = { grooming:0, cyberbullying:0, threats:0, scams:0, oversharing:0 } } = await chrome.storage.local.get(['detectionStats']);
  if (category in detectionStats) detectionStats[category]++;
  await chrome.storage.local.set({ detectionStats });
}

function notifyPopup(detection) {
  chrome.runtime.sendMessage({ action: 'HARM_DETECTED', category: detection.category, tag: detection.tag, confidence: detection.confidence, replies: SAFE_REPLIES[detection.category] || [], explanation: detection.explanation }).catch(() => {});
}

function buildAlertCard(detection, incidentRef) {
  const card = document.createElement('div');
  card.className = `ss-alert ss-alert--${detection.category}`;
  let timelineHTML = '';
  if (detection.escalationStages && detection.escalationStages.length >= 2) {
    const dots = detection.escalationStages.map(s => `<div class="ss-stage"><span class="ss-stage__dot"></span><span class="ss-stage__label">Stage ${s.stage}: ${s.label}</span></div>`).join('');
    timelineHTML = `<div class="ss-timeline"><div class="ss-timeline__title">⚠ Escalation Pattern</div>${dots}</div>`;
  }
  const replies = (SAFE_REPLIES[detection.category] || []).map(r => `<button class="ss-reply" data-text="${r.text.replace(/"/g, '&quot;')}">${r.text}</button>`).join('');
  card.innerHTML = `<div class="ss-header"><span class="ss-icon">🛡️</span><div class="ss-header__text"><div class="ss-title">SafeSignal Alert</div><div class="ss-tag ss-tag--${detection.category}">${detection.tag || 'Alert'}</div></div><button class="ss-close">×</button></div><div class="ss-body"><p class="ss-why"><strong>Why am I seeing this?</strong><br>${detection.explanation}</p>${timelineHTML}<div class="ss-confidence">Confidence: <strong>${(detection.confidence*100).toFixed(0)}%</strong></div><div class="ss-section-label">💬 Reply Coach</div><div class="ss-replies">${replies}</div><div class="ss-actions"><button class="ss-btn ss-btn--primary" data-action="save-evidence">📥 Save Evidence</button></div></div>`;
  card.querySelector('.ss-close').addEventListener('click', () => card.remove());
  card.querySelectorAll('.ss-reply').forEach(btn => { btn.addEventListener('click', async () => { await navigator.clipboard.writeText(btn.dataset.text); btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = btn.dataset.text, 2000); }); });
  card.querySelector('[data-action="save-evidence"]').addEventListener('click', () => exportEvidence(incidentRef));
  return card;
}

async function exportEvidence(incident) {
  const lines = ['SafeSignal — Incident Report', `Date: ${new Date().toLocaleString()}`, `Platform: ${incident.platform || 'Unknown'}`, `Category: ${incident.category}`, `Message: "${incident.text}"`, `Explanation: ${incident.explanation}`].join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `safesignal-incident-${Date.now()}.txt`; a.click();
}