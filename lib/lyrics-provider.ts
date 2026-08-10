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
    "5EYdTPdJD74r9EVZBztqGG": `
I was listening to Tool on the radio last night.
    `.trim(),

    // D.D.E. – Vinsjan på kaia
    "3XaBeTuIQEhTcELhfNch7Q": `
I heard Dr. Dre, Eminem, Tommy Lee and Tom Green on the radio.
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
