import { randomFear, FEARS } from "../../lib/fears";

export const dynamic = "force-dynamic";

export default function Page() {
  const fear = randomFear();

  return (
    <main style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      padding: 24,
      fontFamily: "system-ui"
    }}>
      <div style={{ maxWidth: 700, textAlign: "center" }}>
        <div style={{ opacity: 0.5, marginBottom: 10 }}>
          FRYKT NR. {fear.id} av {FEARS.length}
        </div>

        <h1 style={{ fontSize: 42 }}>{fear.title}</h1>

        <p style={{ fontSize: 18, marginTop: 20 }}>
          {fear.description}
        </p>

        <a href="/r" style={{
          display: "inline-block",
          marginTop: 40,
          padding: "10px 16px",
          border: "1px solid #ccc",
          borderRadius: 10,
          textDecoration: "none"
        }}>
          Ny frykt
        </a>
      </div>
    </main>
  );
}
