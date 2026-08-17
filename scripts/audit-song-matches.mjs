import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Mangler SUPABASE_URL eller SUPABASE_SECRET_KEY.",
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const { data: matches, error } = await supabase
  .from("song_matches")
  .select(`
    id,
    song_id,
    theme_id,
    concept_id,
    matched_text,
    verified
  `)
  .order("id");

if (error) {
  throw new Error(error.message);
}

const { data: songs, error: songsError } = await supabase
  .from("songs")
  .select("id");

if (songsError) {
  throw new Error(songsError.message);
}

const { data: themes, error: themesError } = await supabase
  .from("themes")
  .select("id");

if (themesError) {
  throw new Error(themesError.message);
}

const { data: concepts, error: conceptsError } = await supabase
  .from("concepts")
  .select("id, concept_class");

if (conceptsError) {
  throw new Error(conceptsError.message);
}

const songIds = new Set(
  (songs ?? []).map((song) => song.id),
);

const themeIds = new Set(
  (themes ?? []).map((theme) => theme.id),
);

const conceptIds = new Set(
  (concepts ?? []).map((concept) => concept.id),
);

const conceptClassById = new Map(
  (concepts ?? []).map((concept) => [
    concept.id,
    concept.concept_class,
  ]),
);

const allowedConceptClassesByTheme = {
  us_states: ["place"],
  artists: ["person", "band"],
  towns: ["place"],
  colors: ["color"],
  elements: ["chemical_element"],
  names: ["person"],
  body_parts: ["body_part"],
  furniture: ["furniture"],
  instruments: ["instrument"],
  planets: ["planet"],
  star_wars_planets: ["fictional_planet"],
  transport: ["vehicle"],
  tree_species: ["tree"],
};

console.log("\nQUIZLIX SONG MATCH AUDIT");

console.log("\nQUIZLIX SONG MATCH AUDIT");
console.log("=========================\n");

console.log(`Song matches totalt: ${matches?.length ?? 0}`);
const missingSong = [];
const missingTheme = [];
const missingConcept = [];
const missingMatchedText = [];
const invalidSongReferences = [];
const invalidThemeReferences = [];
const invalidConceptReferences = [];
const invalidThemeConceptClasses = [];
const duplicateKeys = new Set();
const duplicateMatches = [];
for (const match of matches ?? []) {
  if (!match.song_id) {
    missingSong.push(match.id);
  }

  if (!match.theme_id) {
    missingTheme.push(match.id);
  }

  if (!match.concept_id) {
    missingConcept.push(match.id);
  }

  if (
  match.theme_id &&
  match.concept_id &&
  conceptIds.has(match.concept_id)
) {
  const conceptClass =
    conceptClassById.get(match.concept_id);

  const allowedClasses =
    allowedConceptClassesByTheme[match.theme_id];

  if (
    allowedClasses &&
    !allowedClasses.includes(conceptClass)
  ) {
    invalidThemeConceptClasses.push(
      `${match.id}: ${match.theme_id} -> ${match.concept_id} (${conceptClass})`,
    );
  }
}

  if (!match.matched_text?.trim()) {
    missingMatchedText.push(match.id);
  }
  if (
  match.song_id &&
  !songIds.has(match.song_id)
  ) {
    invalidSongReferences.push(match.id);
  }
  
  if (
    match.theme_id &&
    !themeIds.has(match.theme_id)
  ) {
    invalidThemeReferences.push(match.id);
  }
  
 if (
  match.concept_id &&
  !conceptIds.has(match.concept_id)
) {
  invalidConceptReferences.push(match.id);
}

const key = [
  match.song_id,
  match.theme_id,
  match.concept_id,
  match.matched_text?.trim().toLowerCase(),
].join("|");

if (duplicateKeys.has(key)) {
  duplicateMatches.push(match.id);
} else {
  duplicateKeys.add(key);
}
}
console.log("\nMangler song_id:");
console.log(
  missingSong.length
    ? missingSong.join("\n")
    : "Ingen",
);

console.log("\nMangler theme_id:");
console.log(
  missingTheme.length
    ? missingTheme.join("\n")
    : "Ingen",
);

console.log("\nMangler concept_id:");
console.log(
  missingConcept.length
    ? missingConcept.join("\n")
    : "Ingen",
);

console.log("\nMangler matched_text:");
console.log(
  missingMatchedText.length
    ? missingMatchedText.join("\n")
    : "Ingen",
);
console.log("\nUgyldig song_id-referanse:");
console.log(
  invalidSongReferences.length
    ? invalidSongReferences.join("\n")
    : "Ingen",
);

console.log("\nUgyldig theme_id-referanse:");
console.log(
  invalidThemeReferences.length
    ? invalidThemeReferences.join("\n")
    : "Ingen",
);

console.log("\nUgyldig concept_id-referanse:");
console.log(
  invalidConceptReferences.length
    ? invalidConceptReferences.join("\n")
    : "Ingen",
);

console.log("\nUgyldig theme / concept_class:");
console.log(
  invalidThemeConceptClasses.length
    ? invalidThemeConceptClasses.join("\n")
    : "Ingen",
);

console.log("\nDuplikate song_matches:");
console.log(
  duplicateMatches.length
    ? duplicateMatches.join("\n")
    : "Ingen",
);
console.log("\nAudit ferdig.\n");
