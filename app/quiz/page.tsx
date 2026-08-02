import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
const { data: matches, error } = await supabase
.from("song_matches")
.select(`
  id,
  matched_text,
  verified,
  songs!song_matches_song_id_fkey (
    artist,
    title
  ),
  themes!song_matches_theme_id_fkey (
    name
  ),
  concepts!song_matches_concept_id_fkey (
    label_no
  )
`)
.order("id");
  console.dir({ matches, error }, { depth: null });

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Quizlix-feil</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: 32 }}>
      <h1>Quizlix – første spørsmål</h1>

 {matches?.map((match) => {
  const song = Array.isArray(match.songs)
    ? match.songs[0]
    : match.songs;

  const theme = Array.isArray(match.themes)
    ? match.themes[0]
    : match.themes;

  const concept = Array.isArray(match.concepts)
    ? match.concepts[0]
    : match.concepts;

  return (
    <article
      key={match.id}
      style={{
        marginTop: 24,
        padding: 20,
        border: "1px solid #555",
        borderRadius: 12,
      }}
    >
      <h2>
        {song?.artist} – {song?.title}
      </h2>

      <p>
        Tema: <strong>{theme?.name}</strong>
      </p>

      <p>
        Riktig svar: <strong>{concept?.label_no}</strong>
      </p>

      <p style={{ opacity: 0.7 }}>
        Funnet i teksten som: «{match.matched_text}»
      </p>
    </article>
  );
})}
