// server.js
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai'); // Ensure this is the correct import
const app = express();
const port = 3002;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Received text to summarize:', text.substring(0, 100) + '...');
    
    const tightCut = 140;
    const microCut = 60;

    const prompt = `**ROLE & GOAL**
    You’re a *voice‑conscious fiction line‑editor*. Create **2 HTML versions** of the story:
    
    * **Tight Cut:** ${tightCut}‑${tightCut + 20} words  
    * **Micro Cut:** ${microCut}‑${microCut + 20} words  
    
    List the exact word‑count after *each* version.
    
    **PRESERVE**
    1. **Voice & Attitude** – slang, humor, rhythm; don’t formalize.  
    2. **Sensory & Emotional Hooks** – vivid sights, sounds, smells, body feels, running jokes.  
    3. **Cinematic Pacing** – keep paragraph breaks & one‑line beats; merge only when tension isn’t lost.  
    4. **Key Plot Beats** – every turn survives.  
    5. **Climax & Moral Resonance** – protect the emotional payoff or takeaway; make sure each cut lands with the same moral punch.
    
    **CUT**
    • Redundant phrases, filler adverbs, over‑explained exposition.  
    • Setting bits that don’t affect mood or stakes.  
    • Duplicate sensory images (keep the strongest).  
    
    **STYLE**
    • Max sentence 25 words; vary lengths.  
    • Use em‑dashes or \<br> cuts, never semicolons.  
    • Grammar stays clean unless it kills voice.  
    
    **OUTPUT (HTML only)**  
    Return pure HTML—no markdown.  
    • Preserve pacing with \<br>.  
      – One \<br> for single‑line beats.  
      – Two \<br>\<br> for blank‑line paragraph breaks.  
    • After each version, add the word count on a new line.  
    
    Template:  
    \<p><strong>Tight Cut</strong></p>  
    Story…\<br>  
    Dramatic beat.\<br>\<br>  
    Next paragraph…\<br>  
    (Word count: 234)\<br>\<br>  
    
    \<p><strong>Micro Cut</strong></p>  
    …\<br>  
    (Word count: ###)
    
    **INPUT**
    \`\`\`
    ${text}
    \`\`\``;
    
    
    

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: "You are a helpful, precise assistant." },
        { role: "user",   content: prompt }
    ],
      max_tokens: 3000,
      temperature: 0.8,
    });

    const summary = completion.choices[0].message.content.trim();
    const tokenUsage = completion.usage.total_tokens;

    console.log('Generated summary:', summary.substring(0, 100) + '...');
    
    res.json({ summary, tokenUsage });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});