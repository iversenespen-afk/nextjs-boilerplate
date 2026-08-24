export type LyricsRequest = {
  spotifyId: string;
  artist: string;
  title: string;
  themeId: string;
  themeName: string;
};

export type LyricsResult = {
  lyrics: string;
  provider: string;
};

function getMockLyrics(
  request: LyricsRequest,
): LyricsResult {
  const mockLyricsBySpotifyId: Record<string, string> = {
    // Legg testmockene våre her ved behov.
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

async function getWebLyricsEvidence(
  request: LyricsRequest,
): Promise<LyricsResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY mangler.");
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        tools: [
          {
            type: "web_search",
            search_context_size: "low",
          },
        ],
        tool_choice: "required",
        input: `
Find lyric evidence for this song.

Artist: ${request.artist}
Title: ${request.title}
Quiz theme: ${request.themeName}

Return only words or very short phrases that:
- actually occur in the lyrics
- are relevant to the quiz theme
- are supported by lyric evidence

Do not infer from the song title or artist name.
Do not explain.
One candidate per line.
Maximum 15 candidates.
        `.trim(),
      }),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error?.message ??
        "Web-søk etter lyrics feilet.",
    );
  }

  const message = result.output?.find(
    (item: { type?: string }) =>
      item.type === "message",
  );

  const outputContent = message?.content?.find(
    (item: { type?: string }) =>
      item.type === "output_text",
  );

  const evidence = outputContent?.text?.trim();

  if (!evidence) {
    throw new Error(
      `Fant ingen web-evidence for ${request.artist} – ${request.title}.`,
    );
  }

  return {
    provider: "web",
    lyrics: evidence,
  };
}

export async function getLyrics(
  request: LyricsRequest,
): Promise<LyricsResult> {
  const provider = process.env.LYRICS_PROVIDER;

  if (!provider) {
    throw new Error(
      "LYRICS_PROVIDER mangler. Sett den eksplisitt til 'web' eller 'mock'.",
    );
  }

  if (provider === "web") {
    return getWebLyricsEvidence(request);
  }

  if (provider === "mock") {
    if (
      process.env.VERCEL_ENV === "production" ||
      process.env.NODE_ENV === "production"
    ) {
      throw new Error(
        "LYRICS_PROVIDER=mock er ikke tillatt i produksjon.",
      );
    }

    return getMockLyrics(request);
  }

  throw new Error(
    `Ukjent LYRICS_PROVIDER: ${provider}`,
  );
}
