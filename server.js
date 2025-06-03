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

    // Build messages that ask for a playlist name + 20–30 URIs
    const systemMessage = {
      role: 'system',
      content:
        'You are an expert music curator with encyclopedic knowledge of artists, genres, languages, and geographic origins. ' +
        'Whenever you receive a user request plus a list of saved Spotify tracks (each line gives index, title, artists, and URI), do the following:\n' +
        ' 1. Read the user’s request carefully. Any inclusion or exclusion rule (for example, “no Turkish songs” or “focus on upbeat English pop”) comes from the user’s own words.\n' +
        ' 2. For each track in the provided list, use your knowledge (or publicly available metadata) to determine:\n' +
        '     • The primary genre or mood of the song.\n' +
        '     • The artist’s country of origin.\n' +
        '     • The dominant language(s) of the lyrics.\n' +
        ' 3. Select exactly 20–30 tracks that best match the user’s stated theme, obeying any explicit user instruction about language, origin, genre, etc. If a track’s metadata is not obvious from the title/artist, infer from what you know (e.g., a well‐known Turkish artist) or ideally “research” it mentally.\n' +
        ' 4. Exclude any track only if the user specifically asked to exclude that origin/language/genre. Otherwise, do not add extra rules.\n' +
        ' 5. Return exactly one JSON object (no extra commentary) with two keys:\n' +
        '     • "playlistName": a concise, thematic title that reflects the user’s request.\n' +
        '     • "trackUris": an array of exactly 20–30 Spotify URIs chosen from the provided list.\n' +
        'Your output must be valid JSON only—nothing else.'
    };
    
    const userMessage = {
      role: 'user',
      content: [
        'User request:',
        `"${userPrompt}"`,
        '',
        'List of saved songs (one per line, format: index. "Title" by Artist(s) — URI):',
        likedTracks,
        '',
        'Select 20–30 tracks that best fit the user’s request, interpreting any exclusions or inclusions (e.g. “no Turkish songs”) from the user’s own words. In order to do that you need to search and find the language of all the songs ',
        'Respond with JSON exactly like this (no extra text):',
        '{',
        '  "playlistName": "…",',
        '  "trackUris": [',
        '    "spotify:track:xxxx",',
        '    "spotify:track:yyyy",',
        '    …',
        '  ]',
        '}'
      ].join('\n')
    };

    console.log('[Backend] About to call OpenAI...');
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
    // Before parsing, check if cleaned string looks complete (ends with '}' and closes the array)
    if (!cleaned.endsWith('}') || cleaned.indexOf('"trackUris"') === -1) {
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

    const { playlistName, trackUris } = parsed;
    if (
      typeof playlistName !== 'string' ||
      !Array.isArray(trackUris) ||
      trackUris.length < 20 ||
      trackUris.length > 30
    ) {
      console.error('[Backend] Unexpected JSON structure:', parsed);
      return res
        .status(500)
        .json({ error: 'GPT returned an invalid playlist format.' });
    }

    console.log('[Backend] Parsed playlistName:', playlistName);
    console.log('[Backend] Parsed trackUris (count):', trackUris.length);

    return res.json({ playlistName, trackUris });
  } catch (err) {
    console.error('[Backend] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Start the Express server
app.listen(port, () => {
  console.log(`🚀 Backend listening on port ${port}`);
});
