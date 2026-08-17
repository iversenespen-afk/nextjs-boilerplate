"use client";

import { useEffect, useState } from "react";

type QuizSession = {
  id: number;
  join_code: string;
  status: string;
  created_at: string;
};

type QuizParticipant = {
  id: number;
  session_id: number;
  display_name: string;
  score: number;
  joined_at: string;
};

export default function HostPage() {
  const [session, setSession] = useState<QuizSession | null>(
    null,
  );

const [participants, setParticipants] = useState<
  QuizParticipant[]
>([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);

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

  async function fetchParticipants(sessionId: number) {
  try {
    const response = await fetch(
      `/api/quiz/participants?sessionId=${sessionId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    setParticipants(result.participants ?? []);
  } catch {
    // Deltakerlista skal ikke krasje host-siden.
  }
}

async function startQuiz() {
  if (!session || isStarting) return;

  setIsStarting(true);
  setMessage("");

  try {
    const response = await fetch("/api/quiz/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: session.id,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke starte quizen.",
      );
      return;
    }

    setSession((currentSession) =>
      currentSession
        ? {
            ...currentSession,
            status: result.session.status,
          }
        : currentSession,
    );
  } catch {
    setMessage("Noe gikk galt da quizen skulle startes.");
  } finally {
    setIsStarting(false);
  }
}
  
  useEffect(() => {
  if (!session) return;

  fetchParticipants(session.id);

  const interval = setInterval(() => {
    fetchParticipants(session.id);
  }, 2000);

  return () => clearInterval(interval);
}, [session]);

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
  <>
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

    <section style={{ marginTop: 24 }}>
      <h2>Spillere</h2>

      {participants.length === 0 ? (
        <p>Ingen spillere har blitt med ennå.</p>
      ) : (
        <div>
          {participants.map((participant) => (
            <div
              key={participant.id}
              style={{
                padding: "8px 0",
                borderTop: "1px solid #333",
              }}
            >
              <strong>{participant.display_name}</strong>
            </div>
          ))}
        </div>
      )}
                <button
            type="button"
            onClick={startQuiz}
            disabled={isStarting || participants.length === 0}
            style={{
              marginTop: 24,
              padding: "12px 18px",
              border: 0,
              borderRadius: 10,
              cursor:
                isStarting || participants.length === 0
                  ? "default"
                  : "pointer",
              fontWeight: 700,
            }}
          >
            {isStarting ? "Starter..." : "Start quiz"}
          </button>
     
    </section>
  </>
)}

      {message && (
        <p style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </main>
  );
}
