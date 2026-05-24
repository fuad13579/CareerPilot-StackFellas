#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Batch create GitHub labels for the repo
repo="${1:-${GITHUB_REPO:-fuad13579/CareerPilot-StackFellas}}"

upsert_label() {
  local name="$1"
  local color="$2"
  local description="$3"

  if gh label create "$name" --repo "$repo" --color "$color" --description "$description" 2>/dev/null; then
    return 0
  fi

  gh label edit "$name" --repo "$repo" --color "$color" --description "$description"
}

upsert_label "frontend"        "1abc9c" "Frontend related"
upsert_label "backend"         "3498db" "Backend related"
upsert_label "ai-rag"          "9b59b6" "AI (RAG) features"
upsert_label "cv-upload"       "f39c12" "CV Upload feature"
upsert_label "job-agent"       "e67e22" "Job agent features"
upsert_label "fit-score"       "2ecc71" "Fit score calculations"
upsert_label "ai-assistant"    "e84393" "AI Assistant features"
upsert_label "tracker"         "636e72" "Progress tracker"
upsert_label "calendar-todo"   "00cec9" "Calendar/To-do"
upsert_label "dashboard"       "00b894" "Dashboard features"
upsert_label "docs"            "b2bec3" "Documentation"
upsert_label "demo"            "fdcb6e" "Demo related"

upsert_label "priority-high"   "e74c3c" "High priority"
upsert_label "priority-medium" "f1c40f" "Medium priority"
upsert_label "priority-low"    "2ecc71" "Low priority"

upsert_label "todo"            "95a5a6" "To do"
upsert_label "in-progress"     "2980b9" "Work in progress"
upsert_label "blocked"         "e17055" "Blocked"
upsert_label "needs-review"    "9b59b6" "Needs review"
upsert_label "done"            "27ae60" "Done"

upsert_label "feature"         "1abc9c" "New feature"
upsert_label "bug"             "e74c3c" "Bug, error, or issue"
upsert_label "enhancement"     "f1c40f" "Enhancement"
upsert_label "design"          "fd79a8" "Design"
upsert_label "refactor"        "636e72" "Refactor"
upsert_label "testing"         "0984e3" "Testing related"
upsert_label "integration"     "00b894" "Integration work"
upsert_label "deployment"      "6c5ce7" "Deployment/DevOps"
