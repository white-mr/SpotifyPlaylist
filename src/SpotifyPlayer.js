// In any React component (e.g. SpotifyPlayer.jsx)
import React, { useEffect, useRef } from 'react';

export default function SpotifyPlayer({ uri, width = '300', height = '80' }) {
  // uri could be something like 'spotify:track:2CZ0M0TiyfdL5d9PkMIMqE'
  // to embed a playlist, use 'spotify:playlist:...' etc.

  const iframeRef = useRef(null);

  useEffect(() => {
    // Wait until window.Spotify is defined
    if (!window.Spotify || !iframeRef.current) return;

    // Wrap the iframeRef.current with the Spotify.IFrame API
    const player = new window.Spotify.IFrameAPI(iframeRef.current);

    player.addListener('ready', () => {
      console.log('✅ Spotify IFrame API ready');
      // You can call player.play(), player.pause(), etc. here if desired
    });

    player.addListener('playback_update', (data) => {
      // Fires whenever the playback state changes (e.g. play, pause, seek)
      console.log('Playback update:', data);
    });

    // Cleanup if this component unmounts
    return () => {
      player.removeListener('ready');
      player.removeListener('playback_update');
    };
  }, [uri]);

  // Build the embed URL; you can customize theme/light/dark via query params
  const embedSrc = `https://open.spotify.com/embed/${uriType(uri)}/${extractId(
    uri
  )}?utm_source=generator`;

  return (
    <iframe
      ref={iframeRef}
      title="Spotify Player"
      src={embedSrc}
      width={width}
      height={height}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowTransparency="true"
    />
  );
}

// Helpers to parse Spotify URIs
function uriType(uri) {
  // e.g. "spotify:track:xxxx" → "track"
  return uri.split(':')[1];
}
function extractId(uri) {
  // e.g. "spotify:track:xxxx" → "xxxx"
  return uri.split(':')[2];
}
