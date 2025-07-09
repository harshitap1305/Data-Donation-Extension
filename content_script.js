// content_script.js
let dataCollectionEnabled = false;
let videoEngagementStartTime = null;
let currentVideoId = null;
let engagementInterval = null;

// Initialize metrics from storage or set defaults
let metrics = {
    sessionId: null, // Unique ID for the current browsing session
    totalOverallVideosWatched: 0,
    totalOverallEngagementTime: 0, // Aggregate engagement time across all videos
    totalOverallClicksRecorded: 0, // Aggregate clicks across all pages
    totalOverallScrollsRecorded: 0, // Aggregate scrolls across all pages
    videoSessions: {} // Object to store detailed data per video ID
    /*
    Example structure for videoSessions:
    videoSessions: {
        'videoId1': {
            engagementTime: 120, // seconds spent on this specific video
            clicks: 5,           // clicks on this video's page
            scrolls: 10,         // scrolls on this video's page
            lastUpdated: 'ISOString', // Timestamp of last update for this video
            title: 'Video Title Here', // Title of the video
            url: 'Full URL of the video'
        },
        'videoId2': { ... }
    }
    */
};

// Function to generate a UUID (Universally Unique Identifier)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Function to save metrics to Chrome local storage
function saveMetrics() {
    chrome.storage.local.set({ metrics: metrics }, () => {
        // console.log('Metrics saved:', metrics);
    });
}

// Function to update popup with current metrics
function updatePopupMetrics() {
    chrome.runtime.sendMessage({ type: 'UPDATE_POPUP_METRICS', metrics: metrics });
}

// Load initial state and metrics when content script loads
chrome.storage.local.get(['dataCollectionEnabled', 'metrics', 'sessionId'], (result) => {
    dataCollectionEnabled = result.dataCollectionEnabled || false;

    if (result.metrics) {
        // Merge existing metrics with default structure to handle new fields
        metrics = { ...metrics, ...result.metrics };
    }

    // If no session ID exists in storage, generate one and store it
    // This session ID persists across browser restarts for the extension
    if (!result.sessionId) {
        metrics.sessionId = generateUUID();
        chrome.storage.local.set({ sessionId: metrics.sessionId }, () => {
            console.log('New session ID generated and stored:', metrics.sessionId);
        });
    } else {
        metrics.sessionId = result.sessionId;
    }

    console.log('Content script initialized. Data collection enabled:', dataCollectionEnabled);
    updatePopupMetrics(); // Update popup on load with current (or initial) metrics
});

// Listen for messages from the popup (e.g., toggle data collection)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TOGGLE_DATA_COLLECTION') {
        dataCollectionEnabled = request.enabled;
        if (request.sessionId) {
            // Update session ID if provided by popup (e.g., on first enable)
            metrics.sessionId = request.sessionId;
            saveMetrics(); // Save the updated metrics with new session ID
        }
        console.log('Data collection toggled to:', dataCollectionEnabled);
        if (!dataCollectionEnabled) {
            stopEngagementTracking(); // Stop tracking if disabled
        } else {
            // If re-enabled, try to start tracking if on a video page
            const videoElement = document.querySelector('video');
            if (videoElement && !videoElement.paused) {
                startEngagementTracking();
            }
        }
    }
});

// --- Engagement Tracking Logic ---

// Extracts the YouTube video ID from the current URL
function getVideoIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

