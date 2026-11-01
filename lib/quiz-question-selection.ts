
import { supabaseAdmin } from "@/lib/supabase-admin";

export type QuizType = "mixed" | "theme";

export type SelectedQuizQuestion = {
  songMatchId: number;
  songId: number;
  themeId: string;
};

type SelectionRequest = {
  quizType: QuizType;
  themeId?: string | null;
  questionCount: number;
};

type SongMatch = {
  id: number;
  song_id: number;
  theme_id: string;
};

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function selectQuizQuestions({
  quizType,
  themeId,
  questionCount,
}: SelectionRequest): Promise<SelectedQuizQuestion[]> {
  if (
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > 30
  ) {
    throw new Error("Ugyldig antall spørsmål.");
  }

  if (quizType !== "mixed" && quizType !== "theme") {
    throw new Error("Ugyldig quiztype.");
  }

  if (quizType === "theme" && !themeId) {
    throw new Error("Quizrunden mangler valgt tema.");
  }

  let matchQuery = supabaseAdmin
    .from("song_matches")
    .select("id, song_id, theme_id")
    .eq("verified", true);

  if (quizType === "theme") {
    matchQuery = matchQuery.eq("theme_id", themeId!);
  }

  const { data: matchRows, error: matchError } =
    await matchQuery;

  if (matchError) {
    throw new Error(matchError.message);
  }

  const matches = (matchRows ?? []) as SongMatch[];

  if (matches.length === 0) {
    throw new Error("Fant ingen verifiserte quizspørsmål.");
  }

  const { data: themeRows, error: themeError } =
    await supabaseAdmin
      .from("themes")
      .select("id, quick_play_weight");

  if (themeError) {
    throw new Error(themeError.message);
  }

  const themeWeightMap = new Map<string, number>(
    (themeRows ?? []).map((theme) => [
      theme.id,
      theme.quick_play_weight ?? 0,
    ]),
  );

  const selected: SelectedQuizQuestion[] = [];
  const usedQuestionKeys = new Set<string>();
  const themeUsage = new Map<string, number>();

  for (let index = 0; index < questionCount; index++) {
    const availableMatches = matches.filter((match) => {
      const key = `${match.song_id}|${match.theme_id}`;
      return !usedQuestionKeys.has(key);
    });

    if (availableMatches.length === 0) {
      throw new Error(
        `Kunne bare velge ${selected.length} av ${questionCount} spørsmål.`,
      );
    }

    let candidateMatches = availableMatches;

    if (quizType === "mixed") {
      const availableThemeIds = [
        ...new Set(
          availableMatches.map((match) => match.theme_id),
        ),
      ];

      const quickPlayThemeIds = availableThemeIds.filter(
        (id) => (themeWeightMap.get(id) ?? 0) > 0,
      );

      if (quickPlayThemeIds.length === 0) {
        throw new Error(
          "Fant ingen flere temaer tilgjengelig for Quick Play.",
        );
      }

      const minUsage = Math.min(
        ...quickPlayThemeIds.map(
          (id) => themeUsage.get(id) ?? 0,
        ),
      );

      const leastUsedThemeIds = quickPlayThemeIds.filter(
        (id) => (themeUsage.get(id) ?? 0) === minUsage,
      );

      const weightedThemeIds = leastUsedThemeIds.flatMap(
        (id) => {
          const weight = Math.max(
            0,
            Math.floor(themeWeightMap.get(id) ?? 0),
          );

          return Array(weight).fill(id) as string[];
        },
      );

      const selectedThemeId = randomItem(
        weightedThemeIds,
      );

      candidateMatches = availableMatches.filter(
        (match) => match.theme_id === selectedThemeId,
      );
    }

    const selectedMatch = randomItem(candidateMatches);

    const key =
      `${selectedMatch.song_id}|${selectedMatch.theme_id}`;

    usedQuestionKeys.add(key);

    themeUsage.set(
      selectedMatch.theme_id,
      (themeUsage.get(selectedMatch.theme_id) ?? 0) + 1,
    );

    selected.push({
      songMatchId: selectedMatch.id,
      songId: selectedMatch.song_id,
      themeId: selectedMatch.theme_id,
    });
  }

  return selected;
}
