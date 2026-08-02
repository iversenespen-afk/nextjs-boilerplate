import { supabase } from "@/lib/supabase";
import QuizGame from "./QuizGame";

export const dynamic = "force-dynamic";

type RelatedSong = {
  id: number;
  artist: string;
  title: string;
};

type RelatedTheme = {
  id: string;
  name: string;
};

type RelatedConcept = {
  id: string;
  label_no: string;
};

type MatchRow = {
  id: number;
  song_id: number;
  theme_id: string;
  concept_id: string;
  songs: RelatedSong[] | RelatedSong | null;
  themes: RelatedTheme[] | RelatedTheme | null;
  concepts: RelatedConcept[] | RelatedConcept | null;
};

function firstItem<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export default async function QuizPage() {
  const { data, error } = await supabase
    .from("song_matches")
    .select(`
      id,
      song_id,
      theme_id,
      concept_id,
      songs!song_matches_song_id_fkey (
        id,
        artist,
        title
      ),
      themes!song_matches_theme_id_fkey (
        id,
        name
      ),
      concepts!song_matches_concept_id_fkey (
        id,
        label_no
      )
    `)
    .eq("verified", true);

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Quizlix-feil</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  const rows = (data ?? []) as MatchRow[];

  if (rows.length === 0) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Ingen spørsmål funnet</h1>
      </main>
    );
  }

  /*
   * Ett spørsmål er kombinasjonen:
   * samme sang + samme tema.
   *
   * Hvis sangen inneholder både Yellow og Blue under temaet
   * Farger, blir begge markert som riktige.
   */
  const groups = new Map<string, MatchRow[]>();

  for (const row of rows) {
    const key = `${row.song_id}:${row.theme_id}`;
    const group = groups.get(key) ?? [];

    group.push(row);
    groups.set(key, group);
  }

  const availableGroups = [...groups.values()];
  const questionGroup =
    availableGroups[
      Math.floor(Math.random() * availableGroups.length)
    ];

  const firstMatch = questionGroup[0];

  const song = firstItem(firstMatch.songs);
  const theme = firstItem(firstMatch.themes);

  if (!song || !theme) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Kunne ikke lage spørsmålet</h1>
      </main>
    );
  }

  // Alle riktige konsepter i den valgte sangen og det valgte temaet.
  const correctConcepts = questionGroup
    .map((row) => firstItem(row.concepts))
    .filter((concept): concept is RelatedConcept => concept !== null);

  const correctIds = new Set(
    correctConcepts.map((concept) => concept.id),
  );

  /*
   * Finn mulige feilalternativer fra andre sanger
   * innenfor samme tema.
   */
  const themeConcepts = rows
    .filter((row) => row.theme_id === firstMatch.theme_id)
    .map((row) => firstItem(row.concepts))
    .filter((concept): concept is RelatedConcept => concept !== null);

  // Fjern duplikater.
  const uniqueThemeConcepts = [
    ...new Map(
      themeConcepts.map((concept) => [concept.id, concept]),
    ).values(),
  ];

  const distractors = shuffle(
    uniqueThemeConcepts.filter(
      (concept) => !correctIds.has(concept.id),
    ),
  );

  const wantedDistractors = Math.max(
    0,
    6 - correctConcepts.length,
  );

  const options = shuffle([
    ...correctConcepts.map((concept) => ({
      id: concept.id,
      label: concept.label_no,
      correct: true,
    })),
    ...distractors.slice(0, wantedDistractors).map((concept) => ({
      id: concept.id,
      label: concept.label_no,
      correct: false,
    })),
  ]);

  return (
  <QuizGame
    key={firstMatch.id}
    artist={song.artist}
    title={song.title}
    theme={theme.name}
    options={options}
  />
);
