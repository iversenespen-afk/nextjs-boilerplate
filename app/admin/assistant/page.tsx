"use client";

import { useState } from "react";

type QueueItem = {
  id: number;
  spotify_id: string;
  artist: string;
  title: string;
  theme_id: string;
  theme_name: string;
  source_playlist: string | null;
  concept_id: string | null;
  matched_text: string | null;
  verified: boolean;
  review_status: string;
  notes: string | null;
  created_at: string;
};

type NextItemResponse = {
  success: boolean;
  item?: QueueItem | null;
  message?: string;
};

export default function AssistantPage() {
  const [item, setItem] = useState<QueueItem | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function fetchNextItem() {
    if (isLoading) return;

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/assistant/next", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as NextItemResponse;

      if (!response.ok || !result.success) {
        setItem(null);
        setMessage(
          result.message ?? "Kunne ikke hente neste sang.",
        );
        return;
      }

      if (!result.item) {
        setItem(null);
        setMessage(
          result.message ?? "Ingen sanger venter på behandling.",
        );
        return;
      }

      setItem(result.item);
    } catch {
      setItem(null);
      setMessage("Noe gikk galt ved henting av neste sang.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "#111118",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <h1>Quizlix Assistant</h1>

      <p style={{ opacity: 0.75 }}>
        AI-assistent for behandling av review queue.
      </p>

      <button
        type="button"
        onClick={fetchNextItem}
        disabled={isLoading}
        style={{
          padding: "12px 18px",
          border: "1px solid #666",
          borderRadius: 10,
          background: isLoading ? "#333" : "#16803a",
          color: "#fff",
          cursor: isLoading ? "default" : "pointer",
          fontSize: 16,
        }}
      >
        {isLoading ? "Henter ..." : "Hent neste sang"}
      </button>

      {message && (
        <p
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #555",
            borderRadius: 10,
          }}
        >
          {message}
        </p>
      )}

      {item && (
        <section
          style={{
            marginTop: 28,
            padding: 24,
            border: "1px solid #555",
            borderRadius: 16,
            maxWidth: 800,
          }}
        >
          <p style={{ opacity: 0.65, marginBottom: 8 }}>
            Neste sang
          </p>

          <h2 style={{ marginTop: 0 }}>
            {item.artist} – {item.title}
          </h2>

          <p>
            <strong>Tema:</strong> {item.theme_name}
          </p>

          <p>
            <strong>Spilleliste:</strong>{" "}
            {item.source_playlist ?? "Ukjent"}
          </p>

          <p>
            <strong>Kø-ID:</strong> {item.id}
          </p>

          <p>
            <strong>Spotify-ID:</strong> {item.spotify_id}
          </p>
        </section>
      )}
    </main>
  );
}
