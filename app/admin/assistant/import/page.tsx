"use client";

import { useEffect, useState } from "react";

export default function AssistantImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [themeId, setThemeId] = useState("");
  const [themes, setThemes] = useState<
  Array<{ id: string; name: string }>
>([]);
  useEffect(() => {
  async function fetchThemes() {
    try {
      const response = await fetch("/api/assistant/themes", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (
        response.ok &&
        result.success &&
        Array.isArray(result.themes)
      ) {
        setThemes(result.themes);
      }
    } catch {
      // Dropdownen skal ikke krasje siden.
    }
  }

  fetchThemes();
}, []);
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
  async function handleCommitImport() {
  if (tracks.length === 0) {
    setMessage("Ingen sanger å importere.");
    return;
  }

  if (!themeId) {
    setMessage("Velg et tema.");
    return;
  }

  const selectedTheme = themes.find(
  (theme) => theme.id === themeId,
);

const themeName = selectedTheme?.name;

  if (!themeName) {
    setMessage("Ukjent tema.");
    return;
  }

  setIsLoading(true);
  setMessage("Importerer til kø...");

  try {
    const response = await fetch(
      "/api/assistant/import/commit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracks,
          themeId,
          themeName,
          sourcePlaylist: playlistUrl,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Import til kø feilet.",
      );
      return;
    }

    setMessage(
      `${result.found} funnet · ` +
        `${result.songsInserted} nye sanger · ` +
        `${result.queueInserted} lagt i kø · ` +
        `${result.skipped} hoppet over.`,
    );
  } catch {
    setMessage("Noe gikk galt under import til kø.");
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
      <a
  href="/api/spotify/login?returnTo=import"
  style={{
    display: "inline-block",
    marginTop: "12px",
    padding: "10px 14px",
    border: "1px solid #555",
    borderRadius: "10px",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 700,
  }}
>
  Koble til Spotify
</a>

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
    style={{
      background: "#17171f",
      color: "#fff",
    }}
  >
    Velg tema
  </option>

  {themes.map((theme) => (
    <option
      key={theme.id}
      value={theme.id}
      style={{
        background: "#17171f",
        color: "#fff",
      }}
    >
      {theme.name}
    </option>
  ))}
</select>
        </label>

        <button
          onClick={handleImport}
          disabled={isLoading}
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
    <button
  type="button"
  onClick={handleCommitImport}
  disabled={isLoading}
  style={{
    marginTop: "20px",
    padding: "12px 20px",
    border: "1px solid #666",
    borderRadius: "10px",
    background: "#16803a",
    color: "#fff",
    fontSize: "16px",
    cursor: isLoading ? "default" : "pointer",
  }}
>
  {isLoading ? "Importerer..." : "Importer til kø"}
</button>
  </div>
)}
      </div>
    </main>
  );
}
