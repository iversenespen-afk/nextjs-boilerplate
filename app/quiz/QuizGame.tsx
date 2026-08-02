"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AnswerOption = {
  id: string;
  label: string;
  correct: boolean;
};

type QuizGameProps = {
  artist: string;
  title: string;
  theme: string;
  options: AnswerOption[];
};

export default function QuizGame({
  artist,
  title,
  theme,
  options,
}: QuizGameProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const answered = selectedId !== null;

  function chooseAnswer(optionId: string) {
    // Én sjanse per spørsmål
    if (answered) return;

    setSelectedId(optionId);
  }

  function getButtonStyle(option: AnswerOption): React.CSSProperties {
    const base: React.CSSProperties = {
      border: "1px solid #666",
      borderRadius: 999,
      padding: "14px 20px",
      fontSize: 18,
      cursor: answered ? "default" : "pointer",
      background: "#202028",
      color: "#fff",
      transition: "0.15s",
    };

    if (!answered) return base;

    // Vis alle riktige svar grønt etter at spilleren har svart.
    if (option.correct) {
      return {
        ...base,
        background: "#16803a",
        borderColor: "#35d06f",
      };
    }

    // Valgt feil svar blir rødt.
    if (option.id === selectedId) {
      return {
        ...base,
        background: "#9f2020",
        borderColor: "#ff6262",
      };
    }

    return {
      ...base,
      opacity: 0.45,
    };
  }

  const selectedOption = options.find(
    (option) => option.id === selectedId,
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 28,
        fontFamily: "system-ui",
        background: "#111118",
        color: "#fff",
      }}
    >
      <p style={{ opacity: 0.7 }}>Tema</p>
      <h1 style={{ marginTop: 0 }}>{theme}</h1>

      <section
        style={{
          marginTop: 32,
          padding: 24,
          border: "1px solid #555",
          borderRadius: 16,
        }}
      >
        <p style={{ opacity: 0.7, marginBottom: 6 }}>Nå spilles</p>

        <h2 style={{ margin: 0 }}>
          {artist} – {title}
        </h2>
      </section>

      <h2 style={{ marginTop: 36 }}>
        Hvilke svar finnes i sangteksten?
      </h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          marginTop: 20,
        }}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => chooseAnswer(option.id)}
            disabled={answered}
            style={getButtonStyle(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {answered && (
        <section style={{ marginTop: 28 }}>
          <h2>
            {selectedOption?.correct ? "Riktig!" : "Feil!"}
          </h2>

          <button
            type="button"
            onClick={() => router.refresh()}
            style={{
              marginTop: 12,
              padding: "12px 18px",
              borderRadius: 10,
              border: "1px solid #777",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Nytt spørsmål
          </button>
        </section>
      )}
    </main>
  );
}
