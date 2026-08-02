import ReviewForm from "./ReviewForm";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const { data: item, error } = await supabaseAdmin
    .from("match_review_queue")
    .select(`
      id,
      spotify_id,
      artist,
      title,
      theme_id,
      theme_name,
      source_playlist,
      concept_id,
      matched_text,
      review_status
    `)
    .eq("review_status", "to_review")
    .order("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Admin-feil</h1>
        <pre>{error.message}</pre>
      </main>
    );
  }

  if (!item) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Ingen rader til behandling</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "#111118",
        color: "#fff",
        fontFamily: "system-ui",
      }}
    >
      <p style={{ opacity: 0.7 }}>Tema</p>
      <h1>{item.theme_name}</h1>

      <section
        style={{
          marginTop: 28,
          padding: 24,
          border: "1px solid #555",
          borderRadius: 16,
        }}
      >
        <h2>
          {item.artist} – {item.title}
        </h2>

        <p>Spilleliste: {item.source_playlist}</p>
        <p>Kø-ID: {item.id}</p>
        <ReviewForm
          key={item.id}
  item={item}
 suggestedConceptId=""
suggestedMatchedText=""
/>

      </section>
    </main>
  );
}
