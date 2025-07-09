// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const consentScreen = document.getElementById('consentScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const startContributingBtn = document.getElementById('startContributingBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');

    // Dashboard metrics display elements
    const researchPointsSpan = document.getElementById('researchPoints');
    const dayStreakSpan = document.getElementById('dayStreak');
    const currentLevelSpan = document.getElementById('currentLevel'); // Placeholder for now
    const interactionsAnonymizedSpan = document.getElementById('interactionsAnonymized');
    const videosWatchedSpan = document.getElementById('videosWatched');
    const totalEngagementTimeSpan = document.getElementById('totalEngagementTime');
    const sessionUuidSpan = document.getElementById('sessionUuid');
    const trackingStatusSpan = document.getElementById('trackingStatus');

    // Function to generate a UUID (Universally Unique Identifier)
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Helper function to format time in seconds to a human-readable string
    function formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            return `${Math.round(seconds / 60)}m`;
        } else {
            return `${Math.round(seconds / 3600)}h`;
        }
    }

    // Function to update the display of metrics on the dashboard
    function updateDashboardMetrics(metrics) {
        // Calculate interactions anonymized from overall clicks and scrolls
        const interactionsAnonymized = (metrics.totalOverallClicksRecorded || 0) + (metrics.totalOverallScrollsRecorded || 0);

        // Update dashboard elements
        researchPointsSpan.textContent = interactionsAnonymized; // Simple mapping for prototype
        dayStreakSpan.textContent = "0"; // Placeholder for now
        currentLevelSpan.textContent = "Supporter"; // Placeholder for now
        interactionsAnonymizedSpan.textContent = interactionsAnonymized;
        videosWatchedSpan.textContent = metrics.totalOverallVideosWatched || 0;
        totalEngagementTimeSpan.textContent = formatTime(metrics.totalOverallEngagementTime || 0);
        sessionUuidSpan.textContent = metrics.sessionId || 'N/A';
    }

    // Load initial state from storage
    chrome.storage.local.get(['dataCollectionEnabled', 'metrics', 'sessionId'], (result) => {
        const isEnabled = result.dataCollectionEnabled || false;
        const storedMetrics = result.metrics || {};
        storedMetrics.sessionId = result.sessionId || storedMetrics.sessionId; // Ensure sessionId is always present

        if (isEnabled) {
            consentScreen.classList.add('hidden');
            dashboardScreen.classList.remove('hidden');
            updateDashboardMetrics(storedMetrics);
            trackingStatusSpan.textContent = 'Tracking Active';
            trackingStatusSpan.className = 'bg-green-600 text-white text-xs px-3 py-1 rounded-full';
        } else {
            consentScreen.classList.remove('hidden');
            dashboardScreen.classList.add('hidden');
            trackingStatusSpan.textContent = 'Tracking Inactive';
            trackingStatusSpan.className = 'bg-red-600 text-white text-xs px-3 py-1 rounded-full';
        }
    });

    // Handle "Start Contributing" button click
    startContributingBtn.addEventListener('click', () => {
        const anonymousTrackingChecked = document.getElementById('anonymousTrackingCheckbox').checked;

        if (anonymousTrackingChecked) {
            // Generate a new session UUID if one doesn't exist or if starting a new session
            chrome.storage.local.get('sessionId', (result) => {
                let newSessionId = result.sessionId;
                if (!newSessionId) {
                    newSessionId = generateUUID();
                }

                chrome.storage.local.set({ dataCollectionEnabled: true, sessionId: newSessionId }, () => {
                    console.log('Data collection enabled. Session ID:', newSessionId);
                    // Send a message to the content script to update its state and session ID
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {
                                type: 'TOGGLE_DATA_COLLECTION',
                                enabled: true,
                                sessionId: newSessionId
                            });
                        }
                    });
                    // Switch to dashboard view
                    consentScreen.classList.add('hidden');
                    dashboardScreen.classList.remove('hidden');
                    trackingStatusSpan.textContent = 'Tracking Active';
                    trackingStatusSpan.className = 'bg-green-600 text-white text-xs px-3 py-1 rounded-full';

                    // Update dashboard with initial metrics (which will be mostly zeros)
                    // Fetch current metrics to ensure consistency
                    chrome.storage.local.get('metrics', (result) => {
                        const currentMetrics = result.metrics || {};
                        currentMetrics.sessionId = newSessionId; // Ensure session ID is set
                        updateDashboardMetrics(currentMetrics);
                    });
                });
            });
        } else {
            // Using alert for simplicity, consider a custom modal for better UX
            alert('Please agree to Anonymous Interaction Tracking to proceed.');
        }
    });

    // Handle "Export Data" button click
    exportDataBtn.addEventListener('click', () => {
        chrome.storage.local.get(['metrics', 'sessionId'], (result) => {
            const dataToExport = {
                sessionId: result.sessionId || 'N/A',
                timestamp: new Date().toISOString(),
                overallMetrics: {
                    videosWatched: result.metrics.totalOverallVideosWatched || 0,
                    totalEngagementTime: result.metrics.totalOverallEngagementTime || 0,
                    clicksRecorded: result.metrics.totalOverallClicksRecorded || 0,
                    scrollsRecorded: result.metrics.totalOverallScrollsRecorded || 0,
                    interactionsAnonymized: (result.metrics.totalOverallClicksRecorded || 0) + (result.metrics.totalOverallScrollsRecorded || 0)
                },
                videoSessions: result.metrics.videoSessions || {} // Export detailed video session data
            };

            const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            // Create a temporary link element and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `youtube_data_donor_session_${dataToExport.sessionId.substring(0, 8)}_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url); // Clean up the URL object
        });
    });

    // Listen for messages from content script to update metrics
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'UPDATE_POPUP_METRICS') {
            updateDashboardMetrics(request.metrics);
        }
    });
});
