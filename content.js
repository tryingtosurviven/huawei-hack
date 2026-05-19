console.log("SafeSignal active");

// ===============================
// HARM DATABASE
// ===============================
const nricRegex = /[STFGM][0-9]{7}[A-Z]/i;

const harmfulPatterns = {
  bullying: [
    "go die",
    "nobody likes you",
    "stupid idiot",
    "loser",
    "ugly freak",
    "kill yourself",
    "worthless"
  ],

  singlishBullying: [
    "cb",
    "knn",
    "siao",
    "humji",
    "go die lah",
    "damn suay",
    "stupid sia",
    "eh idiot"
  ],

  grooming: [
    "don't tell your parents",
    "our secret",
    "meet me alone",
    "trust me only",
    "send me a pic",
    "you are mature for your age"
  ],

  threats: [
    "i expose you",
    "i know where you live",
    "send or else",
    "i leak your photos",
    "watch out"
  ],

  scams: [
    "verify your account",
    "send otp",
    "click this link",
    "urgent transfer",
    "bank suspended"
  ]
};

// ===============================
// DETECTION ENGINE
// ===============================

async function callLionGuardAI(text) {
  const toxicWords = ["pig", "die", "hurt", "stupid", "dumb"];
  const isToxic = toxicWords.some(word => text.toLowerCase().includes(word));
  
  if (isToxic) {
    return {
      isHarmful: true,
      category: 'bullying',
      suggestion: 'Our AI suggests this message has an aggressive tone. Avoid escalating!'
    };
  }
  return { isHarmful: false };
}

async function detectHarm(message) {
  const lower = message.toLowerCase();

  // 1. PRIORITY: Local NRIC Check
  if (nricRegex.test(message)) {
    return {
      detected: true,
      category: 'oversharing',
      pattern: 'NRIC Pattern',
      severity: 'high',
      suggestion: 'You are sharing an NRIC number. This is high-risk personal data!'
    };
  }

  // 2. Local Keyword Check (Fast)
  for (const category in harmfulPatterns) {
    for (const pattern of harmfulPatterns[category]) {
      if (lower.includes(pattern)) {
        return { detected: true, category, pattern, severity: getSeverity(category), suggestion: `Detected harmful language: ${pattern}` };
      }
    }
  }

  // 3. AI Check (For phrases like "useless pig")
  // Replace this with your actual fetch() call to LionGuard / Huawei AI if you have the URL
  // For now, here is the logic:
  const aiResult = await callLionGuardAI(message); 
  if (aiResult.isHarmful) {
    return {
      detected: true,
      category: aiResult.category,
      pattern: 'AI Analysis',
      severity: 'medium',
      suggestion: aiResult.suggestion
    };
  }

  return { detected: false };
}

function getSeverity(category) {

  switch(category) {

    case 'grooming':
    case 'threats':
      return 'high';

    case 'bullying':
    case 'scams':
      return 'medium';

    default:
      return 'low';
  }
}

// ===============================
// STORAGE
// ===============================

async function saveIncident(incident) {

  const result = await chrome.storage.local.get(['incidents']);

  const incidents = result.incidents || [];

  incidents.push({
    ...incident,
    timestamp: new Date().toISOString()
  });

  await chrome.storage.local.set({
    incidents
  });

  console.log("Incident saved");
}

// ===============================
// ALERT UI
// ===============================

function showAlert(result, text) {
  if (document.getElementById("safesignal-alert")) return;

  const alert = document.createElement('div');
  alert.id = "safesignal-alert";
  
  const displayMessage = result.suggestion || `Potential ${result.category} detected.`;

  alert.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; width: 320px; background: white; border-left: 8px solid #ff4444; padding: 20px; z-index: 999999; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); font-family: sans-serif;">
      <h3 style="margin: 0; color: #ff4444;">🛡️ SafeSignal Alert</h3>
      <p style="color: #333; margin: 10px 0;"><strong>${result.category.toUpperCase()}</strong></p>
      <p style="font-size: 14px; color: #666;">${displayMessage}</p>
      <div style="margin-top: 15px; display: flex; gap: 10px;">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="flex: 1; background: #eee; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">Dismiss</button>
        <button style="flex: 1; background: #ff4444; color: white; border: none; padding: 8px; border-radius: 5px; cursor: pointer;">Safe Reply</button>
      </div>
    </div>
  `;
  document.body.appendChild(alert);

  // Link to Shaira's Vault
  if (typeof saveIncident === 'function') {
    saveIncident({ text, category: result.category, severity: result.severity || 'medium' });
  }
}

// ===============================
// WHATSAPP OBSERVER
// ===============================

const observer = new MutationObserver((mutations) => {

  mutations.forEach((mutation) => {

    mutation.addedNodes.forEach(async (node) => {

      if (!(node instanceof HTMLElement)) return;

      const messages = node.querySelectorAll("span.selectable-text");

      messages.forEach(async (msg) => {

        const text = msg.innerText;

        if (!text) return;

        const result = await detectHarm(text);

        if (result.detected) {

          console.log("Harm detected:", result);

          await saveIncident({
            text,
            category: result.category,
            severity: result.severity
          });

          showAlert(result, text);
        }

      });

    });

  });

});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log("SafeSignal active");

// SIMPLE TEST SCANNER (DEBUG VERSION)

async function scan() {
  const messages = document.querySelectorAll("div[role='row'], span.selectable-text");

  for (const m of messages) {
    const text = m.innerText;
    if (!text) continue;

    console.log("SafeSignal scanning:", text);

    // Added 'await' here because detectHarm is now async
    const result = await detectHarm(text);

    if (result.detected) {
      console.log("SAFE SIGNAL HIT:", result);
      showAlert(result, text);
    }
  }
}

// Change the interval to 3000ms (3 seconds) to give the AI time to breathe
setInterval(async () => {
  await scan();
}, 3000);

console.log("SafeSignal scanner running with Async support");