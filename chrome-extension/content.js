console.log("🚀 AI Moderation Content Script Loaded");

// Debounce function to limit API calls
function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

// Function to analyze toxicity in any text field
const analyzeToxicity = async (text, target) => {
    if (text.length > 3) {
        try {
            console.log("🚀 Fetching toxicity score for:", text);
            const response = await fetch("https://ai-moderation-worker.aryamansgoenka.workers.dev", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text }),
            });

            if (!response.ok) throw new Error("API request failed");

            const data = await response.json();
            const toxicityScore = data?.attributeScores?.TOXICITY?.summaryScore?.value || 0;

            console.log("✅ Toxicity Score:", toxicityScore);

            // Apply visual feedback based on toxicity score
            if (toxicityScore > 0.7) {
                target.style.border = "2px solid red";
                target.style.backgroundColor = "#ffcccc";
                target.style.color = "#c0392b";
            } else {
                target.style.border = "2px solid green";
                target.style.backgroundColor = "#ccffcc";
                target.style.color = "#1e8449";
            }

            // ✅ Send toxicity score to `background.js`
            chrome.runtime.sendMessage({ type: "TOXICITY_SCORE", toxicityScore });

        } catch (error) {
            console.error("❌ Toxicity API error:", error);
        }
    }
};

// Attach event listener to all text fields
const attachListeners = () => {
    document.querySelectorAll("input[type='text'], textarea, [contenteditable='true']").forEach((element) => {
        element.removeEventListener("input", handleInput);
        element.addEventListener("input", debounce(handleInput, 500));
    });
};

// Handle input event
const handleInput = (event) => {
    const target = event.target;
    if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) {
        analyzeToxicity(target.value || target.innerText, target);
    }
};

// ✅ Initial attachment of event listeners
attachListeners();

// ✅ Observe for dynamically added elements
const observer = new MutationObserver(() => attachListeners());
observer.observe(document.body, { childList: true, subtree: true });
