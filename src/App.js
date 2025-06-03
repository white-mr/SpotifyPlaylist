// src/App.js
import React, { useState, useEffect } from 'react';
import { useSpotifyAuth } from './hooks/useSpotifyAuth';
import SpotifyEmbed from './components/SpotifyEmbed';

function App() {
  const { accessToken, setAccessToken, login, logout } = useSpotifyAuth();
  const [userId, setUserId] = useState('');
  const [playlistUri, setPlaylistUri] = useState('6TTXtF7sPR4guAMLHSoLRC');
  const [prompt, setPrompt] = useState('');
  const [message, setMessage] = useState('');
  const [likedTracks, setLikedTracks] = useState([]);

  // ─── 1. On mount, load valid token or clear invalid entries ───
    useEffect(() => {
      const token = localStorage.getItem('spotify_access_token');
      const expiryStr = localStorage.getItem('spotify_expires_at');
      const expiry = expiryStr !== null ? Number(expiryStr) : NaN;

      if (
        token !== null &&
        expiryStr !== null &&
        !isNaN(expiry) &&
        expiry > Date.now()
      ) {
        setAccessToken(token);
      } else {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_expires_at');
      }
    }, [setAccessToken]);

  // 4. Once accessToken is set, fetch user profile + liked tracks
  useEffect(() => {
    if (!accessToken) return;
  
    let didCancel = false;
    const allTracks = [];
  
    (async () => {
      try {
        let offset = 0;
        const limit = 50;
        let totalFetched = 0;
  
        while (true) {
          const resp = await fetch(
            `https://api.spotify.com/v1/me/tracks?limit=${limit}&offset=${offset}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const data = await resp.json();
  
          const simplified = data.items.map((item, idx) => ({
            index: totalFetched + idx + 1,
            title: item.track.name,
            artists: item.track.artists.map((a) => a.name).join(', '),
            uri: item.track.uri
          }));
  
          allTracks.push(...simplified);
          totalFetched += data.items.length;
  
          if (data.items.length < limit) break;
          offset += limit;
        }
  
        if (!didCancel) {
          setLikedTracks(allTracks);
        }
      } catch (e) {
        if (!didCancel) {
          console.error('Error fetching liked tracks', e);
          logout(); // you can still call logout here if needed
        }
      }
    })();
  
    return () => {
      didCancel = true;
    };
  }, [accessToken]);
  

  // 5. Create playlist via AI
  async function handleCreatePlaylistWithGPT() {
    if (!prompt.trim()) {
      setMessage('Please enter a description first.');
      return;
    }
    if (likedTracks.length === 0) {
      setMessage('Fetching your liked songs… please wait and try again.');
      return;
    }

    setMessage('Asking AI to pick tracks…');
    // Build list
    const likedListString = likedTracks
      .map((t) => `${t.index}. "${t.title}" by ${t.artists} — ${t.uri}`)
      .join('\n');

    try {
      // 2. POST to backend
      const resp = await fetch('http://localhost:3001/api/pick-tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: prompt,
          likedTracks: likedListString
        })
      });
      const { playlistName, trackUris } = await resp.json();

      // 3. Create new Spotify playlist
      const playlistId = await createNewPlaylist(accessToken, playlistName);
      console.log("PlaylistID: " + playlistId);

      // 4. Add tracks in batches
      for (let i = 0; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        await addTracksToPlaylist(accessToken, playlistId, batch);
      }

      setMessage(`✅ Playlist created! View it here: https://open.spotify.com/playlist/${playlistId}`);
    } catch (err) {
      console.error('Error in handleCreatePlaylistWithGPT:', err);
      setMessage('❌ Something went wrong. Check console and backend.');
    }
  }

  if (!accessToken) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Create a Spotify Playlist from Your Liked Songs + AI</h2>
        <button onClick={login}>Log in with Spotify</button>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Create a Spotify Playlist from Your Liked Songs + AI</h2>
      <button onClick={logout} style={{ marginBottom: 16 }}>
        Log Out
      </button>

      <div style={{ marginBottom: 16 }}>
        <textarea
          rows={3}
          cols={60}
          placeholder="e.g. I’m at a party where people like afro"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <button onClick={handleCreatePlaylistWithGPT} style={{ marginTop: 8 }}>
        Generate Playlist via AI
      </button>
      <p>{message}</p>
      <SpotifyEmbed playlistId={playlistUri} />
    </div>
  );
  //   

  async function createNewPlaylist(token,promptText) {
    const resp = await fetch(
      `https://api.spotify.com/v1/me/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${promptText}`,
          description: `Auto-generated based on: "${promptText}"`,
          public: false
        })
      }
    );
    if (!resp.ok) {
      const err = await resp.json();
      console.error('Create Playlist error', err);
      throw new Error(`Spotify API error: ${err.error.message}`);
    }
    const data = await resp.json();
    return data.id; // this is the new playlist’s ID
  }
  async function addTracksToPlaylist(token, playlistId, uris) {
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris })
    });
  }
}

export default App;
