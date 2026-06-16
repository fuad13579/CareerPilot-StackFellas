import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/calendar/events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Calendar events proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/calendar/events`, {
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
    console.error("Calendar event create proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to calendar service" },
      { status: 500 }
    );
  }
}
