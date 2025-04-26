// auth.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.readonly'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app:\n', authUrl);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Paste the code here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  console.log('Access Token:\n', tokens.access_token);
  rl.close();
});
