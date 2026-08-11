export type LyricsRequest = {
  spotifyId: string;
  artist: string;
  title: string;
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
Search the web for reliable information about the lyrics of this song:

Artist: ${request.artist}
Title: ${request.title}

The purpose is a music quiz.

Do NOT reproduce the full lyrics.
Do NOT return long lyric passages.

Return only a compact evidence block containing short individual words,
names or very short phrases that reliable web results indicate actually
occur in the song lyrics.

Important:
- Do not guess from the song title.
- Do not guess from the artist name.
- Prefer evidence supported by actual lyric/search sources.
- Keep the total response short.
- One candidate per line.
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
  const provider =
    process.env.LYRICS_PROVIDER ?? "mock";

  if (provider === "web") {
    return getWebLyricsEvidence(request);
  }

  return getMockLyrics(request);
}
