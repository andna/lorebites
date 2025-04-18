// server.js
const express = require('express');
const cors = require('cors');
const { streamSummary } = require('./src/shared/openaiStreaming');
const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

app.get('/api/stream', (req, res) => {
  const { text } = req.query;


  // Use the shared streamSummary function with the current response object
  streamSummary({
    text,
    apiKey: process.env.OPENAI_API_KEY
  }, res);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
