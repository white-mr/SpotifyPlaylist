import { useState, useEffect, useRef } from 'react';
import queryString from 'query-string';
import { generateRandomString, generateCodeChallenge } from '../utils/pkce';

const CLIENT_ID = '7db665c5141e42f3b227bb2fe42ded1f';
const REDIRECT_URI = 'https://spotifyplaylist.loca.lt/callback';
const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read'
];

export function useSpotifyAuth() {
  const [accessToken, setAccessToken] = useState('');
  const [expiryTime, setExpiryTime] = useState(0);
  const hasExchangedCode = useRef(false);

  // ─── 1. On mount: load & validate any existing token ───
  useEffect(() => {
    const token = localStorage.getItem('spotify_access_token');
    const expiryStr = localStorage.getItem('spotify_expires_at');
    const expiry = expiryStr !== null ? Number(expiryStr) : NaN;

    if (token && expiryStr !== null && !isNaN(expiry) && expiry > Date.now()) {
      setAccessToken(token);
      setExpiryTime(expiry);
    } else {
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_expires_at');
    }
  }, []);

  // ─── 2. Handle “code” exchange exactly once ───
  useEffect(() => {
    // If we already exchanged once, skip
    if (hasExchangedCode.current) return;

    const { code, state } = queryString.parse(window.location.search);
    const savedState = localStorage.getItem('pkce_state');
    const verifier = localStorage.getItem('pkce_verifier');

    // Only proceed if there’s a code, matching state, and a verifier present
    if (code && state === savedState && verifier) {
      hasExchangedCode.current = true; // mark that we’re doing the exchange now

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier
      });

      fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then((res) => res.json())
        .then((data) => {
          const { access_token, expires_in } = data;
          const expiry = Date.now() + expires_in * 1000;

          setAccessToken(access_token);
          setExpiryTime(expiry);

          localStorage.setItem('spotify_access_token', access_token);
          localStorage.setItem('spotify_expires_at', expiry.toString());

          localStorage.removeItem('pkce_state');
          localStorage.removeItem('pkce_verifier');

          // Clean the URL so “?code=…” is gone
          window.history.replaceState({}, document.title, '/');
        })
        .catch((err) => console.error('Token exchange failed', err));
    }
  }, []);

  // ─── 3. login() and logout() ───
  const login = async () => {
    const verifier = generateRandomString(128);
    const challenge = await generateCodeChallenge(verifier);
    localStorage.setItem('pkce_verifier', verifier);

    const state = generateRandomString(16);
    localStorage.setItem('pkce_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      redirect_uri: REDIRECT_URI,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge
    });

    window.location = `${AUTH_ENDPOINT}?${params.toString()}`;
  };

  const logout = () => {
    setAccessToken('');
    setExpiryTime(0);
    localStorage.clear();
    window.location.href = '/';
  };

  return { accessToken, setAccessToken, login, logout };
}
