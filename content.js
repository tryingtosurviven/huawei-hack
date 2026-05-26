// SafeSignal Content Script - WhatsApp Web Message Monitor
console.log('SafeSignal: Monitoring WhatsApp Web for harmful patterns...');

// Configuration
let familyModeEnabled = false;
let detectionStats = {
  grooming: 0,
  cyberbullying: 0,
  scams: 0,
  oversharing: 0
};

// Check Family Mode status from storage
chrome.storage.sync.get(['familyMode'], (result) => {
  familyModeEnabled = result.familyMode || false;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.familyMode) {
    familyModeEnabled = changes.familyMode.newValue;
  }
});

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


// Mock AI Detection Function (Placeholder for Huawei ModelArts API)
async function detectHarmPattern(messageText, conversationContext = []) {
  const text = messageText.toLowerCase();
  
  // --- LAYER 1: INSTANT LOCAL PRIVACY GUARD ---
  // We keep this local because it's faster and protects user data like NRICs.
  const sensitiveInfo = [
    'my nric', 'my password', 'credit card', 'bank account',
    'my address is', 'postal code', 'home alone', 'parents not home'
  ];

  for (const info of sensitiveInfo) {
    if (text.includes(info)) {
      return {
        isHarmful: true,
        category: 'oversharing',
        confidence: 1.0,
        flaggedPhrases: [info],
        suggestion: getSuggestion('oversharing')
      };
    }
  }

  // --- LAYER 2: LIONGUARD 2.1 AI ENGINE ---
  // This is the "brain" you set up on Hugging Face.
  const HF_TOKEN = "hf_YVmOVEkEIdGHjNvllAblk1Qlso swnTQHLU"; 
  const url = "https://api-inference.huggingface.co/models/govtech/lionguard-2.1";

  try {
    const response = await fetch(url, {
      headers: { 
        "Authorization": "Bearer " + HF_TOKEN,
        "Content-Type": "application/json"
      },
      method: "POST",
      body: JSON.stringify({ inputs: messageText }),
    });

    const result = await response.json();
    
    if (result && result.length > 0) {
      const topResult = result[0]; 
      const category = topResult.label;

      // LionGuard 2.1 labels: 'safe', 'toxic', 'insult', 'sexual', 'scam'
      if (category !== "safe") {
        // Map AI labels to your UI categories (for Aditi's UI)
        let uiCategory = 'cyberbullying'; 
        if (category === 'scam' || category === 'spam') uiCategory = 'scams';
        if (category === 'sexual') uiCategory = 'grooming';

        return {
          isHarmful: true,
          category: uiCategory,
          confidence: topResult.score,
          suggestion: getSuggestion(uiCategory)
        };
      }
    }
  } catch (error) {
    console.error("SafeSignal AI Layer Error:", error);
    
    // --- LAYER 3: EMERGENCY LOCAL BACKUP ---
    // If API fails or is slow, this catches the most common Singlish insults.
    const emergencyInsults = ['go die lah', 'bodoh', 'damn suay', 'stupid idiot', 'loser sia'];
    for (const insult of emergencyInsults) {
      if (text.includes(insult)) {
        return {
          isHarmful: true,
          category: 'cyberbullying',
          confidence: 0.6,
          suggestion: getSuggestion('cyberbullying')
        };
      }
    }
  }

  return { isHarmful: false };
}

function getSuggestion(category) {
  const suggestions = {
    grooming: {
      title: 'Potential Grooming Pattern Detected',
      message: 'This conversation shows signs of isolation or manipulation. Consider talking to a trusted adult.',
      actions: ['Block Contact', 'Report to IMDA', 'Talk to Parent']
    },
    cyberbullying: {
      title: 'Cyberbullying Language Detected',
      message: 'This message contains hurtful language. You don\'t have to tolerate this.',
      actions: ['Block & Report', 'Save Evidence', 'Get Support']
    },
    scams: {
      title: 'Potential Scam or Phishing',
      message: 'This message may be attempting to steal your information or money.',
      actions: ['Block Sender', 'Report Scam', 'Delete Message']
    },
    oversharing: {
      title: 'Sensitive Information Shared',
      message: 'Sharing personal details online can be risky. Consider deleting this message.',
      actions: ['Delete Message', 'Review Privacy', 'Learn More']
    }
  };
  
  return suggestions[category];
}

