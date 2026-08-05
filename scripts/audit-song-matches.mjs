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

console.log("\nQUIZLIX SONG MATCH AUDIT");
console.log("=========================\n");

console.log(`Song matches totalt: ${matches?.length ?? 0}`);
const missingSong = [];
const missingTheme = [];
const missingConcept = [];
const missingMatchedText = [];

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

  if (!match.matched_text?.trim()) {
    missingMatchedText.push(match.id);
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
console.log("\nAudit ferdig.\n");
