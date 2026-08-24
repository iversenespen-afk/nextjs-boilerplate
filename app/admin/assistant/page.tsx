"use client";

import { useEffect, useState } from "react";

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
  concept_class: string;
  explanation: string;
};

type AnalyzeResponse = {
  success: boolean;
  suggestions?: AssistantSuggestion[];
  message?: string;
};

type AssistantStats = {
  queue: number;
  pendingSuggestions: number;
  approved: number;
  rejected: number;
};

type ImportThemeStats = {
  themeId: string;
  themeName: string;
  total: number;
  toReview: number;
  approved: number;
  rejected: number;
};

type ImportStats = {
  songs: number;
  queueTotal: number;
  toReview: number;
  approved: number;
  rejected: number;
  themes: ImportThemeStats[];
};

export default function AssistantPage() {
  const [item, setItem] = useState<QueueItem | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<
  AssistantSuggestion[]
>([]);

const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [stats, setStats] = useState<AssistantStats | null>(
  null,
);

  const [importStats, setImportStats] =
  useState<ImportStats | null>(null);

async function fetchStats() {
  try {
    const response = await fetch("/api/assistant/stats", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    setStats(result.stats);
  } catch {
    // Dashboard-statistikk skal ikke stoppe review-siden.
  }
}

  async function fetchImportStats() {
  try {
    const response = await fetch("/api/assistant/import-stats", {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    setImportStats(result.stats);
  } catch {
    // Import-statistikk skal ikke stoppe Assistant-siden.
  }
}

useEffect(() => {
  fetchStats();
  fetchImportStats();
}, []);
  
  async function fetchNextItem() {
    if (isLoading) return;

    setIsLoading(true);

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
      const suggestionsResponse = await fetch(
  `/api/assistant/suggestions?queueId=${result.item.id}`,
  {
    method: "GET",
    cache: "no-store",
  },
);

const suggestionsResult = await suggestionsResponse.json();

if (
  suggestionsResponse.ok &&
  suggestionsResult.success &&
  Array.isArray(suggestionsResult.suggestions)
) {
  setSuggestions(suggestionsResult.suggestions);
} else {
  setSuggestions([]);
}
    } catch {
      setItem(null);
      setMessage("Noe gikk galt ved henting av neste sang.");
    } finally {
      setIsLoading(false);
    }
  }
async function analyzeNextBatch() {
  if (isLoading || isAnalyzing) return;

  setIsLoading(true);
  setMessage("Henter neste batch...");

  try {
    const batchResponse = await fetch("/api/assistant/batch", {
      method: "POST",
    });

    const batchResult = await batchResponse.json();

    if (!batchResponse.ok || !batchResult.success) {
      setMessage(
        batchResult.message ?? "Kunne ikke hente batch.",
      );
      return;
    }

    const items = batchResult.items ?? [];

    if (items.length === 0) {
      setMessage("Ingen nye sanger trenger analyse.");
      return;
    }

    let completed = 0;
    let failed = 0;

    const batchResults: string[] = [];

    for (const batchItem of items) {
      setMessage(
        `Analyserer ${completed + 1} av ${items.length}: ` +
          `${batchItem.artist} – ${batchItem.title}`,
      );

      try {
        const conceptsResponse = await fetch(
          `/api/assistant/concepts?themeId=${encodeURIComponent(
            batchItem.theme_id,
          )}`,
        );

        const conceptsResult = await conceptsResponse.json();

        if (
          !conceptsResponse.ok ||
          !conceptsResult.success
        ) {
          failed += 1;

          batchResults.push(
            `❌ ${batchItem.artist} – ${batchItem.title}: ` +
              `${
                conceptsResult.message ??
                "Kunne ikke hente concepts"
              }`,
          );

          completed += 1;
          continue;
        }

        const analyzeResponse = await fetch(
          "/api/assistant/analyze",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              queueId: batchItem.id,
              spotifyId: batchItem.spotify_id,
              artist: batchItem.artist,
              title: batchItem.title,
              themeId: batchItem.theme_id,
              themeName: batchItem.theme_name,
              concepts: conceptsResult.concepts,
            }),
          },
        );

        const analyzeResult = await analyzeResponse.json();

        if (
          !analyzeResponse.ok ||
          !analyzeResult.success
        ) {
          failed += 1;

          batchResults.push(
            `❌ ${batchItem.artist} – ${batchItem.title}: ` +
              `${analyzeResult.message ?? "Analyse feilet"}`,
          );
        } else {
          const suggestionCount =
            Array.isArray(analyzeResult.suggestions)
              ? analyzeResult.suggestions.length
              : Number(analyzeResult.count ?? 0);

          if (suggestionCount > 0) {
            batchResults.push(
              `✅ ${batchItem.artist} – ${batchItem.title}: ` +
                `${suggestionCount} ${
                  suggestionCount === 1
                    ? "forslag"
                    : "forslag"
                }`,
            );
          } else {
            batchResults.push(
              `○ ${batchItem.artist} – ${batchItem.title}: ingen treff`,
            );
          }
        }
      } catch (error) {
        failed += 1;

        batchResults.push(
          `❌ ${batchItem.artist} – ${batchItem.title}: ${
            error instanceof Error
              ? error.message
              : "Ukjent feil"
          }`,
        );
      }

      completed += 1;
    }

    const successful = completed - failed;

    setMessage(
      `Batch ferdig: ${successful} analysert, ${failed} feilet.\n\n` +
        batchResults.join("\n"),
    );

    await fetchNextItem();
    await fetchStats();
    await fetchImportStats();
  } catch {
    setMessage("Noe gikk galt under batch-analysen.");
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
        queueId: item.id,
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

const remainingSuggestions = suggestions.filter(
  (currentSuggestion) =>
    currentSuggestion.concept_id !== suggestion.concept_id,
);

if (remainingSuggestions.length > 0) {
  setSuggestions(remainingSuggestions);
} else {
  setSuggestions([]);
  setItem(null);
  await fetchNextItem();
  await fetchStats();
  await fetchImportStats();
}
  } catch {
    setMessage("Noe gikk galt under godkjenning.");
  }
}
  async function createConcept(
  suggestion: AssistantSuggestion,
) {
  if (!item) return;

  const groupLabels: Record<string, string> = {
    artists: "Artister",
    bands: "Band",
    male_names: "Guttenavn",
    female_names: "Jentenavn",
    unisex_names: "Unisex-navn",
  };

  async function sendCreate(groupId?: string) {
    return fetch("/api/assistant/create-concept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queueId: item.id,
        spotifyId: item.spotify_id,
        themeId: item.theme_id,
        conceptId: suggestion.concept_id,
        displayName: suggestion.display_name,
        conceptClass: suggestion.concept_class,
        matchedText: suggestion.matched_text,
        groupId,
      }),
    });
  }

  try {
    let response = await sendCreate();
    let result = await response.json();

    if (
      !response.ok &&
      Array.isArray(result.groupIds) &&
      result.groupIds.length > 1
    ) {
      const choices = result.groupIds
        .map(
          (groupId: string, index: number) =>
            `${index + 1} = ${
              groupLabels[groupId] ?? groupId
            }`,
        )
        .join("\n");

      const selected = window.prompt(
        `Velg concept-gruppe for "${suggestion.display_name}":\n\n${choices}`,
      );

      if (!selected) {
        return;
      }

      const selectedIndex = Number(selected) - 1;

      if (
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex >= result.groupIds.length
      ) {
        setMessage("Ugyldig gruppevalg.");
        return;
      }

      const selectedGroupId =
        result.groupIds[selectedIndex];

      response = await sendCreate(selectedGroupId);
      result = await response.json();
    }

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke opprette concept.",
      );
      return;
    }

    setMessage(
      result.message ?? "Nytt concept er opprettet.",
    );

    const remainingSuggestions = suggestions.filter(
      (currentSuggestion) =>
        currentSuggestion.concept_id !==
        suggestion.concept_id,
    );

    if (remainingSuggestions.length > 0) {
      setSuggestions(remainingSuggestions);
    } else {
      setSuggestions([]);
      setItem(null);

      await fetchNextItem();
      await fetchStats();
      await fetchImportStats();
    }
  } catch {
    setMessage(
      "Noe gikk galt under oppretting av concept.",
    );
  }
}
  async function rejectSuggestion(
  suggestion: AssistantSuggestion,
) {
  if (!item) return;

  try {
    const response = await fetch("/api/assistant/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  queueId: item.id,
  conceptId: suggestion.concept_id,
}),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke avvise forslaget.",
      );
      return;
    }

    setMessage(result.message ?? "Forslaget er avvist.");

