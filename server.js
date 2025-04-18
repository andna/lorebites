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

const maxInputTokens = {
  low: 10000,
  high: 1000
}

app.use(cors());
app.use(express.json());

// Define the schema for the response
const SummarySchema = z.object({
  biteCut: z.object({
    content: z.string(),
    wordCount: z.number(),
  }),
  shortCut: z.object({
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

  const biteCut = 80;
  const shortCut = 160;

  const prompt = `**ROLE & GOAL**
  You're a *voice‑conscious fiction line‑editor*. Create **2 JSON versions** of the story with STRICTLY ENFORCED word counts:
  
  * **Bite Cut:** STRICTLY ${biteCut}‑${biteCut + 20} words MAXIMUM (VERY SHORT)
  * **Short Cut:** STRICTLY ${shortCut}‑${shortCut + 30} words (LONGER VERSION)
  
  **CRITICAL: WORD COUNT ENFORCEMENT**
  The word counts MUST be respected. Bite Cut MUST be significantly shorter than Short Cut.
  Short Cut should be approximately DOUBLE the length of Bite Cut.
  
  **PRESERVE**
  1. **Voice & Attitude** – slang, humor, rhythm; don't formalize.  
  2. **Sensory & Emotional Hooks** – vivid sights, sounds, smells, body feels, running jokes.  
  3. **Cinematic Pacing** – keep paragraph breaks & one‑line beats; merge only when tension isn't lost.  
  4. **Key Plot Beats** – every turn survives.  
  5. **CRITICAL: Climax, Twist & Moral Resonance** – THE MOST IMPORTANT ELEMENT. You MUST preserve the emotional payoff, twist ending, or moral of the story. Both versions MUST deliver the same punch and revelation as the original.
  
  **CRUCIAL INSTRUCTION**
  The twist/climax/reveal is the HEART of these stories. No matter how short the version, the reader MUST experience the same emotional impact and surprise of the original. The shorter the version, the more you should prioritize the twist ending and climactic moments.
  
  **CUT**
  • Redundant phrases, filler adverbs, over‑explained exposition.  
  • Setting bits that don't affect mood or stakes.  
  • Duplicate sensory images (keep the strongest).  
  
  **STYLE**
  • Max sentence 25 words; vary lengths.  
  • Use <br> for dramatic pauses and line breaks.
  • Use <br><br> for paragraph breaks.
  • Grammar stays clean unless it kills voice.  
  
  **OUTPUT FORMAT**  
  Return pure JSON, but with HTML formatting in the content:
  {
    "biteCut": {
      "content": "First sentence with tension.<br>Dramatic beat.<br><br>New paragraph with emotional hook...",
      "wordCount": ${biteCut}
    },
    "shortCut": {
      "content": "Longer version with much more detail and context.<br>Additional emotional hooks.<br><br>Extended paragraph with richer description and character development...",
      "wordCount": ${shortCut}
    }
  }
  
  **INPUT**
  \`\`\`
  ${text}
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
      //      model: "gpt-4o-mini-2024-07-18",
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a helpful, precise assistant." },
        { role: "user", content: prompt }
      ],
      response_format: zodResponseFormat(SummarySchema, "summary"),
      temperature: 0.5,
      frequency_penalty: 0.3,
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
