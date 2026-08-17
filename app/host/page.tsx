"use client";

import { useState } from "react";

type QuizSession = {
  id: number;
  join_code: string;
  status: string;
  created_at: string;
};

export default function HostPage() {
  const [session, setSession] = useState<QuizSession | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");

  async function createSession() {
    if (isCreating) return;

    setIsCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/quiz/sessions", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.message ?? "Kunne ikke opprette quizrom.",
        );
        return;
      }

      setSession(result.session);
    } catch {
      setMessage("Noe gikk galt under oppretting av quizrom.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Quizlycs Host</h1>

      {!session ? (
        <button
          type="button"
          onClick={createSession}
          disabled={isCreating}
          style={{
            padding: "12px 18px",
            border: 0,
            borderRadius: 10,
            cursor: isCreating ? "default" : "pointer",
            fontWeight: 700,
          }}
        >
          {isCreating ? "Oppretter..." : "Opprett quizrom"}
        </button>
      ) : (
        <section>
          <div>Romkode</div>

          <strong
            style={{
              display: "block",
              fontSize: 48,
              letterSpacing: 8,
              marginTop: 8,
            }}
          >
            {session.join_code}
          </strong>
        </section>
      )}

      {message && (
        <p style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </main>
  );
}
