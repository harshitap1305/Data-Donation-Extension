chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.local.set({
    userSettings: {
      trackInteractions: true,
      classifyContent: false,
      gamification: true,
      researchConsent: true
    }
  });
});

// Data anonymization and retention logic can be expanded here
chrome.alarms.create('dataRetention', { periodInMinutes: 1440 }); // Once per day

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dataRetention') {
    // Example: clear data older than 30 days (not implemented in this prototype)
  }
});
