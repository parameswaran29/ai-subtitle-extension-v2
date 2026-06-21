chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    // The background script has full extension permissions and ignores webpage CSP rules
    fetch("http://localhost:8080/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        subtitle: request.subtitle, 
        imageBase64: request.imageBase64 
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Server returned status " + response.status);
      }
      return response.json();
    })
    .then(data => {
      sendResponse({ success: true, data: data });
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep the message channel open for async response
  }
});
