console.log("🚀 AI Moderation Background Service Worker Loaded");

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === "TOXICITY_SCORE") {
        console.log("✅ Received toxicity score in background.js:", message.toxicityScore);

        // Store toxicity score
        chrome.storage.local.set({ toxicityScore: message.toxicityScore }, () => {
            if (chrome.runtime.lastError) {
                console.error("❌ Error saving score:", chrome.runtime.lastError);
            } else {
                console.log("✅ Toxicity score saved.");
            }
        });

        sendResponse({ status: "✅ Score received in background.js" }); // Response for debugging
    }

    return true; // Keeps the message channel open for async responses
});
