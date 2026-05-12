// Load and display stats
chrome.storage.local.get(['detectionStats'], (result) => {
  const stats = result.detectionStats || {
    grooming: 0,
    cyberbullying: 0,
    scams: 0,
    oversharing: 0
  };
  
  document.getElementById('stat-grooming').textContent = stats.grooming;
  document.getElementById('stat-cyberbullying').textContent = stats.cyberbullying;
  document.getElementById('stat-scams').textContent = stats.scams;
  document.getElementById('stat-oversharing').textContent = stats.oversharing;
});

// Load Family Mode setting
chrome.storage.sync.get(['familyMode'], (result) => {
  document.getElementById('familyModeToggle').checked = result.familyMode || false;
});

// Handle Family Mode toggle
document.getElementById('familyModeToggle').addEventListener('change', (e) => {
  const enabled = e.target.checked;
  chrome.storage.sync.set({ familyMode: enabled });
  
  // Show confirmation
  if (enabled) {
    console.log('Family Mode enabled - Safe roleplay mode for parent-child conversations');
  } else {
    console.log('Family Mode disabled');
  }
});
