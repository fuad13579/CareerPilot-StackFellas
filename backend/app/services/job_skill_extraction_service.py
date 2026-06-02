import re


# Common skills keywords to look for in job descriptions
SKILL_KEYWORDS = {
    "python", "java", "javascript", "typescript", "go", "golang",
    "rust", "c++", "c#", "ruby", "php", "swift", "kotlin", "scala",
    "react", "reactjs", "react.js", "vue", "vuejs", "angular", "nextjs",
    "next.js", "nodejs", "node.js", "express", "fastapi", "django",
    "flask", "spring", "rails", "laravel", "asp.net",
    "sql", "postgresql", "postgres", "mysql", "mongodb", "mongo",
    "redis", "elasticsearch", "cassandra", "oracle", "sqlite",
    "docker", "kubernetes", "k8s", "jenkins", "github", "gitlab",
    "aws", "amazon", "azure", "gcp", "google cloud", "heroku",
    "git", "linux", "unix", "bash", "shell",
    "machine learning", "ml", "deep learning", "neural network",
    "ai", "artificial intelligence", "nlp", "natural language",
    "data science", "data analysis", "data engineer",
    "pandas", "numpy", "scipy", "scikit-learn", "tensorflow",
    "pytorch", "keras", "spark", "hadoop", "kafka", "flink",
    "html", "css", "sass", "less", "tailwind", "bootstrap",
    "rest api", "rest", "graphql", "grpc", "microservices",
    "agile", "scrum", "jira", "confluence",
    "terraform", "ansible", "chef", "puppet", "ci/cd",
    "security", "cybersecurity", "devops", "sre",
}


# Display names for skills (for better UX)
DISPLAY_NAMES = {
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "reactjs": "React",
    "react": "React",
    "nextjs": "Next.js",
    "nodejs": "Node.js",
    "postgresql": "PostgreSQL",
    "mongodb": "MongoDB",
    "mysql": "MySQL",
    "golang": "Go",
    "c++": "C++",
    "c#": "C#",
    "ml": "Machine Learning",
    "aws": "AWS",
    "gcp": "GCP",
    "ai": "AI",
    "nlp": "NLP",
    "rest": "REST API",
    "sql": "SQL",
}


def normalize_text(text: str) -> str:
    """Normalize text for skill matching."""
    return text.lower().strip()


def extract_skills(text: str) -> list[str]:
    """
    Extract skills from job text (title, description, tags, category).
    
    Args:
        text: Combined text from job title, description, tags, etc.
    
    Returns:
        List of unique skills found in the text.
    """
    text_lower = normalize_text(text)
    found_skills: set[str] = set()
    
    for skill in SKILL_KEYWORDS:
        # Use word boundaries to avoid partial matches
        pattern = rf"\b{re.escape(skill)}\b"
        if re.search(pattern, text_lower):
            # Use display name if available, otherwise capitalize
            display_name = DISPLAY_NAMES.get(skill, skill.title())
            found_skills.add(display_name)
    
    return sorted(list(found_skills))


def extract_skills_from_job(job_data: dict) -> list[str]:
    """
    Extract skills from a job data dictionary.
    
    Checks: title, description, tags/categories, category field.
    """
    parts = []
    
    # Add title
    if job_data.get("title"):
        parts.append(job_data["title"])
    
    # Add description
    if job_data.get("description"):
        parts.append(job_data["description"])
    
    # Add tags if available (Remotive has 'tags' field)
    if job_data.get("tags"):
        tags = job_data["tags"]
        if isinstance(tags, str):
            parts.append(tags)
        elif isinstance(tags, list):
            parts.append(" ".join(tags))
    
    # Add category if available
    category = job_data.get("category")
    if category:
        if isinstance(category, str):
            parts.append(category)
        elif isinstance(category, dict):
            # Adzuna returns category as {"label": "IT Jobs", "tag": "it-jobs", ...}
            label = category.get("label") or category.get("tag") or ""
            if label:
                parts.append(str(label))
        else:
            parts.append(str(category))

    combined_text = " ".join(parts)
    return extract_skills(combined_text)