import { NextResponse } from "next/server";

const ASSISTANT_PROXY_TIMEOUT_MS = 50_000;

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSISTANT_PROXY_TIMEOUT_MS);

  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/assistant/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      body: await request.text(),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Assistant query proxy error:", error);
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { detail: "Assistant service timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { detail: "Failed to connect to assistant service" },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
