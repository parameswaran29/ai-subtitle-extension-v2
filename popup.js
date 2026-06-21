document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  
  actionBtn.addEventListener('click', () => {
    console.log('Action button clicked.');
    
    // You can send a message to the active tab's content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length > 0) {
        // chrome.tabs.sendMessage(tabs[0].id, {action: "run_ai_subtitle"});
        console.log("Found active tab:", tabs[0].url);
      }
    });
  });
});
