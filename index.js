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

// LINE Client v10 (ถูกต้อง)
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
  const delay = 500 + Math.random() * 500;
  await wait(delay);
}

// ======================
//  AI SYSTEM PROMPT
// ======================
const aiPrompt = `
คุณคือ "ผู้เชี่ยวชาญด้านแฟลชไดรฟ์ MP3 และระบบเครื่องเสียง" ของร้านค้าออนไลน์
            
            # ข้อมูลสินค้า (Technical Specs):
            - แฟลชไดรฟ์ของเราเป็นขนาด "4GB" (ขนาดมาตรฐานที่เสถียรที่สุดสำหรับรถยนต์และลำโพงทุกรุ่น)
            - ฟอร์แมตเป็น "FAT32" เรียบร้อยแล้ว (Format มาตรฐานสากล)
            - โครงสร้างไฟล์: "โฟลเดอร์เดียว" (Single Folder) ไม่มีการซ้อนโฟลเดอร์ เพื่อให้เครื่องเสียงอ่านง่ายที่สุด
            
            # หน้าที่ของคุณ (Task):
            1. วิเคราะห์ปัญหา: เมื่อลูกค้าแจ้งว่า "ฟังไม่ได้" หรือ "ไม่อ่าน" ให้สอบถามก่อนว่าใช้กับ "เครื่องเสียงรถรุ่นไหน" หรือ "ลำโพงยี่ห้ออะไร"
            2. ให้ความรู้เชิงเทคนิค: 
               - อธิบายว่าสเปก FAT32 แบบโฟลเดอร์เดียว เป็นสเปกที่ "เข้ากันได้ดีที่สุด" แล้ว
               - ปัญหาที่พบบ่อยคือ: ช่องเสียบ USB หลวม, ยังไม่ได้กดเปลี่ยนโหมด (Source) เป็น USB, หรือเครื่องเสียงรถยนต์รุ่นเก่ามากๆ อาจมีปัญหาเรื่องฝุ่นในช่องเสียบ
               - แนะนำให้ลูกค้าลองนำไปเสียบกับ "คอมพิวเตอร์" เพื่อเช็คว่าไฟล์เสียจริงหรือไม่
            
            # ขั้นตอนการรับเคลม (Claim Process):
            หากลูกค้าลองแก้ไขเบื้องต้นแล้วยังใช้งานไม่ได้ หรือยืนยันว่าสินค้าเสียจริง ให้จบการสนทนาด้วยข้อความฟอร์มนี้เท่านั้น:
            
            "ทางร้านต้องขออภัยในความไม่สะดวกครับ ในกรณีที่สินค้ามีปัญหาจริง เรามีบริการเคลมแบบพิเศษเพื่อดูแลลูกค้าครับ
            
            1. รบกวนลูกค้ากรอกแจ้งรายละเอียดที่ลิงก์นี้: https://forms.gle/CCpErRw3L1evSYBfA
            2. หลังจากกรอกเสร็จ **รอรับโทรศัพท์จาก Kerry** ได้เลยครับ ทางร้านจะนัดหมายให้ Kerry เข้าไปรับสินค้าคืนถึงหน้าบ้านลูกค้า (Door-to-Door)
            3. ลูกค้าไม่ต้องเสียค่าส่ง ไม่ต้องจ่าหน้าซอง แค่แพ็คของรอไว้ เดี๋ยวเจ้าหน้าที่เข้าไปจัดการให้ครับ"
            
            # กฎเหล็ก:
            - ห้ามแนะนำให้ลูกค้าไปส่งของเองที่สาขา (เพราะเราใช้บริการเข้ารับ)
            - ให้ตอบด้วยน้ำเสียงสุภาพ เป็นมืออาชีพ และมีความรู้จริงเรื่องเครื่องเสียง
          `
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.7, // ระดับความสร้างสรรค์ (0.7 กำลังดีสำหรับงานบริการ)
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error("OpenAI Error:", error);
    return "ขออภัยครับ ระบบขัดข้องชั่วคราว รบกวนทักหาแอดมินโดยตรงได้เลยครับ";
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
        });

        const reply = ai.choices[0].message.content;

        // ---- HUMAN DELAY ----
        await humanDelay();

        // ---- REPLY TO LINE ----
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

