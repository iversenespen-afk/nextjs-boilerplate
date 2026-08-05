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

const { data: songs, error } = await supabase
  .from("songs")
  .select(`
    id,
    spotify_id,
    artist,
    title
  `)
  .order("id");

if (error) {
  throw new Error(error.message);
}
const { data: songMatches, error: songMatchesError } =
  await supabase
    .from("song_matches")
    .select("song_id");

if (songMatchesError) {
  throw new Error(songMatchesError.message);
}

const songIdsWithMatches = new Set(
  (songMatches ?? []).map((match) => match.song_id),
);
const matchCountBySongId = new Map();

for (const match of songMatches ?? []) {
  matchCountBySongId.set(
    match.song_id,
    (matchCountBySongId.get(match.song_id) ?? 0) + 1,
  );
}
console.log("\nQUIZLIX SONG AUDIT");
console.log("===================\n");

console.log(`Songs totalt: ${songs?.length ?? 0}`);
const missingSpotifyId = [];
const missingArtist = [];
const missingTitle = [];
const spotifyIds = new Map();
const duplicateSpotifyIds = [];
const songsWithoutMatches = [];
let songsWithOneMatch = 0;
let songsWithTwoToFourMatches = 0;
let songsWithFiveOrMoreMatches = 0;
for (const song of songs ?? []) {

  if (!song.spotify_id?.trim()) {
    missingSpotifyId.push(song.id);
  }

  if (!song.artist?.trim()) {
    missingArtist.push(song.id);
  }

  if (!song.title?.trim()) {
    missingTitle.push(song.id);
  }
if (song.spotify_id?.trim()) {
  const spotifyId = song.spotify_id.trim();

  if (spotifyIds.has(spotifyId)) {
    duplicateSpotifyIds.push({
      spotify_id: spotifyId,
      first_song_id: spotifyIds.get(spotifyId),
      duplicate_song_id: song.id,
    });
  } else {
    spotifyIds.set(spotifyId, song.id);
  }
}
  if (!songIdsWithMatches.has(song.id)) {
  songsWithoutMatches.push({
    id: song.id,
    artist: song.artist,
    title: song.title,
  });
}
  const matchCount = matchCountBySongId.get(song.id) ?? 0;

if (matchCount === 1) {
  songsWithOneMatch += 1;
} else if (matchCount >= 2 && matchCount <= 4) {
  songsWithTwoToFourMatches += 1;
} else if (matchCount >= 5) {
  songsWithFiveOrMoreMatches += 1;
}
}
console.log("\nMangler spotify_id:");
console.log(
  missingSpotifyId.length
    ? missingSpotifyId.join("\n")
    : "Ingen",
);

console.log("\nMangler artist:");
console.log(
  missingArtist.length
    ? missingArtist.join("\n")
    : "Ingen",
);

console.log("\nMangler title:");
console.log(
  missingTitle.length
    ? missingTitle.join("\n")
    : "Ingen",
);
console.log("\nDuplikate spotify_id:");

if (duplicateSpotifyIds.length) {
  for (const duplicate of duplicateSpotifyIds) {
    console.log(
      `${duplicate.spotify_id}: ` +
      `${duplicate.first_song_id} ↔ ${duplicate.duplicate_song_id}`,
    );
  }
} else {
  console.log("Ingen");
}
console.log("\nSanger uten song_matches:");

if (songsWithoutMatches.length) {
  for (const song of songsWithoutMatches) {
    console.log(
      `${song.id}: ${song.artist ?? "Ukjent artist"} – ` +
      `${song.title ?? "Ukjent tittel"}`,
    );
  }
} else {
  console.log("Ingen");
}
console.log("\nTreffstatistikk:");
console.log(
  `Sanger uten treff: ${songsWithoutMatches.length}`,
);
console.log(
  `Sanger med 1 treff: ${songsWithOneMatch}`,
);
console.log(
  `Sanger med 2–4 treff: ${songsWithTwoToFourMatches}`,
);
console.log(
  `Sanger med 5+ treff: ${songsWithFiveOrMoreMatches}`,
);
const issueCount =
  missingSpotifyId.length +
  missingArtist.length +
  missingTitle.length +
  duplicateSpotifyIds.length +
  songsWithoutMatches.length;

const totalSongs = Math.max(songs?.length ?? 0, 1);

const healthScore = Math.max(
  0,
  Math.round(
    100 - (issueCount / totalSongs) * 100,
  ),
);

console.log(`\nSong health score: ${healthScore}/100`);
console.log("\nAudit ferdig.\n");
