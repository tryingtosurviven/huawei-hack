console.log('🛡️ SafeSignal: Content script loaded!');
console.log('🛡️ SafeSignal: Monitoring WhatsApp Web for harmful patterns...');

// Wait for page to fully load
setTimeout(() => {
  console.log('🛡️ SafeSignal: Initializing observer...');
  
  const mainContainer = document.querySelector('#main');
  if (mainContainer) {
    console.log('✅ SafeSignal: WhatsApp container found!');
    alert('✅ SafeSignal is now active on this page!');
  } else {
    console.log('❌ SafeSignal: Container not found yet, retrying...');
  }
}, 2000);
