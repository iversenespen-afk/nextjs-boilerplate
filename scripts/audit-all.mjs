import { spawnSync } from "node:child_process";

const audits = [
  { name: "Concepts", command: "scripts/audit-concepts.mjs" },
  { name: "Song matches", command: "scripts/audit-song-matches.mjs" },
];

let failed = 0;

console.log("\nQUIZLIX DATABASE AUDIT");
console.log("======================");

for (const audit of audits) {
  console.log(`\n▶ ${audit.name}`);

  const result = spawnSync(
    process.execPath,
    [audit.command],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    failed++;
    console.log(`✗ ${audit.name} feilet.`);
  } else {
    console.log(`\n▶ ${audit.name}`);
    console.log("-".repeat(audit.name.length + 2));
  }
}

console.log("\n======================");

if (failed > 0) {
  process.exit(1);
}

console.log("Alle audits fullført.");
