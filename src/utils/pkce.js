// src/utils/pkce.js

// Generate a random alphanumeric string of given length (default 128)
export function generateRandomString(length = 128) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Compute SHA-256 hash of an input string and return a Uint8Array
export async function sha256(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(buffer));
  return new Uint8Array(digest);
}

// Base64‐URL‐encode a Uint8Array (removing padding, replacing +/ with -/_)
export function base64UrlEncode(bytes) {
  let str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Given a PKCE verifier string, return its SHA-256 “code_challenge” (base64url)
export async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}
