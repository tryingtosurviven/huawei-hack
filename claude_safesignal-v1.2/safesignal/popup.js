/**
 * SafeSignal — Popup Script
 * 
 * Receives real-time detection events from background.js and:
 *   1. Shows / updates the Reply Coach with category-specific replies
 *   2. Shows the Aftercare Checklist
 *   3. Shows the "Pause Before Replying" panel
 *   4. Keeps stats updated
 *   5. Provides Evidence Vault view with export
 */

const AFTERCARE_STEPS = [
  { id: 'screenshot',  text: '📸 Take a screenshot of the full conversation' },
  { id: 'no-reply',    text: '🤫 Stop replying — do not escalate' },
  { id: 'block',       text: '🚫 Block the sender if it is safe to do so' },
  { id: 'report',      text: '🚨 Report to platform (WhatsApp → Report Contact)' },
  { id: 'tell-adult',  text: '🙋 Tell a trusted adult or school counsellor' },
  { id: 'no-delete',   text: '📁 Do NOT delete messages — keep as evidence' },
  { id: 'break',       text: '☕ Take a break from the app' },
  { id: 'support',     text: '💙 Get support if you feel anxious or unsafe' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function loadStats() {
  chrome.storage.local.get(['detectionStats'], ({ detectionStats = {} }) => {
    const fields = ['grooming', 'cyberbullying', 'threats', 'scams', 'oversharing'];
    for (const f of fields) {
      const el = $(`stat-${f}`);
      if (el) el.textContent = detectionStats[f] ?? 0;
    }
  });
}

function buildAftercare() {
  const container = $('aftercare-list');
  if (!container) return;
  container.innerHTML = '';
  AFTERCARE_STEPS.forEach(step => {
    const item = document.createElement('div');
    item.className = 'checklist-item';
    item.innerHTML = `
      <input type="checkbox" id="ac-${step.id}">
      <label for="ac-${step.id}">${step.text}</label>
    `;
    // Persist checked state in session (storage won't work across popup close/open for ephemeral state)
    const checkbox = item.querySelector('input');
    checkbox.addEventListener('change', () => {
      checkbox.parentElement.classList.toggle('checklist-item--done', checkbox.checked);
    });
    container.appendChild(item);
  });
}

// ─── DETECTION UI ────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  grooming:      '🚨 Grooming Pattern',
  cyberbullying: '😢 Cyberbullying',
  threats:       '⚠️ Threat / Blackmail',
  scams:         '🎣 Scam / Phishing',
  oversharing:   '📢 Sensitive Info Shared',
};

function showDetectionPanel(detection) {
  const wrapper = $('detection-wrapper');
  if (!wrapper) return;

  // Show the wrapper
  wrapper.classList.remove('hidden');

  // Update "Pause" panel
  const harmCat = $('harm-category');
  if (harmCat) harmCat.textContent = CATEGORY_LABELS[detection.category] || detection.category;

  const pauseExpl = $('pause-explanation');
  if (pauseExpl) pauseExpl.textContent = detection.explanation || '';

  const confEl = $('pause-confidence');
  if (confEl) confEl.textContent = detection.confidence
    ? `Confidence: ${(detection.confidence * 100).toFixed(0)}%`
    : '';

  // Update Reply Coach
  const replyOptions = $('reply-options');
  if (replyOptions && detection.replies?.length) {
    replyOptions.innerHTML = '';
    detection.replies.forEach(replyText => {
      const btn = document.createElement('button');
      btn.className = 'reply-btn';
      btn.textContent = replyText;
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(replyText).catch(() => {});
        btn.textContent = '✓ Copied to clipboard!';
        btn.classList.add('reply-btn--copied');
        setTimeout(() => { btn.textContent = replyText; btn.classList.remove('reply-btn--copied'); }, 2000);
      });
      replyOptions.appendChild(btn);
    });
  }

  // Scroll to top so user sees the warning immediately
  document.body.scrollTop = 0;
}

