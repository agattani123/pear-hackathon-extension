// server.js

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
const port = 3000;

app.use(bodyParser.json({ limit: '5mb' }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Analyze match endpoint
app.post('/analyze-match', async (req, res) => {
  const { draftText, referenceText } = req.body;
  console.log("Received match request");
  const MAX_CHARS = 100;
  const trimmedReference = referenceText.slice(0, MAX_CHARS);
  console.log("Tab1:", draftText.trim());
  console.log("Tab2:", trimmedReference.trim());
  if (!draftText || !referenceText) {
    return res.status(400).json({ error: 'Both draftText and referenceText are required.' });
  }
 
  const trimmedDraft = draftText.slice(0, MAX_CHARS);
  
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
  
  Your task is to carefully read the User’s Clause and determine the legal concept, obligation, or function it represents (e.g., indemnity, limitation of liability, termination rights, payment terms, etc.).
  
  Then, search the Reference Document to determine whether it contains a clause that is similar in legal *purpose* or *effect*.
  
  ---
  
  ### Matching Criteria:
  
  A **Partial Match** occurs if the Reference Document includes a clause that shares a similar legal intent, structure, or coverage — even if phrasing differs.
  
  If no such clause exists — even approximately — select **No Match**.
  
  You must respond using **only one** of the following two JSON formats:
  
  ---
  
  ### Option 1 — Partial Match
  
  \`\`\`json
  {
    "Type of match found": "Partial Match",
    "Reference Clause": "Paste the most relevant paragraph or section EXACTLY AS FOUND in the Reference Document, including its heading if available. DO NOT ADD COMMENTARY.",
    "Note": "In one sentence, explain how the Reference Clause is similar in legal function or purpose to the User's Clause. In a second sentence, explain specifically how it differs (e.g., narrower scope, missing exceptions, etc.). Please be specific and not general when describing the differences."
  }
  \`\`\`
  
  ---
  
  ### Option 2 — No Match
  
  \`\`\`json
  {
    "Type of match found": "No Match",
    "Reference Clause": "N/A",
    "Note": "This document does not include a clause that matches the legal purpose or scope of the User’s Clause. Briefly explain why you concluded no match exists, referencing the type or title of clause that was expected but not found."
  }
  \`\`\`
  
  ---
  
  ### Important Instructions:
  - Only return **one** of the two JSON objects shown above.
  - Do **not** include any additional commentary, labels, or non-JSON text.
  - Return only **valid, well-formed JSON**.
  - Do not hallucinate titles or clauses that aren’t present in the reference document.
  - Always quote the Reference Clause verbatim if a partial match is found.
  
  Begin now by analyzing the User’s Clause and comparing it to the Reference Document. Return your result in the correct JSON format.
  `.trim();
  
  


  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a legal assistant helping with contract drafting.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 512
    });

    console.log("Raw LLM response:", JSON.stringify(completion, null, 2)); // Full JSON output

    const match = completion.choices?.[0]?.message?.content?.trim();
    res.json({ matchedParagraph: match });
  } catch (err) {
    console.error('Error analyzing match:', err.message);
    res.status(500).json({ error: 'Failed to process LLM request.' });
  }
});

app.listen(port, () => {
  console.log(`Bridge LLM Matcher running at http://localhost:${port}`);
});
