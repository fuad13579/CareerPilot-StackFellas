# Batch create GitHub labels for the repo
$repo = if ($args.Count -gt 0) { $args[0] } elseif ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "fuad13579/CareerPilot-StackFellas" }

function Upsert-Label {
    param(
        [string]$Name,
        [string]$Color,
        [string]$Description
    )

    $output = & gh label create $Name --repo $repo --color $Color --description $Description 2>&1
    if ($LASTEXITCODE -eq 0) {
        return
    }

    if ($output -notmatch "already exists") {
        throw ($output | Out-String)
    }

    & gh label edit $Name --repo $repo --color $Color --description $Description
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to update label '$Name'"
    }
}

Upsert-Label "frontend"         "1abc9c" "Frontend related"
Upsert-Label "backend"          "3498db" "Backend related"
Upsert-Label "ai-rag"           "9b59b6" "AI (RAG) features"
Upsert-Label "cv-upload"        "f39c12" "CV Upload feature"
Upsert-Label "job-agent"        "e67e22" "Job agent features"
Upsert-Label "fit-score"        "2ecc71" "Fit score calculations"
Upsert-Label "ai-assistant"     "e84393" "AI Assistant features"
Upsert-Label "tracker"          "636e72" "Progress tracker"
Upsert-Label "calendar-todo"    "00cec9" "Calendar/To-do"
Upsert-Label "dashboard"        "00b894" "Dashboard features"
Upsert-Label "docs"             "b2bec3" "Documentation"
Upsert-Label "demo"             "fdcb6e" "Demo related"
Upsert-Label "database"         "8e44ad" "Database schema, storage, and persistence work"
Upsert-Label "docker-devops"    "2980b9" "Docker, container setup, and DevOps tasks"
Upsert-Label "security-env"     "c0392b" "Security, secrets, and environment configuration"
Upsert-Label "architecture"     "34495e" "System design and technical architecture decisions"
Upsert-Label "api-integration"  "16a085" "External or internal API integration work"
Upsert-Label "pr-review"        "9b59b6" "Pull request review and feedback needed"
Upsert-Label "final-submission" "f1c40f" "Final demo, packaging, and submission tasks"

Upsert-Label "priority-high"    "e74c3c" "High priority"
Upsert-Label "priority-medium"  "f1c40f" "Medium priority"
Upsert-Label "priority-low"     "2ecc71" "Low priority"

Upsert-Label "todo"             "95a5a6" "To do"
Upsert-Label "in-progress"      "2980b9" "Work in progress"
Upsert-Label "blocked"          "e17055" "Blocked"
Upsert-Label "needs-review"     "9b59b6" "Needs review"
Upsert-Label "done"             "27ae60" "Done"

Upsert-Label "feature"          "1abc9c" "New feature"
Upsert-Label "bug"              "e74c3c" "Bug, error, or issue"
Upsert-Label "enhancement"      "f1c40f" "Enhancement"
Upsert-Label "design"           "fd79a8" "Design"
Upsert-Label "refactor"         "636e72" "Refactor"
Upsert-Label "testing"          "0984e3" "Testing related"
Upsert-Label "integration"      "00b894" "Integration work"
Upsert-Label "deployment"       "6c5ce7" "Deployment/DevOps"
