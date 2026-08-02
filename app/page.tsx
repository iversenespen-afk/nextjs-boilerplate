import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: themes, error } = await supabase
    .from("themes")
    .select("*")
    .order("name");

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Quizlix</h1>

      {error && (
        <pre>{JSON.stringify(error, null, 2)}</pre>
      )}

      <ul>
        {themes?.map((theme) => (
          <li key={theme.id}>
            <strong>{theme.name}</strong> ({theme.id})
          </li>
        ))}
      </ul>
    </main>
  );
}
