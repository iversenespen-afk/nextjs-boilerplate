"use client";

import { useEffect, useState } from "react";

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

type QuizQuestion = {
  songMatchId: number;
  themeId: string;
  themeName: string;
  song: {
    id: number;
    title: string;
    artist: string;
    spotify_id: string;
  };
  options: {
    id: string;
    label: string;
  }[];
};

export default function JoinPage() {
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [participantId, setParticipantId] =
  useState<number | null>(null);
  const [selectedConceptId, setSelectedConceptId] =
  useState<string | null>(null);

const [answerResult, setAnswerResult] =
  useState<"correct" | "wrong" | null>(null);

const [isAnswering, setIsAnswering] = useState(false);
  const [joinedName, setJoinedName] = useState<string | null>(
  null,
);

const [question, setQuestion] =
  useState<QuizQuestion | null>(null);

const [sessionId, setSessionId] = useState<number | null>(null);

const [sessionStatus, setSessionStatus] = useState<string | null>(
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
      setParticipantId(result.participant?.id ?? null);
      setSessionId(result.session?.id ?? null);
      setSessionStatus(result.session?.status ?? null);
    } catch {
      setMessage("Noe gikk galt da du prøvde å bli med.");
    } finally {
      setIsJoining(false);
    }
  }

  async function fetchQuestion(currentSessionId: number) {
  try {
    const response = await fetch(
      `/api/quiz/question?sessionId=${currentSessionId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    setQuestion(result.question);
  } catch {
    // Spørsmålshenting skal ikke krasje spillersiden.
  }
}

  async function submitAnswer(selectedConceptId: string) {
  if (
    !sessionId ||
    !participantId ||
    isAnswering ||
    answerResult
  ) {
    return;
  }

  setIsAnswering(true);
  setMessage("");

  try {
    const response = await fetch("/api/quiz/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        participantId,
        selectedConceptId,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke registrere svaret.",
      );
      return;
    }

    setSelectedConceptId(selectedConceptId);
    setAnswerResult(
      result.result.isCorrect ? "correct" : "wrong",
    );
  } catch {
    setMessage("Noe gikk galt da svaret skulle registreres.");
  } finally {
    setIsAnswering(false);
  }
}

  useEffect(() => {
  if (!sessionId) return;
  
  const currentSessionId = sessionId;

  async function fetchSessionStatus() {
    try {
      const response = await fetch(
        `/api/quiz/sessions?sessionId=${sessionId}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        return;
      }

      setSessionStatus(result.session.status);

if (result.session.status === "playing") {
  await fetchQuestion(currentSessionId);
}
    } catch {
      // Status-polling skal ikke krasje spillersiden.
    }
  }

  fetchSessionStatus();

  const interval = setInterval(fetchSessionStatus, 2000);

  return () => clearInterval(interval);
}, [sessionId]);

  if (joinedName && sessionStatus === "playing") {
  if (!question) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Quizen har startet!</h1>
        <p>Laster spørsmål...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div style={{ opacity: 0.7 }}>
        {question.themeName}
      </div>

      <h1 style={{ marginBottom: 4 }}>
        {question.song.artist}
      </h1>

      <div
        style={{
          fontSize: 20,
          marginBottom: 24,
        }}
      >
        {question.song.title}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => submitAnswer(option.id)}
              disabled={isAnswering || answerResult !== null}
            style={{
              padding: "16px 14px",
              border: "1px solid #555",
              borderRadius: 999,
              fontSize: 16,
              fontWeight: 700,
              background:
                selectedConceptId === option.id
                  ? answerResult === "correct"
                    ? "#15803d"
                    : answerResult === "wrong"
                      ? "#b91c1c"
                      : undefined
                  : undefined,
              color:
                selectedConceptId === option.id && answerResult
                  ? "#ffffff"
                  : undefined,
              cursor:
                isAnswering || answerResult
                  ? "default"
                  : "pointer",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
            {answerResult && (
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {answerResult === "correct"
              ? "Riktig!"
              : "Feil."}
          </div>

          <div
            style={{
              marginTop: 8,
              opacity: 0.7,
            }}
          >
            Venter på neste spørsmål...
          </div>
        </div>
      )}
    </main>
  );
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
