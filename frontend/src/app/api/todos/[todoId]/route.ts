import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

async function forward(request: Request, method: string, todoId: string) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const userId = request.headers.get("x-careerpilot-user-id") || "";
  const response = await fetch(`${backendUrl}/api/todos/${encodeURIComponent(todoId)}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-careerpilot-user-id": userId } : {}),
    },
    body: method === "DELETE" ? undefined : await request.text(),
  });

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers: NO_STORE_HEADERS });
  }

  const text = await response.text().catch(() => "");
  return NextResponse.json(
    { detail: text.trim() || response.statusText || `Failed to ${method.toLowerCase()} todo` },
    { status: response.status, headers: NO_STORE_HEADERS }
  );
}

export async function PATCH(request: Request, { params }: { params: Promise<{ todoId: string }> }) {
  const { todoId } = await params;
  return forward(request, "PATCH", todoId);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ todoId: string }> }) {
  const { todoId } = await params;
  return forward(request, "DELETE", todoId);
}
