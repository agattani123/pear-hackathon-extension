# Bridge: Productivity Chrome Extension with Context-Driven Document Navigation

This project integrates:
- A **Chrome extension** for context-aware tab switching and text highlighting
- A **Google Docs fetcher** using the Docs API
- A **Local LLM server** that evaluates relevance between the Google Doc and reference HTML tabs

---

## Project Structure

```
bridge-full/
├── bridge-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│
├── bridge-docs-api-backend/
│   ├── auth.js
│   ├── bridge-google-docs.js
|   ├── fetch-doc-text.js
│   ├── .env
│   └── package.json
│
├── bridge-llm-matcher/
│   ├── server.js
│   ├── .env
```

---

## Initial Setup (only needed once)

### 1. Clone the repo

```bash
git clone https://github.com/agattani123/bridge-full.git
cd bridge-full
```

---

## Start the LLM Server (OpenAI)

### Path: `bridge-llm-matcher/`

```bash
cd bridge-llm-matcher
npm install
```

Create `.env` inside `bridge-llm-matcher/`:

```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Start the LLM server:

```bash
node server.js
```

LLM matcher will now run at: `http://localhost:3000`

---

## Start Google Docs Fetcher

### Path: `bridge-docs-api-backend/`

```bash
cd ../bridge-docs-api-backend
npm install
```

Create `.env` inside `bridge-docs-api-backend/`:

```
CLIENT_ID=your-client-id-from-google
CLIENT_SECRET=your-client-secret-from-google
REDIRECT_URI=http://localhost
ACCESS_TOKEN=
```

### 1. Run OAuth to get access token:

```bash
node auth.js
```

- Open the printed URL in your browser
- Grant access to your Google Docs
- Paste the code shown in the redirect back into the terminal
- Copy the resulting `✅ Access Token:` into your `.env` under `ACCESS_TOKEN=...`

### 2. Run Google Docs scraper:

```bash
node bridge-google-docs.js
```

Google Docs API listener will run and log extracted text on changes.

---

## Load Chrome Extension

### Path: `bridge-extension/`

```bash
cd ../bridge-extension
```

1. Visit `chrome://extensions/` in Google Chrome
2. Turn on **Developer Mode**
3. Click **Load unpacked** and select the `bridge-extension/` folder

The extension is now live.

---

## Testing the Full Pipeline

1. Open a [Google Docs](https://docs.google.com/) document whose ID is configured in `bridge-google-docs.js`
2. Open any reference HTML files via `file:///...` in separate Chrome tabs
3. Begin typing or editing the Google Doc

✔️ **Every change to the Google Doc is sent to the LLM**
✔️ **LLM response will be logged in DevTools Console**
✔️ **On tab switch to a file:// page, the most relevant sentence will be highlighted**

---

## Full Command List (No Skips)

```bash
# Clone the repo
git clone https://github.com/agattani123/bridge-full.git
cd bridge-full

# 1. Run LLM Matcher
cd bridge-llm-matcher
npm install
echo "OPENAI_API_KEY=sk-..." > .env
node server.js

# 2. Run Google Docs API Backend
cd ../bridge-docs-api-backend
npm install
echo "CLIENT_ID=..."
echo "CLIENT_SECRET=..."
echo "REDIRECT_URI=http://localhost"
echo "ACCESS_TOKEN=" > .env
node auth.js  # Paste code, copy token into .env
node fetch-doc-text.js

# 3. Load Chrome Extension
cd ../bridge-extension
# then load this folder in chrome://extensions
```

---

## Notes

- `node_modules/` are not checked into Git; you must run `npm install` manually in each subfolder
- All credentials go in `.env` files - you (hopefully lol) will not see them hard-coded
- Make sure **Chrome is your default browser** for the injection to work as intended
- The extension **does not re-fetch static HTML** on every tab switch — only once per file

---

## Author

Built by [@agattani123](https://github.com/agattani123)
