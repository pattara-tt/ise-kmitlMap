import { list, insert, ROLES } from "../../../lib/store";

// ลงทะเบียนเข้าใช้ระบบ · เข้าสู่ระบบด้วย E-mail
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;
  const email = String(body.email || "").trim().toLowerCase();
  const users = await list("users");

  if (action === "register") {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" }, { status: 400 });
    if (!body.password || String(body.password).length < 4) return Response.json({ ok: false, error: "รหัสผ่านต้องยาวอย่างน้อย 4 ตัวอักษร" }, { status: 400 });
    if (users.some((u) => u.email.toLowerCase() === email)) return Response.json({ ok: false, error: "อีเมลนี้ถูกใช้ลงทะเบียนแล้ว" }, { status: 409 });
    const role = ROLES[body.role] ? body.role : "user";
    // TODO(prod): แทนที่การเก็บรหัสผ่านตรงๆ ด้วย bcrypt hash ก่อนขึ้นระบบจริง
    const user = await insert("users", {
      id: "U" + String(users.length + 1).padStart(3, "0"),
      email, password: String(body.password),
      name: body.name || email.split("@")[0],
      username: body.username || email.split("@")[0],
      role, institution: body.institution || "KMITL", status: "active",
    });
    const { password, ...safe } = user;
    return Response.json({ ok: true, user: safe });
  }

  if (action === "login") {
    const user = users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== String(body.password || "")) return Response.json({ ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    if (user.status !== "active") return Response.json({ ok: false, error: "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อฝ่ายดูแลระบบ" }, { status: 403 });
    const { password, ...safe } = user;
    return Response.json({ ok: true, user: safe });
  }

  return Response.json({ ok: false, error: "action ไม่ถูกต้อง" }, { status: 400 });
}
