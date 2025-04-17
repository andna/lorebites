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

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Received text to summarize:', text.substring(0, 100) + '...');
    
    const tightCut = 1; //140
    const microCut = 2; //20

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

    const stream = openai.beta.chat.completions
      .stream({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          { role: "system", content: "You are a helpful, precise assistant." },
          { role: "user", content: prompt }
        ],
        response_format: zodResponseFormat(SummarySchema, "summary"),
      })
      .on("refusal.done", () => console.log("request refused"))
      .on("content.delta", ({ snapshot, parsed }) => {
        console.log("content:", snapshot);
        console.log("parsed:", parsed);
        console.log();
      })
      .on("content.done", (props) => {
        console.log(props);
      });

    await stream.done();

    const finalCompletion = await stream.finalChatCompletion();

    console.log('Final Completion:', finalCompletion);

    res.json({ summary: finalCompletion });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
