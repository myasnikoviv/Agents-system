# scripts/openhands/agent_server.py - OpenHands Agent SDK REST Sidecar (Real LLM)
import os
import time
import uuid
import logging
import asyncio
import threading
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("openhands-sidecar")

app = FastAPI(title="OpenHands Agent SDK Sidecar")

# In-memory storage for conversations
conversations: Dict[str, Dict[str, Any]] = {}


class LLMInfo(BaseModel):
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


class AgentInfo(BaseModel):
    discriminator: str = "Agent"
    llm: LLMInfo
    tools: List[Dict[str, str]] = []


class WorkspaceInfo(BaseModel):
    working_dir: str


class MessageInfo(BaseModel):
    role: str
    content: List[Dict[str, Any]]
    run: bool = True


class ConversationRequest(BaseModel):
    agent: AgentInfo
    workspace: WorkspaceInfo
    initial_message: MessageInfo


def _run_llm_in_background(conversation_id: str, model: str, api_key: str, prompt: str):
    """Run the actual LLM call in a background thread so as not to block FastAPI."""
    try:
        provider = _resolve_provider(model)
        logger.info(f"[{conversation_id}] Running LLM: provider={provider}, model={model}")

        if provider == "openai":
            response = _call_openai(model, api_key, prompt)
        elif provider == "anthropic":
            response = _call_anthropic(model, api_key, prompt)
        elif provider == "google":
            response = _call_google(model, api_key, prompt)
        else:
            response = f"[Sidecar] Unknown provider '{provider}'. Supported: openai, anthropic, google."

        conversations[conversation_id]["events"].append({
            "role": "assistant",
            "content": response,
            "timestamp": time.time()
        })
        conversations[conversation_id]["execution_status"] = "finished"
        logger.info(f"[{conversation_id}] LLM call finished OK")
    except Exception as exc:
        logger.error(f"[{conversation_id}] LLM call failed: {exc}")
        conversations[conversation_id]["events"].append({
            "role": "assistant",
            "content": f"[Sidecar Error] LLM call failed: {str(exc)}",
            "timestamp": time.time()
        })
        conversations[conversation_id]["execution_status"] = "error"


def _resolve_provider(model: str) -> str:
    """
    Detect provider from model string prefix.
    Supported: openai/*, anthropic/*, google/*
    If no prefix, try to guess from known model names.
    """
    if model.startswith("openai/"):
        return "openai"
    if model.startswith("anthropic/"):
        return "anthropic"
    if model.startswith("google/"):
        return "google"
    # Guess from known patterns
    if "gpt" in model or "o1" in model or "o3" in model or "o4" in model:
        return "openai"
    if "claude" in model:
        return "anthropic"
    if "gemini" in model:
        return "google"
    return "openai"  # default


def _bare_model_name(model: str) -> str:
    """Strip provider prefix: openai/gpt-4o -> gpt-4o"""
    for prefix in ("openai/", "anthropic/", "google/"):
        if model.startswith(prefix):
            return model[len(prefix):]
    return model


def _call_openai(model: str, api_key: str, prompt: str) -> str:
    """Real synchronous OpenAI call."""
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed. Run: pip install openai")

    effective_key = api_key or os.environ.get("OPENAI_API_KEY", "")
    if not effective_key:
        raise RuntimeError("No OpenAI API key provided")

    client = OpenAI(api_key=effective_key)
    bare = _bare_model_name(model)

    response = client.chat.completions.create(
        model=bare,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful AI agent assistant inside a trade-bot development cockpit. "
                    "You help developers plan, analyze, and implement features in the codebase. "
                    "Be concise but thorough. Use markdown where helpful."
                )
            },
            {"role": "user", "content": prompt}
        ],
        max_tokens=2048,
        temperature=0.7,
    )
    return response.choices[0].message.content or ""


def _call_anthropic(model: str, api_key: str, prompt: str) -> str:
    """Real synchronous Anthropic call."""
    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install anthropic")

    effective_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    if not effective_key:
        raise RuntimeError("No Anthropic API key provided")

    client = anthropic.Anthropic(api_key=effective_key)
    bare = _bare_model_name(model)

    message = client.messages.create(
        model=bare,
        max_tokens=2048,
        system=(
            "You are a helpful AI agent assistant inside a trade-bot development cockpit. "
            "You help developers plan, analyze, and implement features in the codebase. "
            "Be concise but thorough. Use markdown where helpful."
        ),
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text if message.content else ""


def _call_google(model: str, api_key: str, prompt: str) -> str:
    """Real synchronous Google Gemini call via google-genai SDK (new, non-deprecated)."""
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        raise RuntimeError(
            "google-genai package not installed. Run: pip install google-genai"
        )

    effective_key = api_key or os.environ.get("GOOGLE_API_KEY", "")
    if not effective_key:
        raise RuntimeError("No Google API key provided")

    client = genai.Client(api_key=effective_key)
    bare = _bare_model_name(model)

    system_prompt = (
        "You are a helpful AI agent assistant inside a trade-bot development cockpit. "
        "You help developers plan, analyze, and implement features in the codebase. "
        "Be concise but thorough. Use markdown where helpful."
    )

    response = client.models.generate_content(
        model=bare,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=2048,
            temperature=0.7,
        ),
    )
    return response.text or ""


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/api/conversations")
async def create_conversation(req: ConversationRequest):
    conversation_id = str(uuid.uuid4())
    model = req.agent.llm.model
    api_key = req.agent.llm.api_key or ""
    logger.info(f"Creating conversation {conversation_id} with model {model}")

    # Extract prompt text
    prompt = ""
    for part in req.initial_message.content:
        if part.get("type") == "text":
            prompt += part.get("text", "")

    # Store conversation state
    conversations[conversation_id] = {
        "status": "running",
        "execution_status": "running",
        "events": [
            {
                "role": "user",
                "content": prompt,
                "timestamp": time.time()
            }
        ],
        "created_at": time.time(),
        "model": model,
    }

    # Fire LLM call in a background thread (non-blocking)
    thread = threading.Thread(
        target=_run_llm_in_background,
        args=(conversation_id, model, api_key, prompt),
        daemon=True
    )
    thread.start()

    return {"conversation_id": conversation_id, "status": "created"}


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversations[conversation_id]


@app.get("/api/conversations/{conversation_id}/events/search")
async def search_events(conversation_id: str, limit: int = 10):
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"events": conversations[conversation_id]["events"][:limit]}


if __name__ == "__main__":
    import uvicorn
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
