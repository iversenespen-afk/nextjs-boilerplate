"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  rejectReview,
  skipReview,
} from "./actions";

type ReviewItem = {
  id: number;
  spotify_id: string;
  artist: string;
  title: string;
  theme_id: string;
  theme_name: string;
  concept_id: string | null;
  matched_text: string | null;
};

type ReviewHit = {
  concept_id: string;
  matched_text: string;
};

type ReviewFormProps = {
  item: ReviewItem;
};

function createConceptId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function ReviewForm({
  item,
}: ReviewFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [hits, setHits] = useState<ReviewHit[]>([
    {
      concept_id: item.concept_id ?? "",
      matched_text: item.matched_text ?? "",
    },
  ]);

  function updateHit(
    index: number,
    field: keyof ReviewHit,
    value: string,
  ) {
    setHits((currentHits) =>
      currentHits.map((hit, hitIndex) => {
        if (hitIndex !== index) {
          return hit;
        }

        if (field === "matched_text") {
          const oldGeneratedId = createConceptId(hit.matched_text);

          return {
            matched_text: value,
            concept_id:
              !hit.concept_id ||
              hit.concept_id === oldGeneratedId
                ? createConceptId(value)
                : hit.concept_id,
          };
        }

        return {
          ...hit,
          [field]: value,
        };
      }),
    );
  }

  function addHit() {
    setHits((currentHits) => [
      ...currentHits,
      {
        concept_id: "",
        matched_text: "",
      },
    ]);
  }

  function removeHit(index: number) {
    setHits((currentHits) => {
      if (currentHits.length === 1) {
        return currentHits;
      }

      return currentHits.filter(
        (_, hitIndex) => hitIndex !== index,
      );
    });
  }

  async function approveAllAndContinue() {
    if (isSaving) return;

    const cleanedHits = hits
      .map((hit) => ({
        concept_id: createConceptId(
          hit.concept_id || hit.matched_text,
        ),
        matched_text: hit.matched_text.trim(),
      }))
      .filter(
        (hit) => hit.concept_id && hit.matched_text,
      );

    if (cleanedHits.length === 0) {
      alert("Legg inn minst ett gyldig treff.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/review/approve",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: item.id,
            hits: cleanedHits,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(
          result.message ??
            "Kunne ikke lagre treffene.",
        );
        return;
      }

      router.refresh();
    } catch {
      alert("Noe gikk galt under lagringen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      style={{
        marginTop: 24,
        display: "grid",
        gap: 20,
      }}
    >
      <input
        type="hidden"
        name="queue_id"
        value={item.id}
      />

      <input
        type="hidden"
        name="spotify_id"
        value={item.spotify_id}
      />

      <input
        type="hidden"
        name="theme_id"
        value={item.theme_id}
      />

      <div
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        {hits.map((hit, index) => (
          <section
            key={index}
            style={{
              padding: 18,
              border: "1px solid #555",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                Treff {index + 1}
              </h3>

              {hits.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeHit(index)}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#ff7777",
                    cursor: "pointer",
                  }}
                >
                  Fjern
                </button>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <label
                htmlFor={`matched_text_${index}`}
                style={{
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Ord eller uttrykk som synges
              </label>

              <input
                id={`matched_text_${index}`}
                value={hit.matched_text}
                onChange={(event) =>
                  updateHit(
                    index,
                    "matched_text",
                    event.target.value,
                  )
                }
                placeholder="for eksempel Kurt Cobain"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #666",
                  background: "#202028",
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label
                htmlFor={`concept_id_${index}`}
                style={{
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Concept-ID
              </label>

              <input
                id={`concept_id_${index}`}
                value={hit.concept_id}
                onChange={(event) =>
                  updateHit(
                    index,
                    "concept_id",
                    event.target.value,
                  )
                }
                placeholder="for eksempel kurt_cobain"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #666",
                  background: "#202028",
                  color: "#fff",
                  fontSize: 16,
                }}
              />
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={addHit}
        style={{
          justifySelf: "start",
          padding: "11px 16px",
          border: "1px solid #777",
          borderRadius: 10,
          background: "transparent",
          color: "#fff",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        + Legg til nytt treff
      </button>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={approveAllAndContinue}
          disabled={isSaving}
          style={{
            padding: "12px 18px",
            border: 0,
            borderRadius: 10,
            background: "#16803a",
            color: "#fff",
            cursor: isSaving
              ? "default"
              : "pointer",
            fontSize: 16,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving
            ? "Lagrer …"
            : "Godkjenn alle og neste"}
        </button>

        <button
          type="submit"
          formAction={rejectReview}
          formNoValidate
          style={{
            padding: "12px 18px",
            border: 0,
            borderRadius: 10,
            background: "#9f2020",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Avvis
        </button>

        <button
          type="submit"
          formAction={skipReview}
          formNoValidate
          style={{
            padding: "12px 18px",
            border: "1px solid #777",
            borderRadius: 10,
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Hopp over
        </button>
      </div>
    </form>
  );
}
