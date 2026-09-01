"use client";

import { useEffect, useState } from "react";

type Report = {
  id: number;
  created_at: string;
  report_type: string;
  comment: string | null;
  status: string;
  admin_note: string | null;
  resolved_at: string | null;
  participant_id: number;
  song_match_id: number;
  artist: string;
  title: string;
  theme_id: string;
  concept_id: string;
  display_name: string | null;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("");

  async function fetchReports() {
    try {
      const response = await fetch("/api/admin/reports", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setMessage(
          result.message ?? "Kunne ikke hente feilrapporter.",
        );
        return;
      }

      setReports(result.reports ?? []);
    } catch {
      setMessage("Kunne ikke hente feilrapporter.");
    }
  }
  async function updateReportStatus(
  reportId: number,
  status: "approved" | "rejected",
) {
  try {
    const response = await fetch(
      "/api/admin/reports/status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          status,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(
        result.message ?? "Kunne ikke oppdatere rapporten.",
      );
      return;
    }

    await fetchReports();
  } catch {
    setMessage("Kunne ikke oppdatere rapporten.");
  }
}

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <h1>Feilrapporter</h1>

      {message && (
        <p style={{ marginTop: 16 }}>{message}</p>
      )}

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gap: 16,
        }}
      >
        {reports.map((report) => (
          <div
            key={report.id}
            style={{
              border: "1px solid #444",
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              {report.artist} – {report.title}
            </div>

            <div style={{ marginTop: 8 }}>
              <strong>Tema:</strong> {report.theme_id}
            </div>

            <div>
              <strong>Aktivt svar:</strong> {report.concept_id}
            </div>

            <div>
              <strong>Rapport:</strong> {report.report_type}
            </div>

            {report.comment && (
              <div>
                <strong>Kommentar:</strong> {report.comment}
              </div>
            )}

            <div>
              <strong>Spiller:</strong>{" "}
              {report.display_name ?? `#${report.participant_id}`}
            </div>

            <div>
              <strong>Status:</strong> {report.status}
            </div>

            {report.status === "pending" && (
  <div
    style={{
      marginTop: 16,
      display: "flex",
      gap: 10,
    }}
  >
    <button
      type="button"
      onClick={() =>
        updateReportStatus(report.id, "approved")
      }
      style={{
        padding: "9px 14px",
        border: 0,
        borderRadius: 8,
        background: "#15803d",
        color: "#fff",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      Godkjenn feil
    </button>

    <button
      type="button"
      onClick={() =>
        updateReportStatus(report.id, "rejected")
      }
      style={{
        padding: "9px 14px",
        border: 0,
        borderRadius: 8,
        background: "#b91c1c",
        color: "#fff",
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      Avvis rapport
    </button>
  </div>
)}

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                opacity: 0.6,
              }}
            >
              {new Date(report.created_at).toLocaleString("nb-NO")}
            </div>
          </div>
        ))}

        {reports.length === 0 && !message && (
          <p>Ingen feilrapporter.</p>
        )}
      </div>
    </main>
  );
}
