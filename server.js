// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai');

const app = express();
const port = process.env.PORT || 3001;

// Allow localhost:3000 and your ngrok URL as origins
app.use(cors());

app.use(bodyParser.json());

// 2. Ensure your OpenAI key is set before running
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}
// Instantiate the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
// 1. Log every incoming request whose path starts with /api
app.use('/api', (req, res, next) => {
  console.log(`[Backend] 🔍 Proxy check: ${req.method} ${req.originalUrl}`);
  next();
});

// server.js (excerpt)
app.post('/api/pick-tracks', async (req, res) => {
  try {
    const { userPrompt, likedTracks } = req.body;
    console.log('[Backend] Received userPrompt:', userPrompt);
    console.log('[Backend] Received likedTracks length:', likedTracks.length);

    const systemMessage = {
      role: 'system',
      content: [
        'You are a music expert and playlist curator with deep knowledge of artist origins and song languages.',
        'Your job is to generate playlist suggestions based on the user\'s input and liked songs.',
        '',
        'Follow these rules strictly:',
        '1. Carefully read the user\'s request. Any phrase like "no Turkish songs", "only English songs", "exclude sad songs", etc., is an explicit filter.',
        '2. Exclusion filters must be strictly enforced — do NOT include any song that violates them.',
        '3. From the user\'s liked songs, select 5–10 that match the theme **and do not violate exclusions**.',
        '4. Add ~20 more new songs that match the theme **and obey all filters**.',
        '5. For each song, return its title and artist in JSON.',
        '6. Do NOT include any songs that are in a prohibited language or by excluded artists.',
        '',
        'Output format:',
        '{',
        '  "playlistName": "...",',
        '  "tracks": [',
        '    { "title": "Song Title", "artist": "Artist Name" },',
        '    ...',
        '  ]',
        '}',
        '',
        'Return only valid JSON — no commentary, no markdown, no notes.'
      ].join('\n')
    };
    
    
    const userMessage = {
      role: 'user',
      content: [
        `User request: "${userPrompt}"`,
        '',
        'Here is a list of liked songs (format: index. "Title" by Artist(s) — URI):',
        likedTracks,
        '',
        'Your task:',
        '- Analyze the user’s intent from the prompt (e.g., mood, genre, language, etc.)',
        '- Reuse 5–10 liked songs if they match the theme and user instructions',
        '- Add ~20 more songs based on both the prompt and patterns in the liked list',
        '- Ensure all exclusions are strictly followed (e.g., do NOT include Turkish songs if the user says "no Turkish")',
        '',
        'Return only this JSON (no explanation):',
        '{',
        '  "playlistName": "…",',
        '  "tracks": [',
        '    { "title": "…", "artist": "…" },',
        '    ...',
        '  ]',
        '}'
      ].join('\n')
    };
    

    console.log('[Backend] About to call OpenAI...');
    console.log('[Backend] userMessage:\n' + userMessage.content);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [systemMessage, userMessage],
      temperature: 0.7,
      max_tokens: 1200,            // ↑ Increase from 600 to 1200
      n: 1
    });

    const raw = completion.choices[0].message.content.trim();
    console.log('[Backend] OpenAI returned (raw):', raw);
// Strip markdown fences if present
const cleaned = raw
  .replace(/^```(?:json)?\s*/i, '')
  .replace(/```$/, '')
  .trim();

// Before parsing, check if it ends correctly and contains the "tracks" field
if (!cleaned.endsWith('}') || cleaned.indexOf('"tracks"') === -1) {
  console.error('[Backend] Response seems truncated:', cleaned);
  return res
    .status(500)
    .json({ error: 'GPT response was truncated. Try again with fewer tracks.' });
}

let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch (parseErr) {
  console.error('[Backend] JSON parse error:', cleaned);
  return res
    .status(500)
    .json({ error: 'GPT did not return valid JSON.' });
}

// ✅ Updated structure check for new format
const { playlistName, tracks } = parsed;
if (
  typeof playlistName !== 'string' ||
  !Array.isArray(tracks) 
) {
  console.error('[Backend] Unexpected JSON structure:', parsed);
  return res
    .status(500)
    .json({ error: 'GPT returned an invalid playlist format.' });
}

console.log('[Backend] Parsed playlistName:', playlistName);
console.log('[Backend] Parsed tracks (count):', tracks.length);

    return res.json({ playlistName, tracks });
  } catch (err) {
    console.error('[Backend] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Start the Express server
app.listen(port, () => {
  console.log(`🚀 Backend listening on port ${port}`);
});
