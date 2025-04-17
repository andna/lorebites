// server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai'); // Ensure this is the correct import
const { z } = require('zod');
const { zodResponseFormat } = require('openai/helpers/zod');
const app = express();
const port = 3002;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Define the schema for the response
const SummarySchema = z.object({
  tightCut: z.object({
    content: z.string(),
    wordCount: z.number(),
  }),
  microCut: z.object({
    content: z.string(),
    wordCount: z.number(),
  }),
});

app.get('/api/stream', (req, res) => {
  const { text } = req.query;

  if (!text) {
    console.error('No text provided');
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  console.log('Received text:', text);

  const tightCut = 1; //120
  const microCut = 2; //50

  const prompt = `**ROLE & GOAL**
  You're a *voice‑conscious fiction line‑editor*. Create **2 JSON versions** of the story:
  
  * **Tight Cut:** ${tightCut}‑${tightCut + 40} words  
  * **Micro Cut:** ${microCut}‑${microCut + 30} words  
  
  List the exact word‑count after *each* version.
  
  **PRESERVE**
  1. **Voice & Attitude** – slang, humor, rhythm; don't formalize.  
  2. **Sensory & Emotional Hooks** – vivid sights, sounds, smells, body feels, running jokes.  
  3. **Cinematic Pacing** – keep paragraph breaks & one‑line beats; merge only when tension isn't lost.  
  4. **Key Plot Beats** – every turn survives.  
  5. **Climax & Moral Resonance** – protect the emotional payoff or takeaway; make sure each cut lands with the same moral punch.
  
  **CUT**
  • Redundant phrases, filler adverbs, over‑explained exposition.  
  • Setting bits that don't affect mood or stakes.  
  • Duplicate sensory images (keep the strongest).  
  
  **STYLE**
  • Max sentence 25 words; vary lengths.  
  • Use <br> cuts, but never use em‑dashes or semicolons.  
  • Grammar stays clean unless it kills voice.  
  
  **OUTPUT (JSON only)**  
  Return pure JSON with the following structure:
  {
    "tightCut": {
      "content": "Tight cut content here...",
      "wordCount": 150
    },
    "microCut": {
      "content": "Micro cut content here...",
      "wordCount": 60
    }
  }
  
  **INPUT**
  \`\`\`
  ${text.substring(0, 100)}
  \`\`\``;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const stream = openai.beta.chat.completions
    .stream({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: "You are a helpful, precise assistant." },
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(SummarySchema, "summary"),
      stream: true,
    })
    .on("content.delta", ({ delta, snapshot, parsed }) => {
      // Send the full parsed JSON object each time it updates
      if (parsed) {
        res.write(`data: ${JSON.stringify(parsed)}\n\n`);
      } else if (delta) {
        // Fallback if parsed isn't available
        res.write(`data: ${JSON.stringify({ raw: delta })}\n\n`);
      }
    })
    .on("content.done", (props) => {
      // Send the final complete data
      if (props && props.parsed) {
        res.write(`data: ${JSON.stringify(props.parsed)}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    });

  stream.done().catch(error => {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
