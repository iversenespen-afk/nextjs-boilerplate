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
type AssistantSuggestion = {
  concept_id: string;
  matched_text: string;
  display_name: string;
  confidence: number;
  existing_concept: boolean;
  explanation: string;
};

type AnalyzeResponse = {
  success: boolean;
  suggestions?: AssistantSuggestion[];
  message?: string;
};

export default function AssistantPage() {
  const [item, setItem] = useState<QueueItem | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
  AssistantSuggestion[]
>([]);

const [isAnalyzing, setIsAnalyzing] = useState(false);

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
async function analyzeItem() {
  if (!item || isAnalyzing) return;

  setIsAnalyzing(true);
  setMessage("");
  setSuggestions([]);

  try {
    const conceptsResponse = await fetch(
  `/api/assistant/concepts?themeId=${encodeURIComponent(item.theme_id)}`
);

const conceptsResult = await conceptsResponse.json();

if (!conceptsResponse.ok || !conceptsResult.success) {
  setMessage("Kunne ikke hente concepts.");
  setIsAnalyzing(false);
  return;
}
    const response = await fetch("/api/assistant/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        spotifyId: item.spotify_id,
        artist: item.artist,
        title: item.title,
        themeId: item.theme_id,
        themeName: item.theme_name,
        concepts: conceptsResult.concepts,
      }),
    });

    const result = (await response.json()) as AnalyzeResponse;

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke analysere sangen.",
      );
      return;
    }

    setSuggestions(result.suggestions ?? []);

    if (!result.suggestions?.length) {
      setMessage(
        "AI fant ingen sikre treff for dette temaet.",
      );
    }
  } catch {
    setMessage("Noe gikk galt under AI-analysen.");
  } finally {
    setIsAnalyzing(false);
  }
}
  async function approveSuggestion(
  suggestion: AssistantSuggestion,
) {
  if (!item) return;

  try {
    const response = await fetch("/api/assistant/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queueId: item.id,
        spotifyId: item.spotify_id,
        themeId: item.theme_id,
        conceptId: suggestion.concept_id,
        matchedText: suggestion.matched_text,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke godkjenne forslaget.",
      );
      return;
    }

    setMessage(result.message ?? "Forslaget er godkjent.");
  } catch {
    setMessage("Noe gikk galt under godkjenning.");
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
          <button
  type="button"
  onClick={analyzeItem}
  disabled={isAnalyzing}
  style={{
    marginTop: 18,
    padding: "12px 18px",
    border: 0,
    borderRadius: 10,
    background: isAnalyzing ? "#333" : "#2563eb",
    color: "#fff",
    cursor: isAnalyzing ? "default" : "pointer",
    fontSize: 16,
  }}
>
  {isAnalyzing
    ? "Analyserer ..."
    : "Analyser med AI"}
</button>
        </section>
      )}
      {suggestions.length > 0 && (
  <section
    style={{
      marginTop: 28,
      maxWidth: 800,
    }}
  >
    <h2>AI-forslag</h2>

    {suggestions.map((suggestion) => (
      <article
        key={`${suggestion.concept_id}-${suggestion.matched_text}`}
        style={{
          marginTop: 12,
          padding: 18,
          border: "1px solid #555",
          borderRadius: 12,
        }}
      >
        <strong>{suggestion.display_name}</strong>

        <p>
          Synges: <strong>{suggestion.matched_text}</strong>
        </p>

        <p>Concept-ID: {suggestion.concept_id}</p>

        <p>
          Sikkerhet:{" "}
          {Math.round(suggestion.confidence * 100)} %
        </p>

        <p style={{ opacity: 0.75 }}>
          {suggestion.explanation}
        </p>
        <div
  style={{
    display: "flex",
    gap: 12,
    marginTop: 16,
  }}
>
  <button
    type="button"
    onClick={() => approveSuggestion(suggestion)}
    style={{
      padding: "10px 16px",
      border: 0,
      borderRadius: 8,
      background: "#16803a",
      color: "#fff",
      cursor: "pointer",
    }}
  >
    Godkjenn
  </button>

  <button
    type="button"
    style={{
      padding: "10px 16px",
      border: "1px solid #666",
      borderRadius: 8,
      background: "transparent",
      color: "#fff",
      cursor: "pointer",
    }}
  >
    Avvis
  </button>
</div>
      </article>
    ))}
  </section>
)}
    </main>
  );
}
