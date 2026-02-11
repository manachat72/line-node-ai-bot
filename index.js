import express from "express";
import { messagingApi, middleware } from "@line/bot-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const { MessagingApiClient } = messagingApi;
const app = express();

// ======================
//  LINE CONFIG
// ======================
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// LINE Client v10
const client = new MessagingApiClient(lineConfig);

// ======================
//  OPENAI CONFIG
// ======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ======================
//  HUMAN-LIKE DELAY
// ======================
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function humanDelay() {
  const delay = 500 + Math.random() * 500; // 0.5–1s
  await wait(delay);
}

// ======================
//  AI SYSTEM PROMPT
// ======================
const aiPrompt = `
คุณคือ "ผู้เชี่ยวชาญด้านแฟลชไดรฟ์ MP3 และระบบเครื่องเสียง" ของร้านค้าออนไลน์

# ข้อมูลสินค้า (Technical Specs):
- แฟลชไดรฟ์ของเราเป็นขนาด "4GB" (ขนาดมาตรฐานที่เสถียรที่สุดสำหรับรถยนต์และลำโพงทุกรุ่น)
- ฟอร์แมตเป็น "FAT32" เรียบร้อยแล้ว
- โครงสร้างไฟล์: "โฟลเดอร์เดียว" (Single Folder)

# หน้าที่ของคุณ (Task):
1. วิเคราะห์ปัญหาให้ละเอียด
2. อธิบายความรู้เชิงเทคนิค
3. ช่วยลูกค้าวิเคราะห์สาเหตุว่าทำไมเครื่องเสียงอาจไม่อ่าน
4. แนะนำขั้นตอนตรวจสอบเบื้องต้น

# ขั้นตอนการรับเคลม (Claim Process):
หากลูกค้ายืนยันว่าใช้งานไม่ได้ ให้ตอบด้วยข้อความนี้เท่านั้น:

"ทางร้านต้องขออภัยในความไม่สะดวกครับ ในกรณีที่สินค้ามีปัญหาจริง เรามีบริการเคลมแบบพิเศษเพื่อดูแลลูกค้าครับ

1. รบกวนลูกค้ากรอกแจ้งรายละเอียดที่ลิงก์นี้: https://forms.gle/CCpErRw3L1evSYBfA
2. หลังจากกรอกเสร็จ **รอรับโทรศัพท์จาก Kerry** ได้เลยครับ ทางร้านจะนัดหมายให้ Kerry เข้าไปรับสินค้าคืนถึงหน้าบ้านลูกค้า (Door-to-Door)
3. ลูกค้าไม่ต้องเสียค่าส่ง ไม่ต้องจ่าหน้าซอง แค่แพ็คของรอไว้ เดี๋ยวเจ้าหน้าที่เข้าไปจัดการให้ครับ"

# กฎเหล็ก:
- ห้ามแนะนำให้ลูกค้าไปส่งของเอง
- ตอบแบบผู้เชี่ยวชาญ สุภาพ มืออาชีพ
`;

// ======================
//  WEBHOOK
// ======================
app.post("/webhook", middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    if (!events || events.length === 0) {
      return res.sendStatus(200);
    }

    for (let event of events) {
      if (event.type === "message" && event.message.type === "text") {

        const userMessage = event.message.text;

        // ---- AI CALL ----
        const ai = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: aiPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
        });

        const reply = ai.choices[0].message.content;

        // ---- HUMAN DELAY ----
        await humanDelay();

        // ---- SEND REPLY ----
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            { type: "text", text: reply }
          ],
        });
      }
    }

    return res.sendStatus(200);

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).end();
  }
});

// ======================
//  START SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BOT STARTED on port ${PORT}`);
});
