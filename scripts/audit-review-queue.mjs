import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Mangler SUPABASE_URL eller SUPABASE_SECRET_KEY.",
  );
}

const supabase = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const { data: queueItems, error } = await supabase
  .from("match_review_queue")
  .select(`
    id,
    spotify_id,
    artist,
    title,
    theme_id,
    concept_id,
    matched_text,
    verified,
    review_status,
    reviewed_at
  `)
  .order("id");

if (error) {
  throw new Error(error.message);
}

console.log("\nQUIZLIX REVIEW QUEUE AUDIT");
console.log("===========================\n");

console.log(
  `Review queue totalt: ${queueItems?.length ?? 0}`,
);
const statusCounts = {
  to_review: 0,
  approved: 0,
  rejected: 0,
  skipped: 0,
  other: 0,
};
const invalidStatuses = [];
const missingStatuses = [];
const approvedNotVerified = [];
const approvedWithoutReviewedAt = [];
const rejectedWithoutReviewedAt = [];
const skippedWithoutReviewedAt = [];
const approvedWithoutConcept = [];
const approvedWithoutMatchedText = [];
const duplicateQueueKeys = new Set();
const duplicateQueueItems = [];

for (const item of queueItems ?? []) {
  if (!item.review_status?.trim()) {
  missingStatuses.push(item.id);
} else if (item.review_status in statusCounts) {
  statusCounts[item.review_status] += 1;
} else {
  statusCounts.other += 1;
  invalidStatuses.push({
    id: item.id,
    status: item.review_status,
  });
}
  if (
  item.review_status === "approved" &&
  item.verified !== true
) {
  approvedNotVerified.push(item.id);
}

if (
  item.review_status === "approved" &&
  !item.reviewed_at
) {
  approvedWithoutReviewedAt.push(item.id);
}
  if (
  item.review_status === "rejected" &&
  !item.reviewed_at
) {
  rejectedWithoutReviewedAt.push(item.id);
}

if (
  item.review_status === "skipped" &&
  !item.reviewed_at
) {
  skippedWithoutReviewedAt.push(item.id);
}
  if (
  item.review_status === "approved" &&
  !item.concept_id?.trim()
) {
  approvedWithoutConcept.push(item.id);
}

if (
  item.review_status === "approved" &&
  !item.matched_text?.trim()
) {
  approvedWithoutMatchedText.push(item.id);
}
  const duplicateKey = [
  item.spotify_id,
  item.theme_id,
].join("|");

if (duplicateQueueKeys.has(duplicateKey)) {
  duplicateQueueItems.push(item.id);
} else {
  duplicateQueueKeys.add(duplicateKey);
}
}
console.log("\nStatusfordeling:");
console.log(`to_review: ${statusCounts.to_review}`);
console.log(`approved: ${statusCounts.approved}`);
console.log(`rejected: ${statusCounts.rejected}`);
console.log(`skipped: ${statusCounts.skipped}`);
console.log(`andre statuser: ${statusCounts.other}`);
console.log("\nMangler review_status:");
console.log(
  missingStatuses.length
    ? missingStatuses.join("\n")
    : "Ingen",
);

console.log("\nUgyldige review_status:");
if (invalidStatuses.length) {
  for (const item of invalidStatuses) {
    console.log(`${item.id}: ${item.status}`);
  }
} else {
  console.log("Ingen");
}
console.log("\nGodkjente rader uten verified = true:");
console.log(
  approvedNotVerified.length
    ? approvedNotVerified.join("\n")
    : "Ingen",
);

console.log("\nGodkjente rader uten reviewed_at:");
console.log(
  approvedWithoutReviewedAt.length
    ? approvedWithoutReviewedAt.join("\n")
    : "Ingen",
);
console.log("\nAvviste rader uten reviewed_at:");
console.log(
  rejectedWithoutReviewedAt.length
    ? rejectedWithoutReviewedAt.join("\n")
    : "Ingen",
);

console.log("\nHoppede rader uten reviewed_at:");
console.log(
  skippedWithoutReviewedAt.length
    ? skippedWithoutReviewedAt.join("\n")
    : "Ingen",
);
console.log("\nGodkjente rader uten concept_id:");
console.log(
  approvedWithoutConcept.length
    ? approvedWithoutConcept.join("\n")
    : "Ingen",
);

console.log("\nGodkjente rader uten matched_text:");
console.log(
  approvedWithoutMatchedText.length
    ? approvedWithoutMatchedText.join("\n")
    : "Ingen",
);
console.log("\nDuplikate rader i review-køen:");
console.log(
  duplicateQueueItems.length
    ? duplicateQueueItems.join("\n")
    : "Ingen",
);
console.log("\nAudit ferdig.\n");
