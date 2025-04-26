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
You are a legal assistant helping a lawyer identify relevant clauses from reference documents.

The lawyer is currently working on a clause in a contract in **Tab 1**, which we’ll call the **User’s Clause**. Here is the exact text of the User’s Clause:

"""
${draftText.trim()}
"""

You also have access to a second document — the **Reference Document** — in **Tab 2**. The full text of the Reference Document is:

"""
${referenceText.trim()}
"""

---

### Matching Criteria:

A **Partial Match** occurs if the Reference Document includes a clause that shares a similar legal intent, structure, or coverage — even if phrasing differs.

If no such clause exists — even approximately — select **No Match**.

---

### Respond using **only one** of the following two JSON formats:

Option 1 — Partial Match:

\`\`\`json
{
  "Type of match found": "Partial Match",
  "Reference Clause": "Paste the most relevant paragraph or section EXACTLY AS FOUND in the Reference Document, including its heading if available. DO NOT ADD COMMENTARY.",
  "Note": "In one sentence, explain how the Reference Clause is similar in legal function or purpose to the User's Clause. In a second sentence, explain specifically how it differs (e.g., narrower scope, missing exceptions, etc.). Please be specific and not general when describing the differences."
}
\`\`\`

Option 2 — No Match:

\`\`\`json
{
  "Type of match found": "No Match",
  "Reference Clause": "N/A",
  "Note": "This document does not include a clause that matches the legal purpose or scope of the User’s Clause. Briefly explain why you concluded no match exists, referencing the type or title of clause that was expected but not found."
}
\`\`\`

---

Important Instructions:
- Only return **one** of the two JSON objects shown above.
- Do **not** include any additional commentary, labels, or non-JSON text.
- Return only **valid, well-formed JSON**.
- Do not hallucinate titles or clauses that aren’t present in the reference document.
- Always quote the Reference Clause verbatim if a partial match is found.

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
