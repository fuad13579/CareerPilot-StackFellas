import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/tracker/applications/${encodeURIComponent(applicationId)}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      body: await request.text(),
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Tracker application status proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to tracker service" },
      { status: 500 }
    );
  }
}
