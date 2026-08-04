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

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "o")
    .replaceAll("å", "a")
    .replace(/[^a-z0-9]+/g, "");
}

function singularizeSimple(value) {
  if (value.endsWith("ies")) {
    return `${value.slice(0, -3)}y`;
  }

  if (
    value.endsWith("s") &&
    !value.endsWith("ss")
  ) {
    return value.slice(0, -1);
  }

  return value;
}

const { data: concepts, error: conceptsError } =
  await supabase
    .from("concepts")
    .select("id, label_no, label_en")
    .order("id");

if (conceptsError) {
  throw new Error(conceptsError.message);
}

const { data: matches, error: matchesError } =
  await supabase
    .from("song_matches")
    .select("concept_id");

if (matchesError) {
  throw new Error(matchesError.message);
}

const usageCount = new Map();

for (const match of matches ?? []) {
  usageCount.set(
    match.concept_id,
    (usageCount.get(match.concept_id) ?? 0) + 1,
  );
}

const missingNorwegian = [];
const missingEnglish = [];
const unused = [];
const duplicateGroups = new Map();

for (const concept of concepts ?? []) {
  if (!concept.label_no?.trim()) {
    missingNorwegian.push(concept.id);
  }

  if (!concept.label_en?.trim()) {
    missingEnglish.push(concept.id);
  }

  if (!usageCount.has(concept.id)) {
    unused.push(concept.id);
  }

  const candidates = [
    concept.id,
    concept.label_no,
    concept.label_en,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = singularizeSimple(
      normalize(candidate),
    );

    if (!normalized) continue;

    const group =
      duplicateGroups.get(normalized) ?? new Set();

    group.add(concept.id);
    duplicateGroups.set(normalized, group);
  }
}

const possibleDuplicates = [...duplicateGroups.entries()]
  .map(([key, ids]) => ({
    key,
    ids: [...ids],
  }))
  .filter((group) => group.ids.length > 1);

console.log("\nQUIZLIX CONCEPT AUDIT");
console.log("======================\n");

console.log(`Concepts totalt: ${concepts?.length ?? 0}`);
console.log(`Song matches totalt: ${matches?.length ?? 0}`);

console.log("\nMangler label_no:");
console.log(
  missingNorwegian.length
    ? missingNorwegian.join("\n")
    : "Ingen",
);

console.log("\nMangler label_en:");
console.log(
  missingEnglish.length
    ? missingEnglish.join("\n")
    : "Ingen",
);

console.log("\nMulige duplikater:");

if (!possibleDuplicates.length) {
  console.log("Ingen");
} else {
  for (const group of possibleDuplicates) {
    console.log(`- ${group.ids.join(" ↔ ")}`);
  }
}

console.log("\nUbrukte concepts:");
console.log(
  unused.length
    ? unused.join("\n")
    : "Ingen",
);

console.log("\nAudit ferdig.\n");
