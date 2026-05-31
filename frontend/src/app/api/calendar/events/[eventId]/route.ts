import { NextResponse } from "next/server";

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/calendar/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Calendar event delete proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500 }
    );
  }
}
