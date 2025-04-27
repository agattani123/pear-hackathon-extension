# Bridge: Productivity Chrome Extension with Context-Driven Document Navigation

This project integrates:
- A Chrome extension for context-aware tab switching and text highlighting
- A Google Docs backend using the Docs API
- A local LLM server that evaluates relevance between the Google Doc and reference documents

---

## Project Structure

```
bridge-full/
├── bridge-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── bridge-ui.css
│
├── bridge-docs-api-backend/
│   ├── auth.js
│   ├── server.js
│   ├── .env
│   ├── package.json
│
├── bridge-llm-matcher/
│   ├── server.js
│   ├── .env
│   ├── package.json
```

---

## Initial Setup (only needed once)

### 1. Clone the repository

```bash
git clone https://github.com/agattani123/bridge-full.git
cd bridge-full
```

---

## Start the LLM Matcher

### Path: `bridge-llm-matcher/`

```bash
cd bridge-llm-matcher
npm install
```

Create `.env` inside `bridge-llm-matcher/`:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Start the server:

```bash
node server.js
```

The LLM matcher will now run at `http://localhost:3000`.

---

## Start the Google Docs Backend

### Path: `bridge-docs-api-backend/`

```bash
cd ../bridge-docs-api-backend
npm install
```

Create `.env` inside `bridge-docs-api-backend/`:

```
CLIENT_ID=your-google-client-id
CLIENT_SECRET=your-google-client-secret
REDIRECT_URI=http://localhost
ACCESS_TOKEN=
DOCUMENT_ID=your-draft-google-doc-id
REFERENCE_DOCUMENT_IDS=comma,separated,reference,doc,ids
LOG_DOC_ID=your-log-google-doc-id
```

### 1. Authenticate Google API access

```bash
node auth.js
```

- Open the printed URL in your browser
- Grant access to Google Docs
- Paste the authorization code back into the terminal
- Copy the printed access token into `.env` under `ACCESS_TOKEN=...`

### 2. Start the backend server

```bash
node server.js
```

The backend will now:
- Poll the draft document for edits
- Listen for text selections
- Match against reference documents
- Highlight and scroll the matches inside the respective Google Docs

---

## Load the Chrome Extension

### Path: `bridge-extension/`

```bash
cd ../bridge-extension
```

1. Go to `chrome://extensions/` in Google Chrome
2. Turn on Developer Mode
3. Click Load Unpacked and select the `bridge-extension/` folder

The extension will now be active.

---

## Testing the Full System

1. Open the Google Doc configured as the Draft document
2. Open each Google Doc corresponding to Tab2, Tab3, Tab4, and Tab5
3. Begin typing or selecting text inside the Draft document

On each edit or selection:
- The paragraph will be sent to the LLM server
- The best matching reference paragraph will be highlighted
- If a matching Apps Script sidebar is installed, the document will automatically scroll to the relevant clause
- Notes, if available, will be shown in the active document

---

## Full Command Summary

```bash
# Clone the repository
git clone https://github.com/agattani123/bridge-full.git
cd bridge-full

# 1. Start the LLM server
cd bridge-llm-matcher
npm install
echo "OPENAI_API_KEY=sk-..." > .env
node server.js

# 2. Start the Google Docs backend
cd ../bridge-docs-api-backend
npm install
echo "CLIENT_ID=..." > .env
echo "CLIENT_SECRET=..." >> .env
echo "REDIRECT_URI=http://localhost" >> .env
echo "ACCESS_TOKEN=" >> .env
echo "DOCUMENT_ID=..." >> .env
echo "REFERENCE_DOCUMENT_IDS=..." >> .env
echo "LOG_DOC_ID=..." >> .env
node auth.js
node server.js

# 3. Load the Chrome Extension
cd ../bridge-extension
# Load this folder in chrome://extensions
```

---

## Notes

- Each subfolder requires `npm install` separately
- No `node_modules/` folders are committed to Git
- All credentials must be stored inside `.env` files
- Chrome must be the browser used to authenticate OAuth
- HTML files opened via `file:///` are indexed only once on first switch

---

## Author

Built by [@agattani123](https://github.com/agattani123)
