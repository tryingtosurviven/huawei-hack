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

// Mock AI Detection Function (Placeholder for Huawei ModelArts API)
async function detectHarmPattern(messageText, conversationContext = []) {
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const text = messageText.toLowerCase();
  
  const patterns = {
    grooming: {
      keywords: [
        'meet me alone', 'don\'t tell your parents', 'keep secret',
        'jangan cakap siapa siapa', 'just between us', 'delete this chat',
        'i love you', 'you special', 'nobody understand you like me'
      ],
      isolationPhrases: ['alone', 'secret', 'don\'t tell', 'just us'],
      confidence: 0
    },
    cyberbullying: {
      singlishInsults: [
        'go die lah', 'damn suay', 'loser sia', 'bodoh', 'stupid idiot',
        'ugly af', 'nobody likes you', 'kys', 'kill yourself',
        'useless piece of shit', 'go kms', 'die la you'
      ],
      confidence: 0
    },
    scams: {
      phishingIndicators: [
        'click this link', 'verify your account', 'you won',
        'free money', 'urgent action required', 'limited time offer',
        'confirm your details', 'suspended account', 'claim your prize',
        'investment opportunity guaranteed'
      ],
      confidence: 0
    },
    oversharing: {
      sensitiveInfo: [
        'my nric', 'my password', 'credit card', 'bank account',
        'my address is', 'meet at my house', 'home alone',
        'parents not home', 'postal code'
      ],
      confidence: 0
    }
  };

  let detectedCategory = null;
  let maxConfidence = 0;
  let flaggedPhrases = [];

  patterns.grooming.keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      patterns.grooming.confidence += 0.3;
      flaggedPhrases.push(keyword);
    }
  });
  
  if (conversationContext.length >= 3) {
    const recentMessages = conversationContext.slice(-5).join(' ').toLowerCase();
    patterns.grooming.isolationPhrases.forEach(phrase => {
      if (recentMessages.includes(phrase)) {
        patterns.grooming.confidence += 0.2;
      }
    });
  }

  patterns.cyberbullying.singlishInsults.forEach(insult => {
    if (text.includes(insult)) {
      patterns.cyberbullying.confidence += 0.4;
      flaggedPhrases.push(insult);
    }
  });

  patterns.scams.phishingIndicators.forEach(indicator => {
    if (text.includes(indicator)) {
      patterns.scams.confidence += 0.35;
      flaggedPhrases.push(indicator);
    }
  });

  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlPattern);
  if (urls && urls.length > 0) {
    if (urls.some(url => url.includes('bit.ly') || url.includes('.tk') || url.includes('.ml'))) {
      patterns.scams.confidence += 0.3;
    }
  }

  patterns.oversharing.sensitiveInfo.forEach(info => {
    if (text.includes(info)) {
      patterns.oversharing.confidence += 0.5;
      flaggedPhrases.push(info);
    }
  });

  Object.keys(patterns).forEach(category => {
    if (patterns[category].confidence > maxConfidence && patterns[category].confidence >= 0.4) {
      maxConfidence = patterns[category].confidence;
      detectedCategory = category;
    }
  });

  if (detectedCategory) {
    return {
      isHarmful: true,
      category: detectedCategory,
      confidence: Math.min(maxConfidence, 1.0),
      flaggedPhrases: flaggedPhrases,
      suggestion: getSuggestion(detectedCategory)
    };
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
  if (messageElement.querySelector('.safesignal-alert')) {
    return;
  }

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

const observer = new MutationObserver(async (mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(async (node) => {
        if (node.nodeType === 1) {
          const messageElements = node.querySelectorAll('[data-id], .message-in, .message-out');
          
          for (const msgElement of messageElements) {
            const textElement = msgElement.querySelector('span.selectable-text');
            if (textElement && textElement.textContent.trim()) {
              const messageText = textElement.textContent.trim();
              
              conversationHistory.push(messageText);
              if (conversationHistory.length > 20) {
                conversationHistory.shift();
              }
              
              const detection = await detectHarmPattern(messageText, conversationHistory);
              
              if (detection.isHarmful) {
                console.log('SafeSignal: Harmful pattern detected', detection);
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
  const chatContainer = document.querySelector('#main');
  if (chatContainer) {
    observer.observe(chatContainer, {
      childList: true,
      subtree: true
    });
    console.log('SafeSignal: Observer initialized successfully');
  } else {
    setTimeout(initObserver, 2000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initObserver);
} else {
  initObserver();
}
