import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const uploadUrl = `${backendUrl}/api/cv/upload`;
    const userId = request.headers.get("x-careerpilot-user-id") || "";

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") || "",
        ...(userId ? { "x-careerpilot-user-id": userId } : {}),
      },
      body: await request.arrayBuffer(),
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      if (contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { detail: errorData.detail || "Failed to upload CV" },
          { status: response.status }
        );
      }

      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        { detail: errorText || "Failed to upload CV" },
        { status: response.status }
      );
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": contentType || "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("CV upload proxy error:", error);
    return NextResponse.json(
      { detail: "Failed to connect to CV upload service" },
      { status: 500 }
    );
  }
}
