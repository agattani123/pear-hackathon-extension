const fileCache = {};
const REFERENCE_DOC_IDS = [
  '1N3uRwa-pzljyyPhejBjwXanC7QG7Txog2-oOwkTIGz4','1__C5qAEUjufjEGrQVrYRpOD-D26aJzRH6BAg8CdKmuc','1Gyn6BP0KlQlwLN4QkJ4Lx4TaM_PITYxjGQEwGqhk4X8','1sDZK5xANCtlCf9M70xVYLP4NLlnFP1HcmVu23uEG1Sw'
  //'1mTd3a_eWii2Lsa6WcG6Jz7ziGzANRe9FkDHMFObOkwo','1preDSvYirljjm85Gw7bHYZE3QnahKYpopWiGKxABLm8','1oH6dzJpFVjiZAAojjUpNgcPlcHTmB7j31pKqFmcaZFc','1yOcRENNkW1bOF7toG3-49KUR5hc7vRE3Zp-r4xC4mzc'
  // '12si1M9PKFt1fDDk7OvqbxqgKe0BYu-16hJUS0Z1hDFc','1-9iv23XJ0mvfWwfplLSJg5r-UcU_4zlBPm5CSNX_0Ks','1gRoW9KpJnLIBEaNhzkHmlAHRz-PRfhlvoS5-xVimrGo','17P22FiBGryEHyFjhQpxmXi4RKWLKOyytOXsUletf3HA'
  // add more doc IDs here or dynamically inject from config
];

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url;
  if (!url) return;
  console.log("[Bridge] Switched tab to:", url);

  if (url.startsWith("file://") && !fileCache[url]) {
    try {
      const [{ result: content }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.body.innerText
      });
      fileCache[url] = content;
      console.log("[Bridge] Cached file:", url);
    } catch (err) {
      console.warn("[Bridge] Error reading static file:", err.message);
    }
  }

  if (!url.includes("docs.google.com/document")) return;

  // Google Doc to Local HTML match
  fetch("http://localhost:4000/fetch-doc-text")
    .then(res => res.json())
    .then(data => {
      const googleDocText = data.text;
      const allHtmlText = Object.values(fileCache).join("\n\n");
      return fetch("http://localhost:3000/analyze-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftText: googleDocText,
          referenceText: allHtmlText
        })
      });
    })
    .then(res => res.json())
    .then(({ matchedParagraph }) => {
      if (!matchedParagraph) return;
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          if (tab.url?.startsWith("file://")) {
            chrome.tabs.sendMessage(tab.id, {
              type: "highlight-match",
              sentence: matchedParagraph
            });
          }
        }
      });
    });

  // Google Doc → Reference Doc match
const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
const docId = match ? match[1] : null;

if (!docId) {
  console.warn("[Bridge] Could not extract docId from URL:", url);
  return;
}

fetch("http://localhost:4000/match-docs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ docId })
})
.then(res => res.json())
.then(({ matched, note }) => {
  console.log(`[Bridge] match-docs response for ${docId}:`, { matched, note });
  if (!matched) return;
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.url.includes(docId)) {
        if (note) {
          chrome.tabs.sendMessage(tab.id, {
            type: "showNote",
            note
          });
        }
        if (matched) {
          chrome.tabs.sendMessage(tab.id, {
            type: "scrollToMatch",
            text: matched
          });
        }
      }
    }
  });
});


});
