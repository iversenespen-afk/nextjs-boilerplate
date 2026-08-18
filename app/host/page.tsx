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
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [answerStatus, setAnswerStatus] = useState({
  answered: 0,
  total: 0,
});

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
async function fetchAnswerStatus(sessionId: number) {
  try {
    const response = await fetch(
      `/api/quiz/answer-status?sessionId=${sessionId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    setAnswerStatus({
      answered: result.answered ?? 0,
      total: result.total ?? 0,
    });
  } catch {
    // Svarstatus skal ikke krasje host-siden.
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

async function nextQuestion() {
  if (!session || isLoadingNext) return;

  setIsLoadingNext(true);
  setMessage("");

  try {
    const response = await fetch("/api/quiz/next", {
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
        result.message ?? "Kunne ikke hente neste spørsmål.",
      );
      return;
    }

    if (result.finished) {
  setSession((currentSession) =>
    currentSession
      ? {
          ...currentSession,
          status: "finished",
        }
      : currentSession,
  );

  setMessage("Quizen er ferdig.");
  return;
}

setMessage("Neste spørsmål er klart.");
  } catch {
    setMessage("Noe gikk galt da neste spørsmål skulle hentes.");
  } finally {
    setIsLoadingNext(false);
  }
}
  
  useEffect(() => {
  if (!session) return;

  fetchParticipants(session.id);
fetchAnswerStatus(session.id);

const interval = setInterval(() => {
  fetchParticipants(session.id);
  fetchAnswerStatus(session.id);
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
                {[...participants]
                  .sort((a, b) => b.score - a.score)
                  .map((participant, index) => (
                    <div
                      key={participant.id}
                      style={{
                        padding: "8px 0",
                        borderTop: "1px solid #333",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 16,
                        }}
                      >
                        <strong>
                          {index + 1}. {participant.display_name}
                        </strong>

                        <strong>{participant.score} poeng</strong>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {session.status === "lobby" && (
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
            )}

            {session.status === "playing" && (
              <div>
                <div
                  style={{
                    marginTop: 16,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  <div
  style={{
    marginTop: 16,
    fontSize: 18,
    fontWeight: 700,
  }}
>
  Svar: {answerStatus.answered} / {answerStatus.total}

  <div
    style={{
      marginTop: 6,
      fontSize: 14,
      fontWeight: 400,
      opacity: 0.7,
    }}
  >
    {answerStatus.total > 0 &&
    answerStatus.answered >= answerStatus.total
      ? "Alle har svart ✓"
      : `Venter på ${
          Math.max(
            0,
            answerStatus.total - answerStatus.answered,
          )
        } spiller${
          Math.max(
            0,
            answerStatus.total - answerStatus.answered,
          ) === 1
            ? ""
            : "e"
        }...`}
  </div>
</div>
                </div>

                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={
                    isLoadingNext ||
                    answerStatus.total === 0 ||
                    answerStatus.answered < answerStatus.total
                  }
                  style={{
                    marginTop: 12,
                    padding: "12px 18px",
                    border: 0,
                    borderRadius: 10,
                    cursor:
                      isLoadingNext ||
                      answerStatus.total === 0 ||
                      answerStatus.answered < answerStatus.total
                        ? "default"
                        : "pointer",
                    fontWeight: 700,
                  }}
                >
                  {isLoadingNext ? "Henter..." : "Neste spørsmål"}
                </button>
                {answerStatus.total > 0 &&
  answerStatus.answered < answerStatus.total && (
    <button
      type="button"
      onClick={() => {
        const shouldContinue = window.confirm(
          `Bare ${answerStatus.answered} av ${answerStatus.total} har svart. Gå videre likevel?`,
        );

        if (shouldContinue) {
          nextQuestion();
        }
      }}
      disabled={isLoadingNext}
      style={{
        marginTop: 8,
        padding: "10px 16px",
        border: "1px solid #555",
        borderRadius: 10,
        background: "transparent",
        cursor: isLoadingNext ? "default" : "pointer",
        fontWeight: 700,
      }}
    >
      Tving neste spørsmål
    </button>
  )}
              </div>
            )}
            {session.status === "finished" && (
  <section style={{ marginTop: 32 }}>
    <h2>Sluttresultat</h2>

    {[...participants]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((participant, index) => (
        <div
          key={participant.id}
          style={{
            marginTop: 12,
            padding: 16,
            border: "1px solid #444",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              fontSize: index === 0 ? 24 : 20,
              fontWeight: 800,
            }}
          >
            <span>
              {index + 1}. {participant.display_name}
            </span>

            <span>{participant.score} poeng</span>
          </div>
        </div>
      ))}

    {participants.length > 3 && (
      <div style={{ marginTop: 24 }}>
        <h3>Alle resultater</h3>

        {[...participants]
          .sort((a, b) => b.score - a.score)
          .map((participant, index) => (
            <div
              key={participant.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "8px 0",
                borderTop: "1px solid #333",
              }}
            >
              <span>
                {index + 1}. {participant.display_name}
              </span>

              <strong>{participant.score} poeng</strong>
            </div>
          ))}
      </div>
    )}
  </section>
)}
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
