function generateUUID() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

let sessionId = null;
chrome.storage.local.get('sessionId', (data) => {
  if (!data.sessionId) {
    sessionId = generateUUID();
    chrome.storage.local.set({ sessionId });
  } else {
    sessionId = data.sessionId;
  }
});

let interactionCount = 0;

function anonymizeInteraction(eventType, details) {
  // Remove PII, generalize, add noise
  return {
    sessionId,
    eventType,
    timestamp: Math.floor(Date.now() / 10000) * 10000, // generalized time
    details: {
      ...details,
      noise: Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
    }
  };
}

function saveInteraction(data) {
  chrome.storage.local.get('sessionData', (result) => {
    const sessionData = result.sessionData || { interactions: 0, events: [] };
    sessionData.interactions += 1;
    sessionData.events.push(data);
    chrome.storage.local.set({ sessionData });
  });

  // Gamification update
  chrome.storage.local.get('gamificationData', (result) => {
    const gamification = result.gamificationData || { points: 0, streak: 0, badges: [] };
    gamification.points += 1;
    chrome.storage.local.set({ gamificationData: gamification });
  });
}

// Scroll tracking
window.addEventListener('scroll', () => {
  saveInteraction(anonymizeInteraction('scroll', { scrollY: window.scrollY }));
});

// Click tracking
document.addEventListener('click', (e) => {
  let target = e.target;
  if (target.closest('ytd-video-renderer, ytd-thumbnail, ytd-comment-thread-renderer')) {
    saveInteraction(anonymizeInteraction('click', { tag: target.tagName }));
  }
});

// Hover tracking
document.addEventListener('mouseover', (e) => {
  let target = e.target;
  if (target.closest('ytd-thumbnail')) {
    saveInteraction(anonymizeInteraction('hover', { tag: target.tagName }));
  }
});

// Video engagement
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      saveInteraction(anonymizeInteraction('mutation', { type: 'childList' }));
    }
  });
});
observer.observe(document.body, { childList: true, subtree: true });