const remainingSuggestions = suggestions.filter(
  (currentSuggestion) =>
    currentSuggestion.concept_id !== suggestion.concept_id,
);

if (remainingSuggestions.length > 0) {
  setSuggestions(remainingSuggestions);
} else {
  setSuggestions([]);
  setItem(null);
  await fetchNextItem();
  await fetchStats();
}
    } catch {
    setMessage("Noe gikk galt under avvisning.");
  }
}

async function rejectCurrentSong() {
  if (!item || isLoading || isAnalyzing) return;

  setIsLoading(true);
  setMessage("");

  try {
    const response = await fetch(
      "/api/assistant/reject-song",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueId: item.id,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke avvise sangen.",
      );
      return;
    }

    setSuggestions([]);
    setItem(null);
    setMessage("Sangen er avvist.");

    await fetchNextItem();
    await fetchStats();
    await fetchImportStats();
  } catch {
    setMessage("Noe gikk galt ved avvisning av sangen.");
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

      {stats && (
  <section
    style={{
      marginTop: 24,
      marginBottom: 24,
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 12,
      maxWidth: 800,
    }}
  >
    <div
      style={{
        padding: 16,
        border: "1px solid #444",
        borderRadius: 12,
        background: "#17171f",
      }}
    >
      <div style={{ opacity: 0.65, marginBottom: 6 }}>
        I kø
      </div>
      <strong style={{ fontSize: 28 }}>
        {stats.queue}
      </strong>
    </div>

    <div
      style={{
        padding: 16,
        border: "1px solid #444",
        borderRadius: 12,
        background: "#17171f",
      }}
    >
      <div style={{ opacity: 0.65, marginBottom: 6 }}>
        Pending forslag
      </div>
      <strong style={{ fontSize: 28 }}>
        {stats.pendingSuggestions}
      </strong>
    </div>

    <div
      style={{
        padding: 16,
        border: "1px solid #444",
        borderRadius: 12,
        background: "#17171f",
      }}
    >
      <div style={{ opacity: 0.65, marginBottom: 6 }}>
        Godkjent
      </div>
      <strong style={{ fontSize: 28 }}>
        {stats.approved}
      </strong>
    </div>

    <div
      style={{
        padding: 16,
        border: "1px solid #444",
        borderRadius: 12,
        background: "#17171f",
      }}
    >
      <div style={{ opacity: 0.65, marginBottom: 6 }}>
        Avvist
      </div>
      <strong style={{ fontSize: 28 }}>
        {stats.rejected}
      </strong>
    </div>
  </section>
      )}

      {importStats && (
  <section
    style={{
      marginTop: 24,
      padding: 16,
      border: "1px solid #444",
      borderRadius: 12,
      background: "#171717",
    }}
  >
    <h2 style={{ marginTop: 0 }}>Import-status</h2>

    <div>
      Sanger: <strong>{importStats.songs}</strong>
      {" · "}
      Kø: <strong>{importStats.queueTotal}</strong>
      {" · "}
      Til review: <strong>{importStats.toReview}</strong>
      {" · "}
      Godkjent: <strong>{importStats.approved}</strong>
      {" · "}
      Avvist: <strong>{importStats.rejected}</strong>
    </div>
    <div style={{ marginTop: 16 }}>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(180px, 1fr) 80px 90px 90px 80px",
      gap: 12,
      padding: "8px 0",
      borderTop: "1px solid #333",
      fontWeight: 700,
      opacity: 0.75,
    }}
  >
    <div>Tema</div>
    <div>Totalt</div>
    <div>Til review</div>
    <div>Godkjent</div>
    <div>Avvist</div>
  </div>

  {importStats.themes.map((theme) => (
    <div
      key={theme.themeId}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1fr) 80px 90px 90px 80px",
        gap: 12,
        padding: "8px 0",
        borderTop: "1px solid #333",
        alignItems: "center",
      }}
    >
      <strong>{theme.themeName}</strong>
      <div>{theme.total}</div>
      <div>{theme.toReview}</div>
      <div>{theme.approved}</div>
      <div>{theme.rejected}</div>
    </div>
  ))}
