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
You and me baby ain't nothing but mammals
So let's do it like they do on the Discovery Channel
    `.trim(),
  };
}
