const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ระบุ root ให้ชัด กัน Next.js สับสนเมื่อมี package-lock.json อยู่ในโฟลเดอร์แม่ด้วย
  turbopack: { root: __dirname },
  outputFileTracingRoot: path.join(__dirname),
  // pg เป็น native module ฝั่งเซิร์ฟเวอร์ ไม่ต้องผ่าน bundler
  serverExternalPackages: ["pg"],
};

module.exports = nextConfig;
