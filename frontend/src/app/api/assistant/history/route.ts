import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("session_id") || "";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const query = new URLSearchParams();

    if (sessionId) query.set("session_id", sessionId);
    if (userId) query.set("user_id", userId);

    const response = await fetch(`${backendUrl}/api/assistant/history?${query.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Assistant history proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to assistant history service" },
      { status: 500 }
    );
  }
}
