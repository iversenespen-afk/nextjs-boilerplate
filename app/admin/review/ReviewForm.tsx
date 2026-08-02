"use client";

import { useState } from "react";
import {
  rejectReview,
  skipReview,
} from "./actions";

type ReviewFormProps = {
  item: {
    id: number;
    spotify_id: string;
    artist: string;
    title: string;
    theme_id: string;
    theme_name: string;
    concept_id: string | null;
    matched_text: string | null;
  };
  suggestedConceptId?: string;
  suggestedMatchedText?: string;
};

export default function ReviewForm({
  item,
  suggestedConceptId = "",
  suggestedMatchedText = "",
}: ReviewFormProps) {
  const [conceptId, setConceptId] = useState(
    item.concept_id ?? suggestedConceptId,
  );

  const [matchedText, setMatchedText] = useState(
    item.matched_text ?? suggestedMatchedText,
  );

  async function testApproveApi() {
  const response = await fetch("/api/review/approve", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: item.id,
      concept_id: conceptId,
      matched_text: matchedText,
    }),
  });

  const result = await response.json();

  alert(result.message);
}
  
  return (
    <form
      style={{
        marginTop: 24,
        display: "grid",
        gap: 18,
      }}
    >
      <input type="hidden" name="queue_id" value={item.id} />
      <input type="hidden" name="spotify_id" value={item.spotify_id} />
      <input type="hidden" name="theme_id" value={item.theme_id} />

      <div>
        <label
          htmlFor="concept_id"
          style={{ display: "block", marginBottom: 7 }}
        >
          Concept-ID
        </label>

        <input
          id="concept_id"
          name="concept_id"
          value={conceptId}
          onChange={(event) => setConceptId(event.target.value)}
          placeholder="for eksempel bloodhound_gang"
          required
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

      <div>
        <label
          htmlFor="matched_text"
          style={{ display: "block", marginBottom: 7 }}
        >
          Ord eller uttrykk som synges
        </label>

        <input
          id="matched_text"
          name="matched_text"
          value={matchedText}
          onChange={(event) => setMatchedText(event.target.value)}
          placeholder="for eksempel Bloodhound Gang"
          required
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

      {(suggestedConceptId || suggestedMatchedText) && (
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <strong>Forslag:</strong>{" "}
          {suggestedMatchedText || suggestedConceptId}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
      <button
  type="button"
  onClick={testApproveApi}
          style={{
            padding: "12px 18px",
            border: 0,
            borderRadius: 10,
            background: "#16803a",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Godkjenn
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
