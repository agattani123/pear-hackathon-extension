import express from "express";
import dotenv from "dotenv";
import path from "path";
import { google } from "googleapis";
import fetch from "node-fetch";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const port = 4000;

const docs = google.docs("v1");
const { OAuth2 } = google.auth;

const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({ access_token: process.env.ACCESS_TOKEN });

const DRAFT_DOC_ID = process.env.DOCUMENT_ID;
const REFERENCE_DOC_IDS = process.env.REFERENCE_DOCUMENT_IDS.split(",");
const REFERENCE_DOC_TITLES = process.env.REFERENCE_DOCUMENT_TITLES.split(",");
const LOG_DOC_ID = process.env.LOG_DOC_ID;

let lastFingerprint = "";
let lastMatchedFingerprint = "";

function getTitleForDoc(docId) {
  const index = REFERENCE_DOC_IDS.indexOf(docId);
  return REFERENCE_DOC_TITLES[index] || docId;
}

function getTextFromElement(element) {
  return element?.textRun?.content || "";
}

function extractParagraphText(paragraph) {
  return (paragraph.elements || []).map(getTextFromElement).join("").trim();
}

function fingerprintDoc(body) {
  return body.filter(b => b.paragraph).map(b => extractParagraphText(b.paragraph)).join("\n---\n");
}

function getParagraphs(body) {
  return body.filter(b => b.paragraph).map(b => extractParagraphText(b.paragraph));
}

async function getDocText(docId) {
  const result = await docs.documents.get({ auth: oauth2Client, documentId: docId });
  return result.data.body.content;
}

async function triggerLLMMatch(paragraphText) {
  console.log("[LLM] Triggered on paragraph:", paragraphText);

  for (const docId of REFERENCE_DOC_IDS) {
    const referenceBody = await getDocText(docId);
    const referenceText = referenceBody.map(block => block.paragraph ? extractParagraphText(block.paragraph) : "").join("\n");

    const llmRes = await fetch("http://localhost:3000/analyze-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftText: paragraphText, referenceText })
    });

    const llmRaw = await llmRes.json();
    let llmJson;
    try {
      llmJson = JSON.parse(llmRaw.matchedParagraph.replace(/```json|```/g, '').trim());
      console.log(`[LLM][${docId}] Parsed Response:`, JSON.stringify(llmJson, null, 2));
    } catch (err) {
      console.error(`[LLM][${docId}] Failed to parse response:`, err.message);
      continue;
    }

    const matchType = llmJson["Type of match found"];
    const matchedClause = llmJson["Reference Clause"];
    const note = llmJson["Note"];



    if (matchType !== "Partial Match" || !matchedClause) {
      console.warn(`[LLM][${docId}] No valid match found.`);
    
      // Clear highlights in this doc
      await docs.documents.batchUpdate({
        auth: oauth2Client,
        documentId: docId,
        requestBody: {
          requests: [
            {
              updateTextStyle: {
                range: { startIndex: 1, endIndex: referenceText.length + 1 },
                textStyle: { backgroundColor: null },
                fields: "backgroundColor",
              },
            },
          ],
        },
      });
    
      // Log "No match" with appropriate message
      const now = new Date();
      const timestamp = now.toLocaleString("en-US", { /* formatting */ });
    
      const noMatchEntry =
        `Timestamp: ${timestamp}\nReference Document: ${docId}\n\n` +
        `User Clause:\n${paragraphText}\n\n` +
        `Match Status: No Match\n` +
        `Reference Clause:\nNone\n\n` +
        `Note:\nNo matching Clause found.\n\n` +
        `====================\n\n`;
    
      await docs.documents.batchUpdate({
        auth: oauth2Client,
        documentId: LOG_DOC_ID,
        requestBody: [
          {
            insertText: {
              location: { index: 1 },
              text: noMatchEntry
            }
          }
        ]
      });
    
      // Store null match in app.locals so background.js can access it
      if (!app.locals.docNotes) app.locals.docNotes = {};
      app.locals.docNotes[docId] = {
        match: null,
        note: "No matching Clause found."
      };
    
      continue;
    }
    

    if (!app.locals.docNotes) app.locals.docNotes = {};
    app.locals.docNotes[docId] = {
      match: matchedClause,
      note: note || null
    };

    const startIndex = referenceText.indexOf(matchedClause);
    const endIndex = startIndex + matchedClause.length;
    if (startIndex === -1 || endIndex === -1) {
      console.warn(`[LLM][${docId}] Could not find clause in flat referenceText.`);
      continue;
    }

    console.log(`[Server][${docId}] Highlight range: ${startIndex} → ${endIndex}`);

    await docs.documents.batchUpdate({
      auth: oauth2Client,
      documentId: docId,
      requestBody: {
        requests: [
          {
            updateTextStyle: {
              range: { startIndex: 1, endIndex: referenceText.length + 1 },
              textStyle: { backgroundColor: null },
              fields: "backgroundColor",
            },
          },
          {
            updateTextStyle: {
              range: { startIndex, endIndex },
              textStyle: {
                backgroundColor: {
                  color: { rgbColor: { red: 1, green: 1, blue: 0 } },
                },
              },
              fields: "backgroundColor",
            },
          },
        ],
      },
    });

    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });

    const logEntry =
      `Timestamp: ${timestamp}\nReference Document: ${getTitleForDoc(docId)}\n\n` +
      `User Clause:\n${paragraphText}\n\n` +
      `Match Status: ${matchType}\n` +
      `Reference Clause:\n${matchedClause}\n\n` +
      `Note:\n${note || "None"}\n\n` +
      `====================\n\n`;

    await docs.documents.batchUpdate({
      auth: oauth2Client,
      documentId: LOG_DOC_ID,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: logEntry
            }
          }
        ]
      },
    });

    await fetch("https://script.google.com/macros/s/AKfycbyR1Fk7k_DKpP01H_2KEEIoNfNuinZ5beu1qYK8GmMCbA0JiMneigJXXdTF68yWUSE/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: matchedClause })
    });
  }

  lastMatchedFingerprint = paragraphText;
}

