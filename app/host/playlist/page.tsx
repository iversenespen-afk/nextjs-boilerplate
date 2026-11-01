
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Track = {
  questionNumber: number;
  artist: string | null;
  title: string | null;
  spotifyId: string | null;
  spotifyUrl: string | null;
};

  function HostPlaylistContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Mangler sessionId.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadPlaylist() {
      try {
        const response = await fetch(
          `/api/quiz/playlist?sessionId=${sessionId}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ?? "Kunne ikke hente spillelisten."
          );
        }

        if (!cancelled) {
          setTracks(result.tracks ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Ukjent feil."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 24 }}>
      <h1>Quizlycs – spilleliste</h1>

      <p>
        Quizrunde: {sessionId ?? "Ukjent"}
      </p>

      <p style={{ opacity: 0.7 }}>
        Kun for quizadministrator. Denne listen avslører sangene
        og bør ikke vises på deltakernes skjerm.
      </p>

      {loading && <p>Henter spilleliste...</p>}
      {error && <p>{error}</p>}

      {!loading && !error && (
        <>
          <h2>{tracks.length} låter</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {tracks.map((track) => (
              <div
                key={track.questionNumber}
                style={{
                  padding: 14,
                  border: "1px solid #444",
                  borderRadius: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <strong>
                    {track.questionNumber}. {track.artist}
                  </strong>
                  <div>{track.title}</div>
                </div>

                {track.spotifyUrl && (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "#1db954",
                      color: "#000",
                      fontWeight: 700,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Spotify
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default function HostPlaylistPage() {
  return (
    <Suspense fallback={<p>Laster spilleliste...</p>}>
      <HostPlaylistContent />
    </Suspense>
  );
}