function showAlertCard(messageElement, detection) {
  if (messageElement.querySelector('.safesignal-alert')) return;

  const alertCard = document.createElement('div');
  alertCard.className = 'safesignal-alert';
  
  const actions = detection.suggestion.actions.map(action => {
    return '<button class="safesignal-action-btn">' + action + '</button>';
  }).join('');
  
  alertCard.innerHTML = '<div class="safesignal-header">' +
    '<span class="safesignal-icon">🛡️</span>' +
    '<span class="safesignal-title">' + detection.suggestion.title + '</span>' +
    '<button class="safesignal-close">×</button>' +
    '</div>' +
    '<p class="safesignal-message">' + detection.suggestion.message + '</p>' +
    '<div class="safesignal-confidence">' +
    'Confidence: ' + (detection.confidence * 100).toFixed(0) + '%' +
    (familyModeEnabled ? '<span class="family-mode-badge">👨‍👩‍👧 Family Mode</span>' : '') +
    '</div>' +
    '<div class="safesignal-actions">' + actions + '</div>';

  messageElement.style.position = 'relative';
  messageElement.appendChild(alertCard);

  alertCard.querySelector('.safesignal-close').addEventListener('click', () => {
    alertCard.remove();
  });

  alertCard.querySelectorAll('.safesignal-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.textContent;
      handleAction(action, detection);
    });
  });

  detectionStats[detection.category]++;
  chrome.storage.local.set({ detectionStats });
}

function handleAction(action, detection) {
  console.log('SafeSignal: Action triggered - ' + action, detection);
  
  switch(action) {
    case 'Block Contact':
    case 'Block Sender':
    case 'Block & Report':
      alert('This would block the contact (demo mode)');
      break;
    case 'Report to IMDA':
    case 'Report Scam':
      alert('This would open IMDA reporting portal (demo mode)');
      break;
    case 'Talk to Parent':
      alert('This would notify parent in Family Mode (demo mode)');
      break;
    case 'Get Support':
      alert('This would show support resources (demo mode)');
      break;
    case 'Save Evidence':
      alert('This would save screenshot for evidence (demo mode)');
      break;
    case 'Delete Message':
      alert('This would delete the message (demo mode)');
      break;
    default:
      alert('Action: ' + action + ' (demo mode)');
  }
}

let conversationHistory = [];

// ===============================
// STORAGE (Required for Shaira's Vault)
// ===============================

async function saveIncident(incident) {
  const result = await chrome.storage.local.get(['incidents']);
  const incidents = result.incidents || [];

  incidents.push({
    ...incident,
    timestamp: new Date().toISOString()
  });

  await chrome.storage.local.set({ incidents });
  console.log("SafeSignal: Incident saved to Evidence Vault");
}

// Observer to monitor new messages
const observer = new MutationObserver(async (mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(async (node) => {
        if (node.nodeType === 1) {
          // WE ARE MAKING THIS WIDER: Look for any div that might contain text
          const messageElements = node.querySelectorAll('.message-in, .message-out, [data-id]');
          
          for (const msgElement of messageElements) {
            // --- ADD THIS LINE ---
            // If we already flagged this specific bubble, skip it!
            if (msgElement.hasAttribute('data-safesignal-checked')) continue;

            // Search for the text within the bubble more broadly
            const textElement = msgElement.querySelector('span.selectable-text, .copyable-text span');
            
            if (textElement && textElement.textContent.trim()) {
              const messageText = textElement.textContent.trim();
              msgElement.setAttribute('data-safesignal-checked', 'true');

              
              // Add to conversation history (Important for context-aware detection)
              conversationHistory.push(messageText);
              if (conversationHistory.length > 20) {
                conversationHistory.shift(); 
              }
              
              // Run the Hybrid Detection (Privacy Guard + LionGuard AI)
              const detection = await detectHarmPattern(messageText, conversationHistory);
              
              if (detection.isHarmful) {
                console.log('✅ SafeSignal Triggered:', detection.category);

                await saveIncident({
                  text: messageText, 
                  category: detection.category,
                  severity: detection.severity || 'medium',
                  tag: riskTags[detection.category] || "General Risk",
                  explanation: harmExplanations[detection.category]?.explanation || "Harmful pattern detected."
                });

                showAlertCard(msgElement, detection);
              }
            }
          }
        }
      });
    }
  }
});

function initObserver() {
  // Use document.body for better stability against WhatsApp UI refreshes
  const targetNode = document.body;

  if (targetNode) {
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
    console.log('SafeSignal: Stable Body Observer initialized');
  } else {
    // Retry if for some reason the body isn't ready
    setTimeout(initObserver, 1000);
  }
}

// Ensure the script runs after the page has started loading
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initObserver();
} else {
  document.addEventListener('DOMContentLoaded', initObserver);
}