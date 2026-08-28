"use client";
import { Bangers } from "next/font/google";

const bangers = Bangers({
  weight: "400",
  subsets: ["latin"],
});

import { useEffect, useRef, useState } from "react";

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
  showSongInfo: boolean;
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
  const currentQuestionIdRef = useRef<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [finalRank, setFinalRank] = useState<number | null>(null);

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

    if (
  currentQuestionIdRef.current !== result.question.songMatchId
) {
  setSelectedConceptId(null);
  setAnswerResult(null);
  setPointsAwarded(null);
  setMessage("");
  currentQuestionIdRef.current = result.question.songMatchId;
}

setQuestion(result.question);
  } catch {
    // Spørsmålshenting skal ikke krasje spillersiden.
  }
}
async function fetchFinalResult(currentSessionId: number) {
  if (!participantId) return;

  try {
    const response = await fetch(
      `/api/quiz/participants?sessionId=${currentSessionId}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      return;
    }

    const sortedParticipants = [...(result.participants ?? [])].sort(
      (a, b) => b.score - a.score,
    );

    const participantIndex = sortedParticipants.findIndex(
      (participant) => participant.id === participantId,
    );

    if (participantIndex === -1) return;

    setFinalScore(sortedParticipants[participantIndex].score);
    setFinalRank(participantIndex + 1);
  } catch {
    // Sluttresultatet skal ikke krasje spillersiden.
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
    setPointsAwarded(result.result.pointsAwarded ?? 0);
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
      if (result.session.status === "finished") {
        await fetchFinalResult(currentSessionId);
      }

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
if (joinedName && sessionStatus === "finished") {
  return (
    <main
      style={{
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h1>Quizen er ferdig!</h1>

      <p
        style={{
          marginTop: 16,
          fontSize: 20,
        }}
      >
        Takk for kampen, <strong>{joinedName}</strong>.
      </p>

      {finalRank !== null && finalScore !== null && (
        <div
          style={{
            marginTop: 28,
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          {finalRank}. plass · {finalScore} poeng
        </div>
      )}
    </main>
  );
}
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
    minHeight: "100vh",
    width: "100%",
    background: "#000",
    color: "#fff",
    fontFamily:
      '"Arial Narrow", "Roboto Condensed", Arial, sans-serif',
    overflowX: "hidden",
  }}
>
      <div
        className={bangers.className}
  style={{
    width: "100%",
    boxSizing: "border-box",
    padding: "22px 18px 20px",
    borderTop: "3px solid #fff",
    borderBottom: "3px solid #fff",
    background: "#0a0a0a",
    textAlign: "center",
    textTransform: "uppercase",
    fontSize: "clamp(34px, 10vw, 72px)",
    fontWeight: 950,
    letterSpacing: "-0.04em",
    lineHeight: 0.9,
  }}
>
  {question.themeName}
</div>
<div
  style={{
    padding: "22px 16px 32px",
    maxWidth: 720,
    margin: "0 auto",
  }}
>
{question.showSongInfo && (
  <>
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
  </>
)}

<div
  style={{
    display: "grid",
    gridTemplateColumns:
  "repeat(auto-fit, minmax(110px, 1fr))",
gap: 9,
  }}
>
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => submitAnswer(option.id)}
              disabled={isAnswering || answerResult !== null}
            style={{
              padding: "11px 12px",
              border: "3px solid #8a8a8a",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: "0.02em",
              minHeight: 48,
              background:
                selectedConceptId === option.id
                  ? answerResult === "correct"
                    ? "#15803d"
                    : answerResult === "wrong"
                      ? "#b91c1c"
                      : "#101010"
                  : "#101010",
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
  <div
    style={{
      marginTop: 24,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 24,
        fontWeight: 800,
      }}
    >
      {answerResult === "correct" ? "Riktig!" : "Feil."}
    </div>

    {pointsAwarded !== null && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      marginTop: 18,
      marginBottom: 12,
    }}
  >
    <div
      style={{
        width: 190,
        height: 125,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffe600",
        color: "#000",
        clipPath:
          "polygon(50% 0%, 58% 18%, 72% 5%, 76% 25%, 96% 18%, 84% 38%, 100% 50%, 82% 58%, 94% 80%, 72% 74%, 66% 100%, 51% 82%, 35% 100%, 30% 76%, 7% 85%, 18% 61%, 0% 50%, 19% 40%, 5% 20%, 30% 26%, 35% 3%)",
        transform: "rotate(-2deg)",
      }}
    >
      <div
        className={bangers.className}
        style={{
          fontSize: 48,
          lineHeight: 0.8,
          letterSpacing: "0.03em",
        }}
      >
        +{pointsAwarded}
      </div>

      <div
        className={bangers.className}
        style={{
          marginTop: 8,
          fontSize: 25,
          lineHeight: 1,
          letterSpacing: "0.05em",
        }}
      >
        POENG!
      </div>
    </div>
  </div>
)}

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
   </div>         
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
