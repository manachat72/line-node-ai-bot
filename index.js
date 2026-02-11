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
//  SEND LIKE HUMAN (multi-message)
// ======================
async function sendLikeHuman(event, messages) {
  let first = true;

  for (const msg of messages) {

    if (first) {
      // --- Reply ครั้งแรก (replyToken ใช้ได้ครั้งเดียว) ---
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: msg }],
      });
      first = false;

    } else {
      // --- ข้อความลำดับถัดไป (push message) ---
      await client.pushMessage({
        to: event.source.userId,
        messages: [{ type: "text", text: msg }],
      });
    }

    // ดีเลย์แบบคนพิมพ์
    await humanDelay();
  }
}

// ======================
//  AI SYSTEM PROMPT
// ======================
const aiPrompt = `
คุณคือ "ผู้เชี่ยวชาญด้านแฟลชไดรฟ์ MP3 และระบบเครื่องเสียง" ของร้านค้าออนไลน์

# ข้อมูลสินค้า (Technical Specs):
- แฟลชไดรฟ์ของเราเป็นขนาด "4GB" (เสถียรที่สุด)
- ฟอร์แมตเป็น "FAT32"
- โฟลเดอร์เดียว (Single Folder)

# หน้าที่ของคุณ (Task):
1. วิเคราะห์ปัญหา
2. อธิบายเชิงเทคนิค
3. วิเคราะห์สาเหตุเครื่องเสียงไม่อ่าน
4. แนะนำตรวจสอบเบื้องต้น

# ขั้นตอนการรับเคลม:
"ทางร้านต้องขออภัย... (ข้อความเคลมตามที่กำหนดไว้ของพี่)"

# กฎเหล็ก:
- ห้ามให้ลูกค้าไปส่งที่สาขา
- พูดสุภาพ มืออาชีพ
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

        // ส่ง 2–3 ข้อความแบบคนคุยจริง
        await sendLikeHuman(event, [
          "ขออนุญาตตรวจสอบให้นะครับพี่… 😊",
          reply,
          "ถ้าพี่มีอะไรเพิ่มเติม ทักผมได้เลยนะครับ ❤️"
        ]);
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
