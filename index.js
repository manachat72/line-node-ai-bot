import express from "express";
import { messagingApi, middleware } from "@line/bot-sdk";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const { MessagingApiClient } = messagingApi;

const app = express();

// ⚠️ หมายเหตุ: ไม่ควรใช้ app.use(express.json()) แบบ Global 
// เพราะจะไปตีกับ middleware ของ LINE ที่ต้องการ raw body เพื่อตรวจสอบความปลอดภัย

// ======================
//  LINE CONFIG
// ======================
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// ✅ สร้าง Client แบบใหม่ (v10)
const client = new MessagingApiClient(lineConfig);

// ======================
//  OPENAI CONFIG
// ======================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI SYSTEM PROMPT
const aiPrompt = `
คุณคือพนักงานตอบแชทร้านค้าออนไลน์
ตอบสุภาพ กระชับ เข้าใจง่าย เหมือนพนักงานมืออาชีพ
`;

// ======================
//  WEBHOOK
// ======================
// ✅ เรียกใช้ middleware(lineConfig) โดยตรง (ไม่ต้องมี line. นำหน้า)
app.post("/webhook", middleware(lineConfig), async (req, res) => {
  
  // การตอบกลับ 200 OK ทันที เพื่อป้องกัน LINE แจ้งเตือน timeout (Optional แต่แนะนำ)
  // res.sendStatus(200); 

  try {
    const events = req.body.events;
    
    // ถ้าไม่มี event ส่งมา ให้จบการทำงาน
    if (!events || events.length === 0) {
        return res.sendStatus(200);
    }

    console.log("Webhook received with events:", events.length);

    for (let event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        console.log("User said:", userMessage);

        // ======================
        // OPENAI RESPONSE
        // ======================
        const ai = await openai.chat.completions.create({
          model: "gpt-4o-mini", // ✅ แก้ชื่อโมเดลให้ถูกต้อง (หรือใช้ gpt-3.5-turbo)
          messages: [
            { role: "system", content: aiPrompt },
            { role: "user", content: userMessage },
          ],
        });

        const reply = ai.choices[0].message.content;
        console.log("AI reply:", reply);

        // ======================
        // SEND REPLY TO LINE (v10 Syntax)
        // ======================
        // ใน v10 ต้องส่งเป็น Object ใหญ่ที่มี replyToken และ messages
        await client.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: reply,
            },
          ],
        });
      }
    }

    // ส่ง status 200 กลับไปบอก LINE ว่าได้รับของแล้ว
    return res.sendStatus(200);

  } catch (error) {
    console.error("Error:", error);
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