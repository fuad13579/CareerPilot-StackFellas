import { NextResponse } from "next/server";

async function forward(request: Request, method: string, applicationId: string) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const userId = request.headers.get("x-careerpilot-user-id") || "";
  const response = await fetch(`${backendUrl}/api/tracker/applications/${encodeURIComponent(applicationId)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-careerpilot-user-id": userId } : {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  }

  return new NextResponse(await response.text(), { status: response.status });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return forward(request, "DELETE", applicationId);
}
