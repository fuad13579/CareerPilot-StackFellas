import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const cvId = request.nextUrl.searchParams.get("cv_id") || "";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const query = new URLSearchParams();

    if (cvId) {
      query.set("cv_id", cvId);
    }

    const response = await fetch(`${backendUrl}/api/rag/status?${query.toString()}`, {
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
    console.error("RAG status proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to RAG status service" },
      { status: 500 }
    );
  }
}
