"""Shared LLM provider chain for CareerPilot.

Provider priority:
1. GitHub Models API (https://models.github.ai) when GITHUB_MODELS_TOKEN is set
2. OpenRouter API (https://openrouter.ai/api) when OPENROUTER_API_KEY is set
3. None (callers should fall back to rule-based responses)

The provider exposes a single ``generate_chat_completion`` helper that callers
(assistant_service, cover_letter_service) use. Each provider is wrapped in a
try/except so a single misconfigured key never crashes the request.

No Ollama, no localhost LLM, no OpenAI/Anthropic-specific logic lives here.
"""
from __future__ import annotations

import logging
import os
from typing import Iterable

import httpx


logger = logging.getLogger(__name__)


GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class LLMUnavailableError(Exception):
    """Raised when neither configured LLM provider can satisfy a request."""


def _github_models_configured() -> bool:
    return bool(os.getenv("GITHUB_MODELS_TOKEN", "").strip())


def _openrouter_configured() -> bool:
    return bool(os.getenv("OPENROUTER_API_KEY", "").strip())


def _github_models_payload(
    messages: list[dict],
    model: str,
    max_tokens: int,
    temperature: float,
) -> dict:
    return {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }


def _openrouter_payload(
    messages: list[dict],
    model: str,
    max_tokens: int,
    temperature: float,
) -> dict:
    payload: dict = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    # Optional attribution headers are read from env so users can identify
    # their app in OpenRouter analytics if they want to.
    app_name = os.getenv("OPENROUTER_APP_NAME", "CareerPilot")
    app_url = os.getenv("OPENROUTER_APP_URL", "https://careerpilot.local")
    payload["extra_body"] = {"app_name": app_name, "app_url": app_url}
    return payload


def _post_json(url: str, headers: dict, payload: dict, timeout: float = 30.0) -> str:
    """POST a chat completion payload and return the assistant text content."""
    with httpx.Client(timeout=timeout) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

    choices = data.get("choices") or []
    if not choices:
        raise LLMUnavailableError("LLM response did not include any choices")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        raise LLMUnavailableError("LLM response did not include message content")

    return content.strip()


def _generate_with_github_models(
    messages: list[dict],
    max_tokens: int,
    temperature: float,
) -> str:
    token = os.getenv("GITHUB_MODELS_TOKEN", "").strip()
    model = os.getenv("GITHUB_MODELS_MODEL", "openai/gpt-4o").strip() or "openai/gpt-4o"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = _github_models_payload(messages, model, max_tokens, temperature)
    return _post_json(GITHUB_MODELS_URL, headers, payload)


def _generate_with_openrouter(
    messages: list[dict],
    max_tokens: int,
    temperature: float,
) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    model = os.getenv("OPENROUTER_MODEL", "openrouter/auto").strip() or "openrouter/auto"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = _openrouter_payload(messages, model, max_tokens, temperature)
    return _post_json(OPENROUTER_URL, headers, payload)


def generate_chat_completion(
    messages: list[dict],
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> str | None:
    """Generate a chat completion using the highest-priority available provider.

    Returns the assistant text on success, or ``None`` if no provider produced
    a response. Errors are logged at warning level but never raised so callers
    can always fall back to a rule-based response.
    """
    if not messages:
        return None

    if _github_models_configured():
        try:
            return _generate_with_github_models(messages, max_tokens, temperature)
        except Exception as exc:  # noqa: BLE001
            logger.warning("GitHub Models provider failed: %s", exc)

    if _openrouter_configured():
        try:
            return _generate_with_openrouter(messages, max_tokens, temperature)
        except Exception as exc:  # noqa: BLE001
            logger.warning("OpenRouter provider failed: %s", exc)

    return None


def active_provider_name() -> str | None:
    """Return the name of the provider that would be tried first, or None."""
    if _github_models_configured():
        return "github_models"
    if _openrouter_configured():
        return "openrouter"
    return None


def provider_status() -> dict:
    """Return a snapshot of provider configuration for diagnostics.

    Safe to expose: only reports whether each key is configured (boolean) and
    which provider would be tried first. Never leaks the key values.
    """
    return {
        "active": active_provider_name(),
        "github_models_configured": _github_models_configured(),
        "github_models_model": os.getenv("GITHUB_MODELS_MODEL", "openai/gpt-4o").strip() or "openai/gpt-4o",
        "openrouter_configured": _openrouter_configured(),
        "openrouter_model": os.getenv("OPENROUTER_MODEL", "openrouter/auto").strip() or "openrouter/auto",
    }
