import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cvId: string }> }
) {
  try {
    const { cvId } = await params;
    const userId = _request.headers.get("x-careerpilot-user-id") || "";
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/cv/${encodeURIComponent(cvId)}/sections`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      next: { revalidate: 15 },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { detail: errorData.detail || "Failed to fetch CV sections" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("CV sections proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to CV section service" },
      { status: 500 }
    );
  }
}
