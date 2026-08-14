"use client";

import { useState } from "react";

export default function AssistantImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [themeId, setThemeId] = useState("");
  const [message, setMessage] = useState("");
const [tracks, setTracks] = useState<
  Array<{
    spotify_id: string;
    artist: string;
    title: string;
  }>
>([]);

const [isLoading, setIsLoading] = useState(false);
  async function handleImport() {
  if (!playlistUrl.trim()) {
    setMessage("Lim inn en Spotify-spilleliste.");
    return;
  }

  if (!themeId) {
    setMessage("Velg et tema.");
    return;
  }

  setIsLoading(true);
  setMessage("");
  setTracks([]);

  try {
    const response = await fetch(
      "/api/assistant/import/spotify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlistUrl,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke hente spillelisten.",
      );
      return;
    }

    setTracks(result.tracks ?? []);

    setMessage(
      `Fant ${result.count ?? 0} sanger i spillelisten.`,
    );
  } catch {
    setMessage("Noe gikk galt ved henting fra Spotify.");
  } finally {
    setIsLoading(false);
  }
}

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <h1>Quizlycs Import</h1>

      <p>
        Importer sanger fra en Spotify-spilleliste til
        review-køen.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginTop: "32px",
        }}
      >
        <div
          style={{
            background: "#15151d",
            border: "1px solid #444",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
        <label>
          <div style={{ marginBottom: "8px" }}>
            Spotify-spilleliste
          </div>

          <input
            type="text"
            value={playlistUrl}
            onChange={(event) =>
              setPlaylistUrl(event.target.value)
            }
            placeholder="https://open.spotify.com/playlist/..."
            style={{
              style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 16px",
              fontSize: "16px",
              background: "#17171f",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: "10px",
              outline: "none",
              }}
            }}
          />
        </label>
        </div>

        <label>
          <div style={{ marginBottom: "8px" }}>Tema</div>

          <select
            value={themeId}
            onChange={(event) =>
              setThemeId(event.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "16px",
            }}
          >
            <option
                value=""
                style={{ background: "#17171f", color: "#fff" }}
              >
                Velg tema
              </option>
              
              <option
                value="artists"
                style={{ background: "#17171f", color: "#fff" }}
              >
                Artister
              </option>
            <option value="body_parts">Kroppsdeler</option>
            <option value="colors">Farger</option>
            <option value="elements">Grunnstoffer</option>
            <option value="furniture">Møbler</option>
            <option value="instruments">
              Musikkinstrumenter
            </option>
            <option value="names">
              Guttenavn og jentenavn
            </option>
            <option value="planets">Planeter</option>
            <option value="star_wars_planets">
              Star Wars-planeter
            </option>
            <option value="towns">Byer</option>
            <option value="transport">
              Transportmidler
            </option>
            <option value="tree_species">Treslag</option>
          </select>
        </label>

        <button
          onClick={handleImport}
          disabled={isLoading}
          style={{
            style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 16px",
            fontSize: "16px",
            background: "#17171f",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "10px",
            outline: "none",
          }}
        >
          {isLoading ? "Henter..." : "Hent spilleliste"}
        </button>

        {message && <p>{message}</p>}
        {tracks.length > 0 && (
  <div style={{ marginTop: "20px" }}>
    <h2>Preview</h2>

    <p>
      Tema: <strong>{themeId}</strong>
    </p>

    <ol>
      {tracks.map((track) => (
        <li
          key={track.spotify_id}
          style={{ marginBottom: "8px" }}
        >
          <strong>{track.artist}</strong> – {track.title}
        </li>
      ))}
    </ol>
  </div>
)}
      </div>
    </main>
  );
}