async function pollEdits() {
  try {
    const body = await getDocText(DRAFT_DOC_ID);
    const fingerprint = fingerprintDoc(body);
    const paragraphs = getParagraphs(body);

    if (!lastFingerprint) {
      lastFingerprint = fingerprint;
      return;
    }

    if (fingerprint === lastFingerprint) return;

    const oldParas = lastFingerprint.split("\n---\n");
    const newParas = fingerprint.split("\n---\n");

    let changedParagraph = null;
    for (let i = 0; i < newParas.length; i++) {
      if (newParas[i] !== oldParas[i]) {
        changedParagraph = newParas[i];
        break;
      }
    }

    lastFingerprint = fingerprint;
    if (!changedParagraph || changedParagraph.trim() === "") return;
    if (changedParagraph === lastMatchedFingerprint) return;

    await triggerLLMMatch(changedParagraph);
  } catch (err) {
    console.error("[Server] pollEdits error:", err.message);
  }
}

setInterval(pollEdits, 2000);

app.post("/select-text", async (req, res) => {
  try {
    const { selectedText } = req.body;
    console.log("[Selection] Received:", selectedText);
    if (!selectedText) return res.status(400).send("Missing selection.");

    const body = await getDocText(DRAFT_DOC_ID);
    const paragraphs = getParagraphs(body);
    const paragraph = paragraphs.find(p => p.includes(selectedText));

    if (!paragraph || paragraph.trim() === "") {
      console.warn("[Selection] No paragraph found for selected text.");
      return res.status(404).send("No match.");
    }

    if (paragraph === lastMatchedFingerprint) {
      console.log("[Selection] Paragraph already matched.");
      return res.status(200).send("Skipped duplicate match.");
    }

    await triggerLLMMatch(paragraph);
    res.status(200).send("LLM triggered.");
  } catch (err) {
    console.error("[Selection] Error:", err.message);
    res.status(500).send("Internal error.");
  }
});

app.post("/match-docs", (req, res) => {
  const { docId } = req.body;
  const entry = app.locals.docNotes?.[docId] || {};
  res.json({
    matched: entry.match || null,
    note: entry.note || null
  });
});

app.get("/fetch-doc-text", async (req, res) => {
  try {
    const body = await getDocText(DRAFT_DOC_ID);
    const text = body.map(block => block.paragraph ? extractParagraphText(block.paragraph) : "").join("\n");
    res.json({ text });
  } catch (err) {
    console.error("[Server] fetch-doc-text error:", err.message);
    res.status(500).send("Failed to fetch doc");
  }
});

app.listen(port, () => {
  console.log(`[Server] Backend running at http://localhost:${port}`);
});