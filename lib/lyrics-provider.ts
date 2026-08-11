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
  const mockLyricsBySpotifyId: Record<string, string> = {
    // Bloodhound Gang – The Bad Touch
 "3XaBeTuIQEhTcELhfNch7Q": `
I listened to Tommy Lee all night.
`.trim(),
};
  const lyrics = mockLyricsBySpotifyId[request.spotifyId];

  if (!lyrics) {
    throw new Error(
      `Ingen mock-lyrics finnes for Spotify-ID ${request.spotifyId}.`,
    );
  }

  return {
    provider: "mock",
    lyrics,
  };
}
