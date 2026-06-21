console.log("AI Subtitle Extension: Content script loaded on YouTube.");

let currentSubtitle = "";

// 1. Create the floating button and panel (Steps 3 & 12)
function createUI() {
  // Floating Button
  const btn = document.createElement("div");
  btn.id = "ai-subtitle-btn";
  btn.innerHTML = `
    <span style="pointer-events: none;">AI</span>
    <button id="ai-subtitle-btn-close" title="Remove AI Button">&times;</button>
  `;
  document.body.appendChild(btn);

  // Panel
  const panel = document.createElement("div");
  panel.id = "ai-subtitle-panel";
  
  panel.innerHTML = `
    <div id="ai-subtitle-panel-header">
      <span>AI Translation</span>
      <button id="ai-subtitle-panel-close">&times;</button>
    </div>
    <div id="ai-subtitle-panel-content">
      <div id="ai-panel-state">Click AI to translate the current subtitle.</div>
    </div>
  `;
  document.body.appendChild(panel);

  // Handle Close Button on the AI button itself
  document.getElementById("ai-subtitle-btn-close").addEventListener("click", (e) => {
    e.stopPropagation();
    btn.remove();
    panel.remove();
  });

  // Make the AI Button Draggable
  let isDragging = false;
  let dragStartX, dragStartY;
  let initialX, initialY;

  btn.addEventListener('mousedown', (e) => {
    if (e.target.id === 'ai-subtitle-btn-close') return;
    
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    // Lock current position using left/top instead of right/bottom
    const rect = btn.getBoundingClientRect();
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    btn.style.left = rect.left + 'px';
    btn.style.top = rect.top + 'px';
    
    initialX = rect.left;
    initialY = rect.top;
    
    e.preventDefault(); // Prevent text selection
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    btn.style.left = (initialX + dx) + 'px';
    btn.style.top = (initialY + dy) + 'px';
    
    // Also move the popup panel to stay near the button
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = (initialX + dx) + 'px';
    panel.style.top = (initialY + dy - panel.offsetHeight - 10) + 'px';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Event Listeners (Step 13: Close Popup)
  btn.addEventListener("click", (e) => {
    if (e.target.id === 'ai-subtitle-btn-close') return;
    
    // Only trigger AI if it was a click, not a drag
    if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) return;
    
    handleAIClick();
  });
  
  document.getElementById("ai-subtitle-panel-close").addEventListener("click", () => {
    panel.style.display = "none";
  });

  // Handle Fullscreen Mode (move UI into the fullscreen element)
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      document.fullscreenElement.appendChild(btn);
      document.fullscreenElement.appendChild(panel);
    } else {
      document.body.appendChild(btn);
      document.body.appendChild(panel);
    }
  });
}

// 2. Monitor Subtitles (Steps 4 & 5)
function monitorSubtitles() {
  setInterval(() => {
    // Support YouTube, JWPlayer, Video.js, Plyr, and other common anime streaming players
    const selectors = '.ytp-caption-segment, .jw-text-track-cue, .jw-text-track-display, .vjs-text-track-cue, .vjs-text-track-display, .art-subtitle, .captions-text, .plyr__caption, [data-subtitle]';
    const captionElements = document.querySelectorAll(selectors);
    if (captionElements.length > 0) {
      // Extract text from segments and deduplicate to fix double-subtitle bugs
      let uniqueTexts = [...new Set(Array.from(captionElements).map(el => el.textContent.trim()).filter(t => t))];
      let text = uniqueTexts.join(' ').trim();
      
      // Update if changed
      if (text && text !== currentSubtitle) {
        currentSubtitle = text;
        console.log("New Subtitle Captured:", currentSubtitle);
      }
    }
  }, 500); // Check every 500ms
}

