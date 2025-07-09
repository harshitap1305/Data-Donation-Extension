document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('userSettings', (data) => {
    const settings = data.userSettings || {};
    ['trackInteractions', 'classifyContent', 'gamification', 'researchConsent'].forEach(id => {
      document.getElementById(id).checked = !!settings[id];
    });
  });

  document.getElementById('save').addEventListener('click', () => {
    const settings = {};
    ['trackInteractions', 'classifyContent', 'gamification', 'researchConsent'].forEach(id => {
      settings[id] = document.getElementById(id).checked;
    });
    chrome.storage.local.set({ userSettings: settings }, () => {
      document.getElementById('status').textContent = 'Settings saved.';
    });
  });
});
