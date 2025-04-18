// openaiStreaming.js - Shared OpenAI streaming functions
let OpenAI, z, zodResponseFormat;

// Try to import requirements for Node.js environment
try {
  OpenAI = require('openai');
  z = require('zod');
  zodResponseFormat = require('openai/helpers/zod').zodResponseFormat;
} catch (error) {
  // In browser, these will be undefined
  console.log('Running in browser environment');
}

// Common OpenAI request builder
function buildOpenAIRequest(text, config = DEFAULT_CONFIG) {
  return {
    model: config.model,
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: buildSummarizationPrompt(text, config) }
    ],
    temperature: config.temperature,
    frequency_penalty: config.frequency_penalty,
    stream: true
  };
}

// Common configuration
const DEFAULT_CONFIG = {
  biteCut: 80,
  shortCut: 160,
  model: "gpt-4o-mini-2024-07-18",
  temperature: 0.5,
  frequency_penalty: 0.3,
  systemPrompt: "You are a helpful, precise assistant."
};

// Define the schema for the response
const SummarySchema = z?.object({
  biteCut: z?.object({
    content: z?.string(),
    wordCount: z?.number(),
  }),
  shortCut: z?.object({
    content: z?.string(),
    wordCount: z?.number(),
  }),
});

/**
 * Builds the prompt for the summarization API
 * @param {string} text Text to summarize
 * @param {number} biteCut Target word count for bite-sized summary
 * @param {number} shortCut Target word count for short summary
 * @returns {string} The formatted prompt
 */
function buildSummarizationPrompt(text, { biteCut, shortCut } = DEFAULT_CONFIG) {
  return `**ROLE & GOAL**
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
}

/**
 * Server-side streaming implementation
 */
async function streamSummary({ text, apiKey = process.env.OPENAI_API_KEY }, res) {
  if (!text || !apiKey) {
    console.error('Missing required parameters');
    res.status?.(400)?.json?.({ error: 'Text and API key are required' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const openai = new OpenAI({ apiKey });
    const request = buildOpenAIRequest(text);
    
    // Add Zod response format if available
    if (zodResponseFormat && SummarySchema) {
      request.response_format = zodResponseFormat(SummarySchema, "summary");
    }

    const stream = await openai.beta.chat.completions
      .stream(request)
      .on("content.delta", ({ delta, snapshot, parsed }) => {
        if (parsed) {
          res.write(`data: ${JSON.stringify(parsed)}\n\n`);
        } else if (delta) {
          res.write(`data: ${JSON.stringify({ raw: delta })}\n\n`);
        }
      })
      .on("content.done", (props) => {
        if (props?.parsed) {
          res.write(`data: ${JSON.stringify(props.parsed)}\n\n`);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      });

    await stream.done();
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}

/**
 * Browser-side streaming implementation
 */
async function frontendStreamSummary({
  text,
  apiKey,
  onData = () => {},
  onError = () => {},
  onComplete = () => {}
}) {
  if (!text || !apiKey) {
    onError('Text and API key are required');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildOpenAIRequest(text))
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        onError('Invalid API key');
      } else {
        onError(`API Error: ${errorData.error?.message || response.statusText}`);
      }
      return;
    }

    if (!response.body) {
      onError('Response has no body');
      return;
    }

    const reader = response.body.getReader();
    let buffer = '';
    let streamedContent = { biteCut: { content: '' }, shortCut: { content: '' } };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data:')) continue;
        const data = line.replace('data:', '').trim();
        
        if (data === '[DONE]') {
          onComplete(streamedContent);
          return;
        }

        try {
          const json = JSON.parse(data);
          if (json.choices?.[0]?.delta?.content) {
            try {
              const parsedContent = JSON.parse(json.choices[0].delta.content);
              if (parsedContent.biteCut || parsedContent.shortCut) {
                streamedContent = {
                  biteCut: { ...streamedContent.biteCut, ...(parsedContent.biteCut || {}) },
                  shortCut: { ...streamedContent.shortCut, ...(parsedContent.shortCut || {}) }
                };
                onData(streamedContent);
              }
            } catch (e) {} // Ignore incomplete JSON
          } else if (json.biteCut || json.shortCut) {
            streamedContent = {
              biteCut: { ...streamedContent.biteCut, ...(json.biteCut || {}) },
              shortCut: { ...streamedContent.shortCut, ...(json.shortCut || {}) }
            };
            onData(streamedContent);
          }
        } catch (e) {} // Ignore parse errors
      }
    }

    onComplete(streamedContent);
  } catch (error) {
    onError(`Error: ${error.message}`);
  }
}

// Define exports to match environment
const moduleExports = {
  DEFAULT_CONFIG,
  buildSummarizationPrompt,
  buildOpenAIRequest,
  streamSummary,
  frontendStreamSummary,
  SummarySchema
};

// Conditional exports based on environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = moduleExports;
} else {
  window.openaiStreaming = moduleExports;
}
