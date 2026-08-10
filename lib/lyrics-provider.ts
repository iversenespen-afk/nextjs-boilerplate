export type LyricsRequest = {
  spotifyId: string;
  artist: string;
  title: string;
};

export type LyricsResult = {
  lyrics: string;
  provider: string;
};

export async function getLyrics(
  request: LyricsRequest,
): Promise<LyricsResult> {
  void request;

  return {
  provider: "mock",
  lyrics: `
I was listening to Tool on the radio last night.
  `.trim(),
};
}
