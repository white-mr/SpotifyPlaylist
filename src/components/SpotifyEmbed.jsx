// src/components/SpotifyEmbed.jsx
import React, { useEffect, useRef } from 'react';

export default function SpotifyEmbed({ playlistId }) {
  const embedContainerRef = useRef(null);

  // 1. Dynamically inject the Spotify IFrame API script (only once)
  useEffect(() => {
    // If the script is already present, do nothing
    if (document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    document.body.appendChild(script);

    // Cleanup in case the component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // 2. Whenever playlistId changes, create (or re‐create) the Spotify embed
  useEffect(() => {
    const container = embedContainerRef.current;
    if (!container) return;

    // Helper: Clear any existing children (iframe or div) before inserting a new one
    const clearContainer = () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };

    // Build the full Spotify URI from the plain ID
    const embedUri = `spotify:playlist:${playlistId}`;

    // Function to actually call the IFrame API
    const createEmbed = (IFrameAPI) => {
      clearContainer();
      const options = {
        uri: embedUri,
        width: '100%',
        height: '100%'
      };
      const callback = (EmbedController) => {
        // (Optional) Listen for playback events
        EmbedController.addListener('playback_started', () => {});
        EmbedController.addListener('playback_paused', () => {});
        EmbedController.addListener('playback_update', (e) => {});
      };
      IFrameAPI.createController(container, options, callback);
    };

    // If the IFrame API is already loaded, use it immediately
    if (window.Spotify && window.Spotify.IFrameAPI) {
      createEmbed(window.Spotify.IFrameAPI);
    } else {
      // Otherwise wait for it to become ready
      window.onSpotifyIframeApiReady = (IFrameAPI) => {
        createEmbed(IFrameAPI);
      };
    }

    // Cleanup before next re‐run or unmount
    return () => {
      clearContainer();
      // Prevent the callback from firing again unexpectedly
      if (window.onSpotifyIframeApiReady) {
        window.onSpotifyIframeApiReady = null;
      }
    };
  }, [playlistId]);

  return (
    <div
      ref={embedContainerRef}
      style={{
        width: '100%',
        height: '300px',
        minHeight: '120px',
        borderRadius: '12px'
      }}
    />
  );
}
