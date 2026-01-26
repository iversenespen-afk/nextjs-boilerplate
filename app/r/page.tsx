import { randomFear, FEARS } from "../../lib/fears";

export const dynamic = "force-dynamic";

export default function Page() {
  const fear = randomFear();

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          textAlign: "left",
          margin: "0 auto",
          lineHeight: 1.6,
        }}
      >
        <div style={{ opacity: 0.6, marginBottom: 10 }}>
          FRYKT NR. {fear.id} av {FEARS.length}
        </div>

        <h1 style={{ fontSize: 42, margin: 0 }}>{fear.title}</h1>

        <p
          style={{
            fontSize: 20,
            marginTop: 24,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          }}
        >
          {fear.description}
        </p>

        <a
          href="/r"
          style={{
            display: "inline-block",
            marginTop: 40,
            padding: "10px 16px",
            border: "1px solid #ccc",
            borderRadius: 10,
            textDecoration: "none",
          }}
        >
          Ny frykt
        </a>
      </div>
    </main>
  );
}