// ─── EVIDENCE VAULT ──────────────────────────────────────────────────────────

function renderVault(incidents) {
  const list = $('vault-list');
  if (!list) return;

  if (!incidents.length) {
    list.innerHTML = '<p class="vault-empty">No incidents recorded yet.</p>';
    return;
  }

  list.innerHTML = '';
  [...incidents].reverse().slice(0, 10).forEach((inc, i) => {
    const item = document.createElement('div');
    item.className = 'vault-item';
    item.innerHTML = `
      <div class="vault-item__header">
        <span class="vault-item__cat vault-item__cat--${inc.category}">${inc.category}</span>
        <span class="vault-item__time">${new Date(inc.timestamp).toLocaleString('en-SG', { dateStyle:'short', timeStyle:'short' })}</span>
      </div>
      <div class="vault-item__text">"${inc.text?.substring(0, 60)}${inc.text?.length > 60 ? '…' : ''}"</div>
      <div class="vault-item__tag">${inc.tag || ''}</div>
    `;
    list.appendChild(item);
  });
}

function exportAllEvidence(incidents) {
  if (!incidents.length) return;

  const lines = [
    '══════════════════════════════════════════',
    '     SafeSignal — Full Incident Report     ',
    '══════════════════════════════════════════',
    `Generated: ${new Date().toLocaleString('en-SG')}`,
    `Total incidents: ${incidents.length}`,
    '',
    ...incidents.map((inc, i) => [
      `── Incident ${i + 1} ──────────────────────────`,
      `Time     : ${new Date(inc.timestamp).toLocaleString('en-SG')}`,
      `Category : ${inc.category}`,
      `Risk Tag : ${inc.tag}`,
      `Confidence: ${inc.confidence ? (inc.confidence * 100).toFixed(0) + '%' : 'N/A'}`,
      `Message  : "${inc.text}"`,
      `Explanation: ${inc.explanation}`,
      inc.flaggedPhrases?.length ? `Flagged  : ${inc.flaggedPhrases.join(', ')}` : '',
      '',
    ].join('\n')),
    '══════════════════════════════════════════',
    'SafeSignal — Huawei Hackathon 2025 | Built for Singapore',
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `safesignal-report-${Date.now()}.txt`; a.click();
  URL.revokeObjectURL(url);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  buildAftercare();
  loadStats();

  // Family mode toggle
  const toggle = $('familyModeToggle');
  if (toggle) {
    chrome.storage.sync.get(['familyMode'], ({ familyMode }) => {
      toggle.checked = !!familyMode;
    });
    toggle.addEventListener('change', e => {
      chrome.storage.sync.set({ familyMode: e.target.checked });
    });
  }

  // On popup open, ask background for the latest detection (if popup opened after detection)
  chrome.runtime.sendMessage({ action: 'GET_LATEST' }, ({ detection } = {}) => {
    if (detection) showDetectionPanel(detection);
  });

  // Listen for real-time detection events pushed from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'POPUP_UPDATE') {
      showDetectionPanel(msg);
      loadStats();
    }
  });

  // Evidence Vault tab / button
  const vaultBtn = $('btn-show-vault');
  const vaultPanel = $('vault-panel');
  if (vaultBtn && vaultPanel) {
    vaultBtn.addEventListener('click', () => {
      const isHidden = vaultPanel.classList.toggle('hidden');
      if (!isHidden) {
        chrome.runtime.sendMessage({ action: 'GET_INCIDENTS' }, ({ incidents = [] }) => {
          renderVault(incidents);
        });
      }
    });
  }

  // Export full report
  const exportBtn = $('btn-export-vault');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'GET_INCIDENTS' }, ({ incidents = [] }) => {
        exportAllEvidence(incidents);
      });
    });
  }

  // Dismiss detection panel
  const dismissBtn = $('btn-dismiss-detection');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      $('detection-wrapper')?.classList.add('hidden');
    });
  }
});
