// พร็อกซีทุก /api/* จาก frontend ไปยัง backend service
// ใช้ route handler แทน next.config rewrites เพราะ rewrites ถูกคำนวณตอน build
// ทำให้เปลี่ยน BACKEND_URL ตอนรันไม่ได้ — ตัวนี้อ่าน env ตอน request จริง
export const dynamic = "force-dynamic";

const BACKEND_URL = () => process.env.BACKEND_URL || "http://localhost:4000";

async function forward(req, path) {
  const url = new URL(req.url);
  const target = `${BACKEND_URL()}/api/${path.join("/")}${url.search}`;

  const sessionId = req.headers.get("x-session-id");
  const accept = req.headers.get("accept");
  const init = {
    method: req.method,
    cache: "no-store",
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
      ...(accept ? { Accept: accept } : {}),
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    // Keep the upstream body streaming. Calling res.text() here would buffer
    // Server-Sent Events until the connection closes and break real-time updates.
  };

  try {
    const res = await fetch(target, init);
    const headers = new Headers();
    for (const name of ["content-type", "cache-control", "x-accel-buffering", "retry-after"]) {
      const value = res.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch (e) {
    return Response.json({ ok: false, error: "เชื่อมต่อ backend ไม่ได้" }, { status: 502 });
  }
}

export async function GET(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}
export async function POST(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}
export async function PATCH(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}
export async function DELETE(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}