// Starts or resumes tracking engagement for the current video
function startEngagementTracking() {
    if (!dataCollectionEnabled) return; // Only track if enabled

    const videoElement = document.querySelector('video');
    const newVideoId = getVideoIdFromUrl();
    const videoTitleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    const videoTitle = videoTitleElement ? videoTitleElement.textContent.trim() : 'Unknown Video';

    // Check if we are on a YouTube watch page with a valid video ID
    if (videoElement && newVideoId) {
        // If it's a new video or we just started tracking (currentVideoId is null)
        if (newVideoId !== currentVideoId) {
            // If there was a previous video being tracked, finalize its session
            if (currentVideoId && metrics.videoSessions[currentVideoId]) {
                // Ensure the last video's session is updated before switching
                // This prevents losing a few seconds of engagement if the interval hasn't fired yet
                const elapsed = (Date.now() - videoEngagementStartTime) / 1000;
                metrics.videoSessions[currentVideoId].engagementTime += elapsed;
                metrics.totalOverallEngagementTime += elapsed;
                // Only increment videosWatched if it's truly a *new* video being watched
                // This avoids double-counting if user seeks back or reloads same video
                if (!metrics.videoSessions[newVideoId]) { // Only if new video ID hasn't been seen before
                    metrics.totalOverallVideosWatched++;
                }
            }

            currentVideoId = newVideoId;
            videoEngagementStartTime = Date.now(); // Reset start time for the new video

            // Initialize or update the video session entry for the new video
            if (!metrics.videoSessions[currentVideoId]) {
                metrics.videoSessions[currentVideoId] = {
                    engagementTime: 0,
                    clicks: 0,
                    scrolls: 0,
                    firstSeen: new Date().toISOString(),
                    title: videoTitle,
                    url: window.location.href
                };
            } else {
                // Update title/URL in case it changed (e.g., from a playlist)
                metrics.videoSessions[currentVideoId].title = videoTitle;
                metrics.videoSessions[currentVideoId].url = window.location.href;
            }

            console.log(`Started tracking engagement for video: ${currentVideoId} - "${videoTitle}"`);

            // Clear any existing interval to prevent duplicates
            if (engagementInterval) {
                clearInterval(engagementInterval);
            }

            // Start a new interval to update engagement time every second
            engagementInterval = setInterval(() => {
                // Only increment if video is playing and ready
                if (videoElement && !videoElement.paused && !videoElement.ended && videoElement.readyState >= 3) {
                    metrics.videoSessions[currentVideoId].engagementTime += 1; // Increment by 1 second
                    metrics.totalOverallEngagementTime += 1; // Increment overall
                    metrics.videoSessions[currentVideoId].lastUpdated = new Date().toISOString();
                    saveMetrics();
                    updatePopupMetrics();
                }
            }, 1000); // Check every second
        } else if (newVideoId === currentVideoId && videoElement.paused && engagementInterval) {
            // If same video but paused, stop the interval
            clearInterval(engagementInterval);
            engagementInterval = null;
            console.log(`Paused tracking for video: ${currentVideoId}`);
        } else if (newVideoId === currentVideoId && !videoElement.paused && !engagementInterval) {
            // If same video and unpaused, restart the interval
            videoEngagementStartTime = Date.now(); // Reset start time for accurate duration
            engagementInterval = setInterval(() => {
                if (videoElement && !videoElement.paused && !videoElement.ended && videoElement.readyState >= 3) {
                    metrics.videoSessions[currentVideoId].engagementTime += 1;
                    metrics.totalOverallEngagementTime += 1;
                    metrics.videoSessions[currentVideoId].lastUpdated = new Date().toISOString();
                    saveMetrics();
                    updatePopupMetrics();
                }
            }, 1000);
            console.log(`Resumed tracking for video: ${currentVideoId}`);
        }
    } else {
        // If not on a watch page or no video element, stop any active tracking
        stopEngagementTracking();
        currentVideoId = null; // Reset current video ID
    }
}

// Stops engagement tracking and clears the interval
function stopEngagementTracking() {
    if (engagementInterval) {
        clearInterval(engagementInterval);
        engagementInterval = null;
        console.log('Stopped engagement tracking.');
    }
}

// Observe URL changes to detect video navigation without full page reload
// This is crucial for single-page applications like YouTube
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Check if the new URL is a YouTube watch page
        if (lastUrl.includes('youtube.com/watch')) {
            // If navigating to a new video page, re-evaluate and start tracking
            // This will trigger startEngagementTracking to handle new video ID
            startEngagementTracking();
        } else {
            // If navigating away from a video page, stop tracking
            stopEngagementTracking();
            currentVideoId = null; // Clear current video ID as we are no longer on a video page
        }
    }
}).observe(document, { subtree: true, childList: true });


// Listen for video play events (when a video starts playing)
document.addEventListener('play', (event) => {
    if (event.target.tagName === 'VIDEO' && dataCollectionEnabled) {
        startEngagementTracking(); // Start tracking for this video
    }
}, true); // Use capture phase to ensure event is caught

// Listen for video pause events (when a video is paused)
document.addEventListener('pause', (event) => {
    if (event.target.tagName === 'VIDEO' && dataCollectionEnabled) {
        stopEngagementTracking(); // Stop tracking when paused
    }
}, true);

// Listen for video ended events (when a video finishes)
document.addEventListener('ended', (event) => {
    if (event.target.tagName === 'VIDEO' && dataCollectionEnabled) {
        stopEngagementTracking(); // Stop tracking when ended
        // Optionally, you might want to mark this video as fully watched here
        // For now, `videosWatched` is incremented when a *new* video starts.
    }
}, true);

// Initial check on page load if a video is already playing
// This handles cases where the user loads YouTube directly onto a playing video
window.addEventListener('load', () => {
    const videoElement = document.querySelector('video');
    if (videoElement && !videoElement.paused && dataCollectionEnabled) {
        startEngagementTracking();
    }
});

// --- Click Tracking Logic ---
document.addEventListener('click', (event) => {
    if (dataCollectionEnabled) {
        metrics.totalOverallClicksRecorded++; // Increment overall clicks
        // If on a video page, increment clicks for the specific video session
        if (currentVideoId && metrics.videoSessions[currentVideoId]) {
            metrics.videoSessions[currentVideoId].clicks++;
            metrics.videoSessions[currentVideoId].lastUpdated = new Date().toISOString();
        }
        saveMetrics();
        updatePopupMetrics();
        // console.log('Click recorded:', event.target);
    }
});

// --- Scroll Tracking Logic ---
let scrollTimeout;
document.addEventListener('scroll', () => {
    if (dataCollectionEnabled) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            metrics.totalOverallScrollsRecorded++; // Increment overall scrolls
            // If on a video page, increment scrolls for the specific video session
            if (currentVideoId && metrics.videoSessions[currentVideoId]) {
                metrics.videoSessions[currentVideoId].scrolls++;
                metrics.videoSessions[currentVideoId].lastUpdated = new Date().toISOString();
            }
            saveMetrics();
            updatePopupMetrics();
            // console.log('Scroll recorded.');
        }, 200); // Debounce scroll events to avoid excessive counting
    }
}, true); // Use capture phase for scroll events
