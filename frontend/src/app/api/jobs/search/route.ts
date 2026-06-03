import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cvId = searchParams.get('cv_id') || '';
    const query = searchParams.get('query') || 'software internship';
    const location = searchParams.get('location') || 'remote';
    const limit = searchParams.get('limit') || '10';
    const allowDemo = searchParams.get('allow_demo') || 'false';
    const userId = request.headers.get("x-careerpilot-user-id") || "";

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const url = `${backendUrl}/api/jobs/search?cv_id=${encodeURIComponent(cvId)}&query=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&limit=${limit}&allow_demo=${allowDemo}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-careerpilot-user-id': userId } : {}),
      },
      cache: 'no-store', // Don't cache — each query must hit the backend live
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { jobs: [], error: errorData.detail || 'Failed to fetch jobs', is_live: false },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Job search API error:', error);
    return NextResponse.json(
      { jobs: [], error: 'Failed to connect to job search service', is_live: false },
      { status: 500 }
    );
  }
}
