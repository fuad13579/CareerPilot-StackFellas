import { NextResponse } from "next/server";

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
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  }

  return new NextResponse(await response.text(), { status: response.status });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ todoId: string }> }) {
  const { todoId } = await params;
  return forward(request, "PATCH", todoId);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ todoId: string }> }) {
  const { todoId } = await params;
  return forward(request, "DELETE", todoId);
}
