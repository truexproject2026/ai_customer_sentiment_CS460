import { NextResponse } from "next/server";
import { analyzeWithTrainingData, buildReplyFromTrainingData } from "@/lib/trainingDataset";
import { getVenueById, type Venue } from "@/lib/brand-manager";
import { getBrandConfig } from "@/lib/kv-service";
import menuData from "@/data/menu.json";

/**
 * ดึงตัวอย่างการตอบที่เคยมีอยู่แล้วของร้าน (RAG - Retrieval-Augmented Generation)
 * เพื่อส่งเป็นตัวอย่างให้ AI เรียนรู้สไตล์การตอบของร้านนั้นๆ
 */
async function getVenueSpecificExamples(venueId: string): Promise<string> {
  try {
    const data = await getBrandConfig();
    const examples = data.brands[venueId]?.examples || [];
    if (examples.length === 0) return "";
    
    return "\nนี่คือตัวอย่างการตอบที่ถูกต้องของร้านนี้ (RAG):\n" + 
      examples.slice(0, 5).map((ex: any) => `Review: ${ex.review}\nReply: ${ex.reply}`).join("\n\n");
  } catch (error) {
    console.error("Error loading RAG examples:", error);
    return "";
  }
}

/** โครงสร้างผลลัพธ์จาก AI (LLM) */
type LlmResult = {
  sentiment?: "Positive" | "Neutral" | "Negative"; // ความรู้สึก
  aspect?: string;      // หัวข้อที่พูดถึง
  reply?: string;       // ข้อความตอบกลับ
  confidence?: number;  // ค่าความเชื่อมั่น
  reasoning?: string;   // เหตุผลประกอบการตัดสินใจ
  error?: string;       // ข้อผิดพลาด (ถ้ามี)
};

/** ปรับเปลี่ยนคำบางคำให้ดูสุภาพและเป็นกันเองตามสไตล์ร้าน */
function enforceReplyStyle(comment: string, reply: string): string {
  return reply
    .replace(/ท่าน/g, "คุณลูกค้า")
    .replace(/ลูกค้าท่าน/g, "คุณลูกค้า")
    .replace(/\[เมนู\]/g, "")
    .trim();
}

/** 
 * ฟังก์ชันช่วยแปลงข้อความจาก AI ให้เป็น JSON อย่างปลอดภัย 
 * เนื่องจากบางครั้ง AI อาจตอบมี Markdown หรือข้อความอธิบายติดมาด้วย
 */
function safeJsonParse(text: string): LlmResult | null {
  if (!text) return null;
  // ลบ Code Block Markdown ออกถ้ามี
  const cleaned = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(cleaned) as LlmResult;
  } catch {
    // ถ้า Parse ไม่ได้ พยายามค้นหาเฉพาะส่วนที่เป็น { ... }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as LlmResult;
    } catch {
      // กรณีสุดท้าย: พยายามดึงข้อมูลด้วย Regex ถ้าโครงสร้าง JSON พังจริงๆ
      try {
        const replyMatch = cleaned.match(/PLAIN_REPLY:\s*([\s\S]*)$/i) || cleaned.match(/Reply:\s*([\s\S]*)$/i);
        if (replyMatch && replyMatch[1]) {
          const extracted = replyMatch[1].trim();
          const stop = extracted.search(/\n\s*\n/);
          const replyText = stop > 0 ? extracted.slice(0, stop).trim() : extracted;
          return { reply: replyText, reasoning: "Extracted reply from non-JSON LLM output", confidence: 0.6 };
        }
      } catch (e) {}
      return null;
    }
  }
}

/** สร้างข้อความอธิบายข้อมูลร้านค้าสำหรับส่งให้ AI */
function buildVenueBlock(venue: Venue): string {
  return `ร้านที่กำลังตอบ: ${venue.name} (${venue.area})
แนวร้าน: ${venue.tagline}
บุคลิกแบรนด์: ${venue.personality}
โทนการตอบ: ${venue.tone}`;
}

/** ปรับเปลี่ยนค่า Sentiment ให้เป็นภาษาอังกฤษมาตรฐานเสมอ */
function normalizeSentiment(sentiment?: string): "Positive" | "Neutral" | "Negative" {
  if (!sentiment) return "Neutral";
  const s = sentiment.toLowerCase();
  if (s.includes("pos") || s.includes("บวก") || s.includes("ดีใจ") || s.includes("ประทับใจ")) return "Positive";
  if (s.includes("neg") || s.includes("ลบ") || s.includes("เสียใจ") || s.includes("แย่") || s.includes("ผิดหวัง")) return "Negative";
  return "Neutral";
}

/** 
 * ฟังก์ชันเรียกใช้งาน AI (Groq Llama 3) เพื่อร่างคำตอบ 
 */
