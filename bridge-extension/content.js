// == Google Docs Selection Listener + Text Extractor == //

console.log("📄 [Bridge] content.js loaded");
console.log("🧠 [Bridge] Window location:", window.location.href);


// Detect mouseup and try to get selected lines
document.addEventListener("mouseup", () => {
  console.log("🖱️ [Bridge] Mouse released – checking selection...");

  const selectedLines = getSelectedLineText();
  if (selectedLines.length > 0) {
    console.log("✅ [Bridge] Selected line(s):", selectedLines);
  } else {
    console.log("⚠️ [Bridge] No matching selected lines found.");
  }
});

// Extract selected lines of text from SVG + paragraph blocks
function getSelectedLineText() {
  const overlaps = (a, b) =>
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top;

  // Rects corresponding to selected region (highlighted in Google Docs)
  const selectionRects = Array.from(
    document.querySelectorAll(".kix-canvas-tile-selection svg > rect")
  ).map(el => el.getBoundingClientRect());

  // Paragraph text blocks (each rendered as a rect inside a group with <text>)
  const paragraphRects = Array.from(
    document.querySelectorAll("svg g[role=paragraph] > rect")
  ).map(el => ({
    el,
    rect: el.getBoundingClientRect()
  }));

  const matches = [];

  for (const { el, rect } of paragraphRects) {
    for (const selRect of selectionRects) {
      if (overlaps(rect, selRect)) {
        const group = el.closest("g[role=paragraph]");
        if (!group) continue;

        const textSpans = group.querySelectorAll("text");
        const lineText = Array.from(textSpans).map(span => span.textContent).join("");
        matches.push(lineText);
        break; // Stop checking this paragraph after first match
      }
    }
  }

  return matches;
}

async function getSelectedTextFromDocs(webAppUrl) {
  try {
    const response = await fetch(webAppUrl);
    const data = await response.text();

    if (response.ok) {
      console.log("✅ [Bridge] Selected Text from Docs API:", data);
      return data;
    } else {
      console.error("❌ [Bridge] Failed to fetch selected text:", response.status, data);
      return null;
    }
  } catch (error) {
    console.error("❌ [Bridge] Network error:", error);
    return null;
  }
}

// Example usage:
const webAppURL = "https://script.google.com/macros/s/AKfycbwwUhqjSN4vSKo5Lbnz3IfaUb5mWRH53tOmI4RwA7fKg9wn1VjX0R0IFipbU5ep7Y7w8Q/exec";
getSelectedTextFromDocs(webAppURL);

chrome.runtime.onMessage.addListener((msg) => {
  console.log("📬 [Bridge] Received runtime message:", msg);  // ← ADD THIS LINE
  if (msg.type === "showNote" && msg.note) {
    displayNoteOnSide(msg.note);
  }
});


function displayNoteOnSide(noteText) {
  console.log("📝 [Bridge] Displaying note:", noteText);

  const oldNote = document.getElementById("bridge-note-box");
  if (oldNote) oldNote.remove();

  const box = document.createElement("div");
  box.id = "bridge-note-box";
  box.innerText = noteText;

  Object.assign(box.style, {
    position: "fixed",
    top: "100px",
    right: "30px",
    width: "280px",
    padding: "12px 16px",
    backgroundColor: "#FFFBEA",
    border: "1px solid #FFD54F",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    fontSize: "14px",
    lineHeight: "1.5",
    zIndex: "9999"
  });

  const closeBtn = document.createElement("div");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "6px",
    right: "10px",
    cursor: "pointer",
    fontSize: "14px",
    color: "#999"
  });
  closeBtn.onclick = () => box.remove();

  box.appendChild(closeBtn);
  document.body.appendChild(box);
}

function injectBridgeBadge() {
  if (document.getElementById("bridge-badge")) return; // prevent duplicates

  const badge = document.createElement("div");
  badge.id = "bridge-badge";
  const iconUrl = chrome.runtime.getURL("images/icon.png");
  badge.innerHTML = `
    <div id="bridge-badge-icon" style="background-image: url('${iconUrl}')"></div>
    <div id="bridge-badge-status">Active</div>
  `;
  document.body.appendChild(badge);

  // Make badge draggable
  let isDragging = false, offsetX = 0, offsetY = 0;

  badge.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - badge.getBoundingClientRect().left;
    offsetY = e.clientY - badge.getBoundingClientRect().top;
    badge.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    badge.style.top = `${e.clientY - offsetY}px`;
    badge.style.left = `${e.clientX - offsetX}px`;
    badge.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    badge.style.transition = "";
  });
}

// Only inject on Google Docs pages
if (window.location.hostname.includes("docs.google.com")) {
  injectBridgeBadge();
}


