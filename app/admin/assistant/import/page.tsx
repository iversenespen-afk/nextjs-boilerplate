"use client";

import { useState } from "react";

export default function AssistantImportPage() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [themeId, setThemeId] = useState("");
  const [message, setMessage] = useState("");

  async function handleImport() {
    if (!playlistUrl.trim()) {
      setMessage("Lim inn en Spotify-spilleliste.");
      return;
    }

    if (!themeId) {
      setMessage("Velg et tema.");
      return;
    }

    setMessage(
      "Importfunksjonen er ikke koblet til Spotify ennå.",
    );
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
              padding: "12px",
              fontSize: "16px",
            }}
          />
        </label>

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
            <option value="">Velg tema</option>
            <option value="artists">Artister</option>
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
          style={{
            width: "fit-content",
            padding: "12px 20px",
            fontSize: "16px",
            cursor: "pointer",
          }}
        >
          Hent spilleliste
        </button>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
