# Project Gemini CLI Memory: AI Customer Sentiment & Auto-Reply

ไฟล์นี้เก็บข้อมูลสำคัญเกี่ยวกับสถาปัตยกรรมและการตัดสินใจในโปรเจกต์ เพื่อให้ AI ในอนาคตเข้าใจบริบทได้ทันที

## 🎯 Project Overview
ระบบวิเคราะห์ความรู้สึกลูกค้า (Sentiment Analysis) และตอบกลับอัตโนมัติ (Auto-Reply) สำหรับร้านอาหาร/คาเฟ่ โดยใช้ RAG (Retrieval-Augmented Generation) เพื่อให้ AI ตอบในสไตล์ของแบรนด์

## 🛠 Tech Stack
- **Framework:** Next.js (App Router)
- **AI Model:** Groq (Llama 3.3-70b-versatile)
- **Database (Cloud):** Vercel KV (Redis) - *ใช้แทนการเขียนไฟล์ JSON บน Vercel Host*
- **Local Analysis:** Custom Heuristics + Tokenization (lib/trainingDataset.ts)

## 🏗 Key Architectures

### 1. AI Training & Knowledge Base (RAG)
- **Problem:** เดิมเก็บข้อมูลใน `data/brand-config.json` แต่ Vercel เป็น Read-only FS ทำให้แก้ไขไม่ได้
- **Solution:** ย้ายไปใช้ **Vercel KV** ผ่าน `lib/kv-service.ts`
- **Logic:** ระบบจะอ่านจาก KV ก่อน ถ้าไม่มีจะ Fallback ไปอ่านไฟล์ JSON เริ่มต้นแล้วเซฟลง KV ให้เอง (Auto-migration)
- **Persistent Path:** ฟังก์ชัน "สอนงาน AI" จะเรียก `POST /api/knowledge-base` ซึ่งเขียนลง KV โดยตรง

### 2. Auto-Reply Logic
- **Step 1:** ดึงตัวอย่างการตอบที่เคย "สอนงาน" ไว้จาก KV (RAG Context)
- **Step 2:** ส่ง Prompt + Context + รีวิวลูกค้าไปที่ Groq API
- **Step 3:** หาก Groq พัง/ช้า ระบบมี Local Fallback ใน `lib/trainingDataset.ts` มาทำงานแทนทันที

## ⚠️ Important Constraints & Rules
- **Environment Variables:** โปรเจกต์ต้องการ `GROQ_API_KEY` และชุดตัวแปร `KV_...` จาก Upstash/Vercel KV
- **Read-only Filesystem:** ห้ามใช้ `fs.writeFileSync` ใน API Routes บน Vercel ให้ใช้ `kv-service.ts` เท่านั้น
- **Sentiment Labels:** ต้องใช้ค่ามาตรฐาน `Positive`, `Neutral`, `Negative` (Case-sensitive ในบางจุด)
- **Thai Language:** การตัดคำไทยใช้ `Intl.Segmenter` (Native) ใน `lib/trainingDataset.ts`

## 📁 File Structure Guidance
- `app/api/`: รวม API Routes ทั้งหมด (ย้ายมาใช้ KV หมดแล้ว)
- `lib/kv-service.ts`: ตัวจัดการฐานข้อมูล Cloud
- `lib/trainingDataset.ts`: หัวใจของระบบวิเคราะห์แบบ Local และ Rule-based
- `data/`: เก็บข้อมูลตั้งต้น (Default Data) เท่านั้น ไม่ควรเขียนทับขณะรันบน Vercel

## 🚀 Future Development Notes
- หากต้องการเพิ่มความแม่นยำของ AI ให้เพิ่มตัวอย่างในหน้า "สอนงาน AI" ข้อมูลจะถูกเก็บใน KV และถูกส่งไปเป็น RAG Prompt ให้ AI โดยอัตโนมัติ
- ระบบรองรับการอัปโหลดไฟล์ CSV/JSON เพื่อเทรนข้อมูลชุดใหญ่ผ่าน `api/dataset-manager/upload`
