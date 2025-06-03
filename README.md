# Spotify Playlist AI App

A full-stack React & Node.js application that leverages OpenAI to generate themed Spotify playlists from a user’s liked songs. Users log in with Spotify, provide a prompt (e.g. “Michelin Star restaurant vibes”), and the AI selects and creates a new Spotify playlist automatically.

---

## Table of Contents

1. [Features](#features)  
2. [Prerequisites](#prerequisites)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  

---

## Features

- **PKCE OAuth with Spotify**  
  Securely authenticate users, fetch their profile, and read their saved tracks.

- **AI-Powered Track Selection**  
  Uses OpenAI (GPT-4o) to analyze saved tracks (by URI, artist, lyrics language, genre) and pick 20–30 tracks that best match the user’s prompt.

- **Automatic Playlist Creation**  
  Creates a new private Spotify playlist with the AI-chosen name and adds the selected tracks in batches.

- **Embedded Spotify Player**  
  Displays the newly created playlist in an iframe embed, so users can listen immediately.

- **Unified Start Script (`start.bat`)**  
  Launches React frontend and the Node.js backend in separate console windows. All processes terminate together if any one stops.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js & npm** (v16 or newer)  
- **PowerShell** (v5 or newer) on Windows  
- **Spotify Developer Account** (to obtain Client ID, set Redirect URI)  
- **OpenAI API Key** (with sufficient quota for your usage (ask for .env.local))

---

## Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/spotify-playlist-ai-app.git
   cd spotify-playlist-ai-app
   ```

2. **Install dependencies**  
     ```bash
     npm install
     ```


3. **Verify that `start.bat` exists** in the project root—this batch file will launch everything for you.


---

## Configuration

1. **Spotify App Setup**  
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).  
   - Create a new application.  
   - Copy the **Client ID**.  
   - Under “Redirect URIs,” add:
     ```
     https://spotifyplaylist.loca.lt/callback
     ```
   - Note the URI exactly (including `/callback`).

2. **.env.local file**  
   - Create .env.local file OPENAI_API_KEY=sk-proj-.........


## Running the Application

Use the included `start.bat` to launch all services at once:
