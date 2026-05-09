# 🤖 AI Customer Sentiment & Auto-Reply System

ระบบวิเคราะห์ความรู้สึกของลูกค้าและร่างคำตอบอัตโนมัติที่คงบุคลิกของแบรนด์ (Brand Personality) โดยใช้พลังของ **Llama 3.3 (70B)** และระบบ **RAG (Retrieval-Augmented Generation)**

## 🚀 Key Features

- **Llama 3.3 (70B) Engine:** วิเคราะห์ Sentiment และร่างคำตอบภาษาไทยที่สละสลวยผ่าน Groq API
- **Dynamic RAG System:** ดึงตัวอย่างการตอบที่เคยมีอยู่แล้วของแต่ละแบรนด์มาสอน AI แบบ Real-time เพื่อคุมโทนเสียงให้แม่นยำ
- **Multi-Brand Support:** รองรับการจัดการหลายร้านพร้อมกัน (เช่น คาเฟ่, ร้านอาหารเหนือ, ร้านอาหารทะเล) โดยมีบุคลิกที่แตกต่างกัน
- **Knowledge Base Manager:** หน้าจอสำหรับ "สอนงาน AI" โดยการเพิ่ม/ลบ ตัวอย่างรีวิวและคำตอบได้โดยตรงจาก UI
- **Staff Approval Workflow:** ระบบ Dashboard ให้พนักงานตรวจสอบ แก้ไข และอนุมัติคำตอบก่อนส่งจริง

## 🛠 Setup & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   สร้างไฟล์ `.env.local` และเพิ่ม Groq API Key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```
   เข้าใช้งานได้ที่ [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

- `app/api/auto-reply`: หัวใจหลักของระบบ AI (Llama 3.3 + RAG)
- `lib/brand-manager.ts`: ระบบจัดการข้อมูลร้านค้าและการจัดกลุ่มรีวิว
- `data/brand-config.json`: คลังข้อมูล RAG (ตัวอย่างการตอบของแต่ละแบรนด์)
- `data/brand-list.json`: รายชื่อแบรนด์และบุคลิก (Persona)
- `app/page.tsx`: หน้า Dashboard หลักสำหรับจัดการทุกอย่าง

## 📘 Documentation

สำหรับรายละเอียดทางเทคนิคเชิงลึกและการบำรุงรักษาระบบ โปรดอ่าน:
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - คู่มือการพัฒนาและโครงสร้าง API

---
*โปรเจกต์นี้พัฒนาขึ้นเพื่อเพิ่มประสิทธิภาพในการตอบกลับลูกค้าอย่างมืออาชีพและรวดเร็ว*