</div>
  </section>
)}

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
      <button
  type="button"
  onClick={analyzeNextBatch}
  disabled={isLoading || isAnalyzing}
  style={{
    marginLeft: 12,
    padding: "12px 18px",
    border: "1px solid #2563eb",
    borderRadius: 10,
    background: isAnalyzing ? "#333" : "#2563eb",
    color: "#fff",
    cursor:
      isLoading || isAnalyzing ? "default" : "pointer",
    fontSize: 16,
    fontWeight: 600,
  }}
>
  {isAnalyzing ? "Analyserer ..." : "Analyser neste 5"}
</button>

      {message && (
        <p
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #555",
            borderRadius: 10,
            whiteSpace: "pre-line",
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

<button
  type="button"
  onClick={rejectCurrentSong}
  disabled={isLoading || isAnalyzing}
  style={{
    marginTop: 18,
    marginLeft: 12,
    padding: "12px 18px",
    border: "1px solid #666",
    borderRadius: 10,
    background: "transparent",
    color: "#fff",
    cursor:
      isLoading || isAnalyzing
        ? "default"
        : "pointer",
    fontSize: 16,
  }}
>
  Avvis sang
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
        <div
  style={{
    marginTop: 8,
    marginBottom: 12,
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid #666",
    fontSize: 12,
    fontWeight: 700,
  }}
>
  {suggestion.existing_concept
    ? "EKSISTERENDE"
    : "NYTT CONCEPT"}
</div>

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
    onClick={() => {
  if (suggestion.existing_concept) {
    approveSuggestion(suggestion);
  } else {
  createConcept(suggestion);
  }
}}
    style={{
      padding: "10px 16px",
      border: 0,
      borderRadius: 8,
      background: "#16803a",
      color: "#fff",
      cursor: "pointer",
    }}
  >
    {suggestion.existing_concept
  ? "Godkjenn"
  : "Opprett og godkjenn"}
  </button>

  <button
    type="button"
    onClick={() => rejectSuggestion(suggestion)}
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
