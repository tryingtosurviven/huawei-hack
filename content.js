console.log("SafeSignal active");

// ===============================
// HARM DATABASE
// ===============================

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

function detectHarm(message) {

  const lower = message.toLowerCase();

  for (const category in harmfulPatterns) {

    const patterns = harmfulPatterns[category];

    for (const pattern of patterns) {

      if (lower.includes(pattern)) {

        return {
          detected: true,
          category,
          pattern,
          severity: getSeverity(category)
        };
      }
    }
  }

  return {
    detected: false
  };
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

  const existing = document.getElementById("safesignal-alert");

  if (existing) {
    existing.remove();
  }

  const alert = document.createElement('div');

  alert.id = "safesignal-alert";

  alert.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: rgba(255,255,255,0.98);
      border-left: 6px solid orange;
      padding: 16px;
      z-index: 999999;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
    ">
      <h3 style="margin-top:0;">
        ⚠ Potential ${result.category}
      </h3>

      <p style="font-size:14px;">
        ${text}
      </p>

      <small>
        Detected pattern: "${result.pattern}"
      </small>

      <div style="margin-top:12px;">
        <button id="safe-btn" style="
          background:#25D366;
          border:none;
          color:white;
          padding:8px 12px;
          border-radius:8px;
          cursor:pointer;
        ">
          Safe Reply
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(alert);

  setTimeout(() => {

    if (alert.parentNode) {
      alert.remove();
    }

  }, 6000);
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

        const result = detectHarm(text);

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

function scan() {

  const messages = document.querySelectorAll("div[role='row'], span.selectable-text");

  messages.forEach((m) => {

    const text = m.innerText;

    if (!text) return;

    console.log("SafeSignal scanning:", text);

    const result = detectHarm(text);

    if (result.detected) {
      console.log("SAFE SIGNAL HIT:", result);
      showAlert(result, text);
    }

  });

}

setInterval(scan, 2000);

console.log("SafeSignal scanner running");