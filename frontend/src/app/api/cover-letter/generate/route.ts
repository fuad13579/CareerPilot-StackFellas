import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/cover-letter/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      body: await request.text(),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Cover letter proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to cover letter service" },
      { status: 500 }
    );
  }
}
