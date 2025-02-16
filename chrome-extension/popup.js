document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("toxicityScore", (data) => {
        document.getElementById("score").textContent = data.toxicityScore ? data.toxicityScore.toFixed(2) : "N/A";
    });
});
