import { analyzeQueueItem } from "@/lib/assistant/analyze-queue-item";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AnalyzeRequest = {
  queueId?: number;
  spotifyId?: string;
  artist?: string;
  title?: string;
  themeId?: string;
  themeName?: string;
  concepts?: Array<{
    id: string;
    label_no: string;
    label_en?: string | null;
    concept_class?: string | null;
  }>;
};

export async function POST(request: Request) {

  let body: AnalyzeRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Ugyldig JSON i forespørselen.",
      },
      { status: 400 },
    );
  }

  const queueId = body.queueId;
  const artist = body.artist?.trim();
  const title = body.title?.trim();
  const themeId = body.themeId?.trim();
  const themeName = body.themeName?.trim();
  if (
  !queueId ||
  !artist ||
  !title ||
  !themeId ||
  !themeName
) {
  return NextResponse.json(
    {
      success: false,
      message:
        "queueId, artist, title, themeId og themeName må være med.",
      },
      { status: 400 },
    );
  }
    try {
    const suggestions = await analyzeQueueItem({
      queueId,
      spotifyId: body.spotifyId ?? "",
      artist,
      title,
      themeId,
      themeName,
      concepts: body.concepts ?? [],
    });

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Assistant analyze error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Analyse feilet.",
      },
      { status: 500 },
    );
  }
}

  
