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


    const prompt = `**ROLE & GOAL**
    You’re a *voice‑conscious fiction line‑editor*. Shrink the story below to **220‑280 words** and give the final count in parentheses.
    
    **PRESERVE**
    1. **Voice & Attitude** – slang, humor, rhythm; don’t formalize.  
    2. **Sensory & Emotional Hooks** – vivid sights, sounds, smells, body feels, running jokes.  
    3. **Cinematic Pacing** – keep paragraph breaks & one‑line beats; merge only when tension isn’t lost.  
    4. **Plot Beats** – every turn survives.  
    
    **CUT**
    • Redundant phrases, filler adverbs, over‑explained exposition.  
    • Setting bits that don’t affect mood or stakes.  
    • Duplicate sensory images (keep the strongest).  
    
    **STYLE**
    • Max sentence 25 words; vary lengths.  
    • Use em‑dashes or <br> cuts, never semicolons.  
    • Grammar stays clean unless it kills voice.  
    
    **OUTPUT (HTML only)**
    Return pure HTML, no markdown:  
    • Preserve pacing with \<br>.  
      – One \<br> for single‑line beats.  
      – Two \<br>\<br> for blank‑line paragraph breaks.  
    • After the story, add the word count on a new line.  
    
    Example:  
    Story sentence…\<br>  
    Dramatic beat.\<br>\<br>  
    New paragraph starts…\<br>  
    (Word count: 234)
    
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
      max_tokens: 350,
      temperature: 0.7,
    });

    const summary = completion.choices[0].message.content.trim();
    res.json({ summary });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});