async function generateReplyWithLlm(comment: string, venue?: Venue): Promise<LlmResult | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return { error: "ไม่พบ GROQ_API_KEY ในระบบ (ตรวจสอบไฟล์ .env)" };
  }

  // ดึงข้อมูลบริบทของร้าน (RAG)
  const ragExamples = venue ? await getVenueSpecificExamples(venue.id) : "";
  const venueBlock = venue ? buildVenueBlock(venue) : "บทบาท: แอดมินร้านอาหาร/คาเฟ่มืออาชีพ";

  // คำสั่งที่ส่งให้ AI (System Instruction)
  const systemInstruction = `คุณคือเจ้าของร้านผู้เชี่ยวชาญ 
หน้าที่: วิเคราะห์รีวิวลูกค้าและร่างคำตอบที่แสดงถึงความใส่ใจ (Empathy) 
กฎเหล็ก:
1. ตอบกลับด้วยความจริงใจ: หากชมให้ขอบคุณ หากติให้ขอโทษและระบุแนวทางแก้ไข
2. โฟกัสที่ธุรกิจ: แม้ลูกค้าจะคุยเล่นหรือพูดนอกเรื่อง (เช่น ชมพนักงานว่าสวย) ให้ตอบในประเด็นหลักของร้าน
3. ภาษาสละสลวย: ใช้ภาษาไทยที่เป็นธรรมชาติ ไม่เป็นหุ่นยนต์
4. JSON เท่านั้น: ตอบในรูปแบบ {"sentiment": "...", "aspect": "...", "confidence": ..., "reply": "...", "reasoning": "..."}
5. ค่าใน "sentiment" ต้องเป็นภาษาอังกฤษเท่านั้น: เลือกจาก ["Positive", "Neutral", "Negative"]
6. ห้ามมโนเมนูที่ลูกค้าไม่ได้พูดถึง`;

  const userPrompt = `${venueBlock}
${ragExamples}

คอมเมนต์ลูกค้า: "${comment}"`;

  try {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // ใช้โมเดล Llama 3.3 ขนาด 70B
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3, // ใช้ค่าต่ำเพื่อให้คำตอบแม่นยำและไม่นอกเรื่อง
        top_p: 0.95,
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(`Groq API Error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    
    const result = safeJsonParse(text);
    if (!result) {
      return { error: "AI ตอบกลับมาในรูปแบบที่ระบบไม่อ่านไม่ได้" };
    }
    
    // ตรวจสอบและแปลง Sentiment ให้เป็นภาษาอังกฤษเสมอ
    if (result.sentiment) {
      result.sentiment = normalizeSentiment(result.sentiment);
    }
    
    return result;
  } catch (error: any) {
    console.error("Groq LLM Error:", error);
    return { error: `เกิดข้อผิดพลาดในการเชื่อมต่อ Groq API: ${error.message}` };
  }
}

/**
 * POST API: รับรีวิวจากหน้าเว็บ -> ส่งให้ AI วิเคราะห์ -> ส่งผลลัพธ์กลับไป
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    const venueId = typeof body.venueId === "string" ? body.venueId : undefined;

    if (!comment) return NextResponse.json({ error: "Invalid comment" }, { status: 400 });

    const venue = typeof venueId === "string" && venueId.length > 0 ? getVenueById(venueId) : undefined;
    
    // 1. พยายามใช้ AI (LLM) เป็นลำดับแรก
    const llm = await generateReplyWithLlm(comment, venue);
    
    // 2. วิเคราะห์ด้วยระบบภายใน (Local Analysis) เป็นการสำรอง
    const analysis = analyzeWithTrainingData(comment);
    
    let finalReply = "";
    let reasoning = "";
    let llmUsed = false;

    // ถ้า AI ทำงานได้ดี ให้ใช้คำตอบจาก AI
    if (llm && llm.reply) {
      finalReply = enforceReplyStyle(comment, llm.reply);
      reasoning = llm.reasoning || "AI วิเคราะห์บริบทสำเร็จ";
      llmUsed = true;
    } else {
      // 3. ระบบสำรอง (Fallback): ถ้า AI พัง ให้ใช้ระบบ Rule-based จากฐานข้อมูล
      if (llm?.error) {
        reasoning = `[AI Error] ${llm.error} -> กำลังใช้ระบบสำรอง...`;
      } else {
        reasoning = "ระบบวิเคราะห์จากฐานข้อมูลตัวอย่างเดิม (AI ไม่ทำงาน)";
      }

      // ตรรกะเสริมสำหรับรีวิวที่พบบ่อย (Hard-coded fallback)
      const text = comment.toLowerCase();
      if (text.includes("บรรยากาศ") || text.includes("สงบ") || text.includes("น่านั่ง")) {
         finalReply = "ขอบคุณมากนะคะที่คุณลูกค้าประทับใจในบรรยากาศที่เงียบสงบของเรา ทางร้านตั้งใจสร้างพื้นที่ให้เป็นที่พักผ่อนที่แท้จริงค่ะ";
      } else {
         finalReply = buildReplyFromTrainingData(comment, analysis.sentiment, analysis.aspect);
      }
    }

    // ส่งข้อมูลทั้งหมดกลับไปยัง Frontend
    return NextResponse.json({
      sentiment: llm?.sentiment ?? analysis.sentiment,
      reply: finalReply,
      confidence: llm?.confidence ?? analysis.confidence,
      aspect: llm?.aspect ?? analysis.aspect,
      reasoning,
      llmUsed,
      status: "pending",
      timestamp: new Date().toISOString(),
      venueId: venue?.id ?? null,
      venueName: venue?.name ?? null,
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json({
      sentiment: "Neutral",
      reply: "ขอบคุณมากนะคะสำหรับรีวิว ทางร้านจะนำไปปรับปรุงให้ดียิ่งขึ้นค่ะ",
      confidence: 0.5,
      status: "error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
