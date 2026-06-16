import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/calendar/events/${encodeURIComponent(eventId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { detail: errorData.detail || "Failed to fetch calendar event" },
        { status: response.status, headers: NO_STORE_HEADERS }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Calendar event get proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/calendar/events/${encodeURIComponent(eventId)}`, {
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
    console.error("Calendar event update proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500 }
    );
  }
}

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

    const rawBody = await response.text();
    let data: Record<string, unknown> = {};
    if (rawBody) {
      try {
        data = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        data = {
          detail: rawBody.trim() || response.statusText || "Failed to delete event",
        };
      }
    }

    if (!response.ok && typeof data.detail !== "string") {
      data.detail = response.statusText || "Failed to delete event";
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Calendar event delete proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500 }
    );
  }
}
