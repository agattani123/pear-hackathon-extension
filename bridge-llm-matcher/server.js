// server.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const bodyParser = require('body-parser');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const port = 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing Anthropic API key. Please set ANTHROPIC_API_KEY in .env.');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.use(bodyParser.json({ limit: '5mb' }));

app.post('/analyze-match', async (req, res) => {
  const { draftText, referenceText } = req.body;
  console.log("Received match request");

  if (!draftText || !referenceText) {
    return res.status(400).json({ error: 'Both draftText and referenceText are required.' });
  }

  const prompt = `
  You are a legal research assistant helping compliance counsel compile evidence from corporate files.
  
  The lawyer is currently reviewing content from Tab 1 (Covering Letter and Summary), which we'll call the User's Clause:
  
  """
  ${draftText.trim()}
  """
  
  You also have access to a second document — the Reference Document — in Tab 2, 3, 4, or 5:
  
  """
  ${referenceText.trim()}
  """
  
  ---
  
  ### Matching Criteria:
  
  Find if there is any excerpt (between January 1, 2019 and March 15, 2024) in the Reference Document that supports either of the following categories:
  
  **GOOD_EVIDENCE**
  Items that show compliance-positive behavior:
  - "value-based"
  - "unilateral pricing"
  - "cost model"
  - "floor price guardrails"
  - "Legal veto" powers
  - "training or guardrails policies"
  - "consumer benefit"
  - "passing savings to customers"
  
  **POTENTIAL_ISSUE_CURED**
  Items where a potential compliance issue was flagged and corrected:
  - "lane carve-out" attempt
  - "stay in our lane" suggestion
  - "gentlemen's understanding" language
  - "monopoly optics" concerns
  - "killed thread" about collusion
  - "no price hike without cost justification"
  
  Sources include:
  - Emails (include sender and date)
  - Slack threads (include sender, timestamp, and replies)
  - Salesforce discount audit rows (treat as valid if Approved % is blank or less than Requested %)
  - Notion documents (paragraphs, tables, notes)
  
  ---
  
  ### Respond using **only one** of the following two JSON formats: (YOU SHOULD ALWAYS SEND A RESPONSE AND DOUBLE CHECK TO MAKE SURE IT IS VALID TO BE PARSED IN JSON. ALWAYS SEND A RESPONSE ALWAYS, regardless of what teh input is)
  
  Option 1 — Match Found:
  
  \`\`\`json
  {
    "Type of match found": "GOOD_EVIDENCE" or "POTENTIAL_ISSUE_CURED",
    "Reference Clause": "Paste the relevant excerpt exactly as it appears, including any heading, sender metadata, or full Slack thread if applicable. Do not rephrase or summarize.",
    "Note": "First sentence: why this excerpt matters for compliance. Second sentence: how counsel might cite or use this evidence."
  }
  \`\`\`
  
  Option 2 — No Match:
  
  \`\`\`json
  {
    "Type of match found": "No Match",
    "Reference Clause": "N/A",
    "Note": "Explain in one sentence why no GOOD_EVIDENCE or POTENTIAL_ISSUE_CURED could be found in this document."
  }
  \`\`\`
  
  ---
  
  Important Instructions:
  - Always return exactly one JSON object.
  - Only use the three exact keys: "Type of match found", "Reference Clause", "Note".
  - Do not add any text, commentary, explanations, headings, or anything outside the JSON.
  - Spell field names exactly, including capitalization and spaces.
  - If multiple candidates are found, pick the strongest evidence.
  - If using Salesforce CSV rows, treat a row as a match if Approved % is missing or lower than Requested %.
  
  Begin now.
  `.trim();
  

  try {
    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", // or "claude-3-sonnet-20240229" if you want older Sonnet
      max_tokens: 1024,
      temperature: 0.3,
      system: "You are a legal assistant helping a lawyer identify relevant clauses quickly and accurately.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    let match = completion.content?.[0]?.text?.trim();
    console.log("Raw Claude response:", match);

    // Sanitize JSON if needed
    if (match.startsWith('```json')) {
      match = match.replace(/^```json/, '').replace(/```$/, '').trim();
    }

    res.json({ matchedParagraph: match });
  } catch (err) {
    console.error('Error analyzing match:', {
      message: err.message,
      stack: err.stack,
      responseData: err.response?.data
    });
    res.status(500).json({ error: 'Failed to process LLM request.' });
  }
});

app.listen(port, () => {
  console.log(`Bridge LLM Matcher running on Claude at http://localhost:${port}`);
});
