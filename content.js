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
// EXPLAINABILITY DATABASE
// ===============================

const harmExplanations = {

  bullying: {
    title: "Repeated Humiliation",
    explanation:
      "This message contains language commonly associated with insults, humiliation, or harassment."
  },

  singlishBullying: {
    title: "Social Pressure",
    explanation:
      "This Singlish phrase is often used to shame, mock, or pressure another person."
  },

  grooming: {
    title: "Boundary Testing",
    explanation:
      "The sender may be encouraging secrecy or trying to build inappropriate trust."
  },

  threats: {
    title: "Threat or Blackmail",
    explanation:
      "The message contains language that may pressure, intimidate, or threaten someone."
  },

  scams: {
    title: "Urgency Scam",
    explanation:
      "The sender is creating urgency or requesting sensitive information."
  }
};

const riskTags = {

  bullying: "Repeated Humiliation",

  singlishBullying: "Social Pressure",

  grooming: "Boundary Testing",

  threats: "Emotional Blackmail",

  scams: "Urgency Scam"
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

  let panel = document.getElementById("safesignal-panel");

  const info = harmExplanations[result.category];

  if (!panel) {

    panel = document.createElement("div");

    panel.id = "safesignal-panel";

    panel.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 340px;
      background: white;
      border-radius: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: Arial, sans-serif;
      overflow: hidden;
    `;

    document.body.appendChild(panel);
  }

  panel.innerHTML = `
    <div style="
      background:#ff9800;
      color:white;
      padding:12px;
      font-weight:bold;
      font-size:16px;
    ">
      🛡 SafeSignal
    </div>

    <div style="padding:16px;">

      <div style="
        color:#d35400;
        font-weight:bold;
        margin-bottom:8px;
      ">
        ⚠ ${info.title}
      </div>

      <div style="
        font-size:13px;
        color:#555;
        margin-bottom:10px;
      ">
        Why am I seeing this?
      </div>

      <div style="
        font-size:14px;
        margin-bottom:12px;
      ">
        ${info.explanation}
      </div>

      <div style="
        background:#f5f5f5;
        padding:10px;
        border-radius:8px;
        margin-bottom:12px;
      ">
        <strong>Detected phrase:</strong><br>
        "${result.pattern}"
      </div>

      <div style="
        display:inline-block;
        background:#fff3cd;
        color:#856404;
        padding:4px 10px;
        border-radius:20px;
        font-size:12px;
        margin-bottom:12px;
      ">
        🏷 ${riskTags[result.category]}
      </div>

      <div style="
        margin-top:12px;
        font-size:13px;
      ">
        <strong>Suggested actions:</strong>
      </div>

      <ul style="
        font-size:13px;
        padding-left:18px;
      ">
        <li>Save evidence</li>
        <li>Avoid escalating</li>
        <li>Consider reporting</li>
      </ul>

      <button style="
        width:100%;
        background:#25D366;
        color:white;
        border:none;
        padding:10px;
        border-radius:8px;
        cursor:pointer;
        margin-top:10px;
      ">
        Safe Reply Coach
      </button>

    </div>
  `;
}

// ===============================
// SCANNER
// ===============================

const processedMessages = new Map();

async function scan() {

  const messages = document.querySelectorAll(
    "div[role='row'], span.selectable-text"
  );

  for (const m of messages) {

    const text = m.innerText || m.textContent;

    if (!text) continue;

    const now = Date.now();

if (
  processedMessages.has(text) &&
  now - processedMessages.get(text) < 30000
) {
  continue;
}

processedMessages.set(text, now);

    console.log("Scanning:", text);

    const result = detectHarm(text);

    if (result.detected) {

      console.log("SAFE SIGNAL HIT:", result);

      await saveIncident({
        text,
        category: result.category,
        severity: result.severity,
        tag: riskTags[result.category],
        explanation: harmExplanations[result.category].explanation
      });

      showAlert(result, text);
    }
  }
}

setInterval(scan, 2000);

console.log("SafeSignal scanner running");