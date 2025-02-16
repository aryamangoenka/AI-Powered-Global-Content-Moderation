console.log("🚀 AI Moderation Content Script Loaded");

// Google Gemini API Endpoint & API Key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateText";
const GEMINI_API_KEY = "AIzaSyDtsLIwVZgT5T8tqfYN2PIQKlflAk-90NI"; // 🔴 Replace with your actual API key

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
                try {
                    await showSuggestionButton(target, text);
                } catch (error) {
                    console.error("❌ Error showing suggestion button:", error);
                }
            } else {
                target.style.border = "2px solid green";
                target.style.backgroundColor = "#ccffcc";
                target.style.color = "#1e8449";
                removeSuggestionButton(target);
            }

            // ✅ Display toxicity score inside the text box
            target.setAttribute("placeholder", `Toxicity: ${toxicityScore.toFixed(2)}`);

            // ✅ Send toxicity score to `background.js`
            chrome.runtime.sendMessage({ type: "TOXICITY_SCORE", toxicityScore });

        } catch (error) {
            console.error("❌ Toxicity API error:", error);
        }
    }
};

const fetchBetterPhrase = async (text) => {
    try {
        console.log("🧠 Fetching AI-generated suggestion for:", text);

        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        const raw = JSON.stringify({
            "contents": [
                {
                    "parts": [
                        {
                            "text": `Generate 3 polite and professional alternatives as a JSON object with a 'queries' array: "${text}"`
                        }
                    ]
                }
            ]
        });

        const requestOptions = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, requestOptions);

        if (!response.ok) throw new Error("Google Gemini API request failed");

        const data = await response.json();
        console.log("✅ AI API Raw Response:", data);

        // Extract and parse JSON from the response
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // Extract JSON object from the markdown code block if present
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        const jsonString = jsonMatch ? jsonMatch[1] : responseText;
        
        try {
            const parsedResponse = JSON.parse(jsonString);
            console.log("✅ Parsed Suggestions:", parsedResponse);
            return parsedResponse.queries || [];
        } catch (error) {
            console.error("❌ JSON Parse Error:", error);
            return [responseText];
        }
    } catch (error) {
        console.error("❌ AI Suggestion Error:", error);
        return null;
    }
};


// Function to show the suggestions
const showSuggestionButton = async (target, originalText) => {
    // Remove any existing suggestion elements
    removeSuggestionButton(target);
    
    const suggestions = await fetchBetterPhrase(originalText);
    if (!suggestions || suggestions.length === 0) return;

    // Create a container for suggestions
    const suggestionContainer = document.createElement("div");
    suggestionContainer.classList.add("suggest-better-phrase");
    suggestionContainer.style.position = "absolute";
    suggestionContainer.style.width = `${target.offsetWidth}px`;
    suggestionContainer.style.padding = "10px";
    suggestionContainer.style.backgroundColor = "#fff";
    suggestionContainer.style.border = "1px solid #ddd";
    suggestionContainer.style.borderRadius = "5px";
    suggestionContainer.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
    suggestionContainer.style.zIndex = "1000";

    // Create suggestion title
    const title = document.createElement("div");
    title.style.fontWeight = "bold";
    title.style.marginBottom = "10px";
    title.style.color = "#c0392b";
    title.innerText = "💡 Suggested Alternatives:";
    suggestionContainer.appendChild(title);

    // Create suggestions list
    suggestions.forEach((suggestionText, index) => {
        const suggestion = document.createElement("div");
        suggestion.style.padding = "8px";
        suggestion.style.backgroundColor = "#f8f9fa";
        suggestion.style.borderRadius = "4px";
        suggestion.style.cursor = "pointer";
        suggestion.style.transition = "background-color 0.2s";
        suggestion.style.marginBottom = "5px";
        suggestion.innerText = `${index + 1}. ${suggestionText}`;
        
        // Add hover effect
        suggestion.addEventListener("mouseover", () => {
            suggestion.style.backgroundColor = "#e9ecef";
        });
        suggestion.addEventListener("mouseout", () => {
            suggestion.style.backgroundColor = "#f8f9fa";
        });

        // Add click to replace functionality
        suggestion.addEventListener("click", () => {
            if (target.value !== undefined) {
                target.value = suggestionText;
            } else if (target.isContentEditable) {
                target.innerText = suggestionText;
            }
            removeSuggestionButton(target);
        });

        suggestionContainer.appendChild(suggestion);
    });

    // Position the container below the text box
    const rect = target.getBoundingClientRect();
    suggestionContainer.style.top = `${rect.bottom + 5 + window.scrollY}px`;
    suggestionContainer.style.left = `${rect.left + window.scrollX}px`;

    // Add to DOM
    target.parentNode.appendChild(suggestionContainer);
};


// Function to remove the "Suggest Better Phrase" button when not needed
const removeSuggestionButton = (target) => {
    const suggestionBtn = target.parentNode.querySelector(".suggest-better-phrase");
    if (suggestionBtn) {
        suggestionBtn.remove();
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
