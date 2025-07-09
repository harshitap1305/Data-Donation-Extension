# YouTube Data Donor Prototype

This is a working prototype of an open-source browser extension designed to enable voluntary, privacy-respecting donation of anonymized YouTube interaction data for research purposes. This is a **prototype** and is not intended for production use or handling sensitive data. It demonstrates core functionality for research purposes only.



<img src="https://github.com/user-attachments/assets/f6e44bef-a5b3-4539-95b9-dcf8181700e4" width="300"/>
<img src="https://github.com/user-attachments/assets/ae1839c8-6a6d-4ede-a8b9-ed9303ee3021" width="300"/>
<img src="https://github.com/user-attachments/assets/a575dd35-f52e-40ad-8210-1a7e3c4246b7" width="300"/>


## Features

* **Consent Management:** Presents a clear consent screen before data collection begins.

* **YouTube Interaction Tracking:**
    * Records video watch time (engagement duration) on YouTube.
    * Tracks clicks on YouTube pages.
    * Monitors scroll events on YouTube pages.
    * Collects data per unique video ID, including video title and URL.

* **Anonymized Data:** All collected data is anonymized and stored locally. No personally identifiable information is collected.

* **Dashboard:** Provides a simple dashboard in the extension popup to view aggregated statistics of your contributions.

* **Data Export:** Allows users to download their collected anonymized data as a JSON file at any time. (implemented it for prototype)

* **Session Tracking:** Assigns a unique session ID to track data within a browsing session.

## How to Install (Chrome)

To install and run this prototype in your Chrome browser:

1.  **Download/Create Files:** Ensure you have the following files in a single folder
    * `manifest.json`
    * `popup.html`
    * `popup.js`
    * `content_script.js`
    * **Icons:** Create a subfolder named `icons` and place `icon.png` in it. These are required for the extension icon.

2.  **Open Chrome Extensions:**
    * Open your Chrome browser.
    * Navigate to `chrome://extensions`.

3.  **Enable Developer Mode:**
    * In the top right corner of the `chrome://extensions` page, toggle on "Developer mode".

4.  **Load Unpacked Extension:**
    * Click the "Load unpacked" button that appears on the left side (or top).
    * Browse to and select the cloned folder .

5.  **Pin the Extension (Optional but Recommended):**
    * After loading, you should see the "YouTube Data Donor" extension listed.
    * Click the puzzle piece icon (Extensions) next to your profile avatar in the Chrome toolbar.
    * Find "YouTube Data Donor" and click the "pin" icon next to it to make it visible in your toolbar.

## How to Use

1.  **Open the Extension Popup:** Click on the "YouTube Data Donor" icon in your Chrome toolbar.

2.  **Consent Screen:** You will first see the "Privacy-First Data Donation" consent screen.
    * Ensure "Anonymous Interaction Tracking" is checked.
    * (Other options are placeholders for future development.)

3.  **Start Contributing:** Click the "Start Contributing to Research" button.
    * After clicking 'Start Contributing to Research', navigate to youtube.com in a new or existing tab to begin data collection.

4.  **Visit YouTube:** Navigate to `youtube.com` and start watching videos, clicking on elements, and scrolling.

5.  **View Dashboard:** Re-open the extension popup to see your "Research Points" (total interactions), "Videos Watched", and "Total Engagement Time" update in real-time.

6.  **Export Data:** Click the "Export Data" button on the dashboard to download a JSON file containing all your anonymized interaction data for the current session.

## Data Collected (Anonymized)

The prototype collects the following anonymized interaction data:

* **`sessionId`**: A unique, randomly generated UUID for your browsing session.

* **`overallMetrics`**: Aggregated metrics across all your interactions:
    * `videosWatched`: Total count of unique YouTube videos you've engaged with.
    * `totalEngagementTime`: Total seconds spent watching videos across all sessions.
    * `clicksRecorded`: Total number of clicks on YouTube pages.
    * `scrollsRecorded`: Total number of scroll events on YouTube pages.
    * `interactionsAnonymized`: Sum of `clicksRecorded` and `scrollsRecorded`.

* **`videoSessions`**: A detailed object containing data for each unique YouTube video ID you interacted with. This object uses video IDs as keys, with each key holding an object containing the following properties:
    ```json
    {
      "videoId_example": {
        "engagementTime": 120,    // Seconds spent watching this specific video
        "clicks": 5,              // Clicks recorded on this video's page
        "scrolls": 10,            // Scroll events recorded on this video's page
        "firstSeen": "ISOString", // Timestamp when this video was first encountered
        "lastUpdated": "ISOString", // Timestamp of the last recorded interaction for this video
        "title": "Example Video Title", // The title of the video
        "url": "[https://www.youtube.com/watch?v=videoId_example](https://www.youtube.com/watch?v=videoId_example)" // The full URL of the video
      }
    }
    ```

**No personally identifiable information (PII) is collected or stored.** All data is processed locally within your browser.

## Privacy Notes

This prototype is built with a privacy-first approach. Your data remains on your local machine until you explicitly choose to export it. The goal is to demonstrate a mechanism for voluntary data donation where users maintain full control and transparency over their contributions.

## Troubleshooting

* **No data tracking:** Ensure you are on a YouTube page (`youtube.com`) for the extension to track interactions. Data collection only begins after you've enabled it via the "Start Contributing to Research" button in the extension popup.

## Note: This project prototype is currently under active development.
