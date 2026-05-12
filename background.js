// SafeSignal Background Service Worker
console.log('SafeSignal: Background service worker initialized');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SafeSignal extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    detectionStats: {
      grooming: 0,
      cyberbullying: 0,
      scams: 0,
      oversharing: 0
    }
  });
  
  chrome.storage.sync.set({
    familyMode: false
  });
});

// Future: Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reportHarm') {
    // Handle harm reporting to backend/IMDA
    console.log('Harm reported:', request.data);
    sendResponse({ success: true });
  }
});
