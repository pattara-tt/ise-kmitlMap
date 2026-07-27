# walkwe — เดินกรุงเทพ

## วิธีรัน

1. ติดตั้ง [Node.js](https://nodejs.org) เวอร์ชัน 18 ขึ้นไป

2. ติดตั้ง dependency:
   ```
   npm install
   ```

3. ตั้งค่า API keys:
   - ก็อปไฟล์ `.env.local.example` เป็น `.env.local`
   - ใส่ค่า `ORS_API_KEY` (OpenRouteService — ฟรีที่ https://openrouteservice.org/dev/#/signup)
   - ใส่ค่า `TYPHOON_API_KEY` (https://opentyphoon.ai) — ถ้าไม่ใส่ แชทบอทจะใช้งานไม่ได้ แต่ส่วนอื่นยังใช้ได้ปกติ

4. รัน dev server:
   ```
   npm run dev
   ```

5. เปิดเบราว์เซอร์ไปที่ http://localhost:3000

## หมายเหตุ
- `node_modules/` ไม่ได้แนบมาด้วย ต้อง `npm install` เอง (จะได้ binary ที่ตรงกับ OS เครื่องคุณ)
- เวอร์ชันที่ทดสอบแล้ว: Next.js 14.2.5, React 18.3.1