// 3. Handle Button Click (Steps 6, 7, 11, 12)
async function handleAIClick() {
  const panel = document.getElementById("ai-subtitle-panel");
  const content = document.getElementById("ai-subtitle-panel-content");
  
  panel.style.display = "flex";

  let imageBase64 = null;

  if (!currentSubtitle) {
    const video = document.querySelector('video');
    if (!video) {
      content.innerHTML = `<div class="ai-subtitle-section">No subtitle text detected and no video player found to scan.</div>`;
      return;
    }

    try {
      // Create a hidden canvas to take a snapshot of the video frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Compress to JPEG to save bandwidth
      imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      console.error("Canvas capture error:", e);
      content.innerHTML = `<div class="ai-subtitle-section">Cannot scan video frame due to browser cross-origin security restrictions on this specific site.</div>`;
      return;
    }

    // Step 6: Show Loading for OCR
    content.innerHTML = `
      <div class="ai-subtitle-section">
        <div class="ai-subtitle-label">Action:</div>
        <div class="ai-subtitle-text">Scanning video frame using OCR...</div>
      </div>
      <div class="ai-subtitle-section" style="color: #0066cc; font-weight: bold;">
        Loading AI OCR translation...
      </div>
    `;
  } else {
    // Step 6: Show Loading for Text
    content.innerHTML = `
      <div class="ai-subtitle-section">
        <div class="ai-subtitle-label">Current Subtitle:</div>
        <div class="ai-subtitle-text">${currentSubtitle}</div>
      </div>
      <div class="ai-subtitle-section" style="color: #0066cc; font-weight: bold;">
        Loading AI translation...
      </div>
    `;
  }

  try {
    // Step 7: Send Subtitle or Image to Background Script to bypass iframe security policies
    chrome.runtime.sendMessage(
      { action: "translate", subtitle: currentSubtitle, imageBase64: imageBase64 },
      (response) => {
        if (!response || !response.success) {
          console.error("AI Subtitle Error:", response ? response.error : "Unknown error");
          content.innerHTML += `
            <div class="ai-subtitle-section" style="color: red; margin-top: 10px;">
              Error connecting to Spring Boot (http://localhost:8080). 
              <br><br>
              Make sure your backend is running.
            </div>
          `;
          return;
        }

        const data = response.data;

        // Formulate difficult words HTML if present
        let wordsHtml = "";
        if (data.difficultWords && data.difficultWords.length > 0) {
          wordsHtml = data.difficultWords.map(w => `<div><b>${w.word}</b> = ${w.meaning}</div>`).join('');
        }

        // Step 12: Display Popup Content
        content.innerHTML = `
          <div class="ai-subtitle-section">
            <div class="ai-subtitle-label">Captured Text:</div>
            <div class="ai-subtitle-text">${currentSubtitle || "<i>(Read from image using OCR)</i>"}</div>
          </div>
          <div class="ai-subtitle-section">
            <div class="ai-subtitle-label">Tamil:</div>
            <div class="ai-subtitle-text">${data.tamil || "N/A"}</div>
          </div>
          <div class="ai-subtitle-section">
            <div class="ai-subtitle-label">Simple English:</div>
            <div class="ai-subtitle-text">${data.simpleEnglish || "N/A"}</div>
          </div>
          <div class="ai-subtitle-section">
            <div class="ai-subtitle-label">Word Meaning:</div>
            <div class="ai-subtitle-text" style="font-weight: normal;">${wordsHtml || "None"}</div>
          </div>
        `;
      }
    );
  } catch (error) {
    console.error("AI Subtitle Error:", error);
    content.innerHTML += `
      <div class="ai-subtitle-section" style="color: red; margin-top: 10px;">
        Error connecting to Spring Boot (http://localhost:8080). 
        <br><br>
        Make sure your backend is running and you have added <b>@CrossOrigin</b> to your Controller!
      </div>
    `;
  }
}

// Initialize only if a video player is present (prevents button from showing on Google Search, etc)
function init() {
  if (document.querySelector('video') || window.location.href.includes('youtube.com')) {
    createUI();
    monitorSubtitles();
  } else {
    // Watch the page in case a video is loaded dynamically later
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector('video')) {
        createUI();
        monitorSubtitles();
        observer.disconnect(); // Stop observing once initialized
      }
    });
    // Safely observe body if it exists, otherwise document
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
}

init();
