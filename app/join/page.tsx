"use client";

import { useState } from "react";

type JoinResult = {
  success: boolean;
  message?: string;
  session?: {
    id: number;
    joinCode: string;
    status: string;
  };
  participant?: {
    id: number;
    session_id: number;
    display_name: string;
    score: number;
    joined_at: string;
  };
};

export default function JoinPage() {
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [joinedName, setJoinedName] = useState<string | null>(
    null,
  );

  async function joinQuiz() {
    if (isJoining) return;

    setIsJoining(true);
    setMessage("");

    try {
      const response = await fetch("/api/quiz/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          joinCode,
          displayName,
        }),
      });

      const result = (await response.json()) as JoinResult;

      if (!response.ok || !result.success) {
        setMessage(
          result.message ?? "Kunne ikke bli med i quizrommet.",
        );
        return;
      }

      setJoinedName(result.participant?.display_name ?? displayName);
    } catch {
      setMessage("Noe gikk galt da du prøvde å bli med.");
    } finally {
      setIsJoining(false);
    }
  }

  if (joinedName) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Du er med!</h1>
        <p>
          Velkommen, <strong>{joinedName}</strong>.
        </p>
        <p>Venter på at hosten starter quizen.</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 420,
      }}
    >
      <h1>Bli med i Quizlycs</h1>

      <div style={{ marginTop: 20 }}>
        <label
          htmlFor="joinCode"
          style={{
            display: "block",
            marginBottom: 6,
          }}
        >
          Romkode
        </label>

        <input
          id="joinCode"
          value={joinCode}
          onChange={(event) =>
            setJoinCode(event.target.value)
          }
          inputMode="numeric"
          autoComplete="off"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #555",
            fontSize: 20,
          }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label
          htmlFor="displayName"
          style={{
            display: "block",
            marginBottom: 6,
          }}
        >
          Navn
        </label>

        <input
          id="displayName"
          value={displayName}
          onChange={(event) =>
            setDisplayName(event.target.value)
          }
          autoComplete="off"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #555",
            fontSize: 20,
          }}
        />
      </div>

      <button
        type="button"
        onClick={joinQuiz}
        disabled={isJoining}
        style={{
          marginTop: 20,
          padding: "12px 18px",
          border: 0,
          borderRadius: 10,
          cursor: isJoining ? "default" : "pointer",
          fontWeight: 700,
        }}
      >
        {isJoining ? "Kobler til..." : "Bli med"}
      </button>

      {message && (
        <p style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </main>
  );
}
