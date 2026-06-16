import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const userId = request.headers.get("x-careerpilot-user-id") || "";
    const response = await fetch(`${backendUrl}/api/todos/stats`, {
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
        { detail: errorData.detail || "Failed to fetch todo stats" },
        { status: response.status, headers: NO_STORE_HEADERS }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Todo stats proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to todo service" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
