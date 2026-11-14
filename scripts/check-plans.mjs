#!/usr/bin/env node
/**
 * Local prompt/plan pairing check.
 *
 * Rules:
 *   - Every docs/plans/*.prompt.txt must have a sibling <stem>.plan.md.
 *   - A plan must start with frontmatter containing plan/prompt/status.
 *   - A plan must contain the required section headings.
 *   - `_`-prefixed files are templates/examples and are skipped as prompts.
 *
 * This is intentionally not wired into CI: a prompt may exist only locally, and a missing
 * plan should guide the agent, not fail the pipeline.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const PLANS_DIR = resolve("docs/plans");
const REQUIRED_HEADINGS = [
  "## 1. Source prompt",
  "## 2. Goal and non-goals",
  "## 5. Implementation plan",
  "## 8. Verification plan",
  "## 11. Acceptance checklist",
];
const REQUIRED_FRONTMATTER_KEYS = ["plan:", "prompt:", "status:"];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(PLANS_DIR))) {
    console.log("plans:check: no docs/plans directory; nothing to check.");
    return;
  }

  const entries = await readdir(PLANS_DIR, { withFileTypes: true });
  const prompts = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".prompt.txt"))
    .filter((entry) => !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();

  const plans = new Set(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".plan.md"))
      .map((entry) => entry.name),
  );

  const errors = [];
  let checked = 0;

  for (const promptName of prompts) {
    const stem = promptName.slice(0, -".prompt.txt".length);
    const planName = `${stem}.plan.md`;
    const planPath = join(PLANS_DIR, planName);

    const promptText = await readFile(join(PLANS_DIR, promptName), "utf8");
    if (!promptText.trim()) {
      errors.push(`${promptName}: prompt file is empty`);
      continue;
    }

    if (!plans.has(planName)) {
      errors.push(`${promptName}: missing ${planName}`);
      continue;
    }

    const plan = await readFile(planPath, "utf8");
    checked += 1;

    if (!plan.trim()) {
      errors.push(`${planName}: file is empty`);
      continue;
    }

    for (const key of REQUIRED_FRONTMATTER_KEYS) {
      if (!plan.includes(key)) {
        errors.push(`${planName}: frontmatter is missing "${key}"`);
      }
    }

    const status = plan.match(/^status:\s*(\S+)\s*$/m)?.[1]?.toLowerCase();
    if (!status) {
      errors.push(`${planName}: frontmatter has no status value`);
    } else if (status === "draft") {
      console.log(`plans:check: note: ${planName} is still a draft; finalize before hand-off.`);
    } else if (!["ready", "in-progress", "implemented", "blocked", "superseded"].includes(status)) {
      errors.push(`${planName}: unsupported status "${status}"`);
    }

    for (const heading of REQUIRED_HEADINGS) {
      if (!plan.includes(heading)) {
        errors.push(`${planName}: missing section "${heading}"`);
      }
    }
  }

  // Plans without prompts are allowed (a prompt may be removed after implementation), but
  // surface them so stale plans are visible.
  for (const plan of [...plans].sort()) {
    if (plan.startsWith("_")) continue;
    const stem = plan.slice(0, -".plan.md".length);
    if (!prompts.includes(`${stem}.prompt.txt`)) {
      console.log(`plans:check: note: ${plan} has no ${stem}.prompt.txt (allowed).`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`plans:check: ${error}`);
    console.error(`plans:check: FAILED (${errors.length} issue${errors.length === 1 ? "" : "s"}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`plans:check: OK (${checked} plan${checked === 1 ? "" : "s"} checked).`);
}

main().catch((error) => {
  console.error("plans:check: unexpected error:", error);
  process.exitCode = 1;
});
