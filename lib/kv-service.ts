import { kv } from "@vercel/kv";
import fs from "fs";
import path from "path";

const BRAND_CONFIG_KEY = "brand-config";
const CUSTOM_REVIEWS_KEY = "custom-reviews";
const APPROVED_REPLIES_KEY = "approved-replies";

/**
 * ดึงข้อมูล Brand Config (รวมตัวอย่างสอน AI)
 * ถ้าไม่มีใน KV จะไปอ่านจากไฟล์ JSON เริ่มต้นแล้วเซฟลง KV ให้
 */
export async function getBrandConfig() {
  try {
    // 1. พยายามดึงจาก KV ก่อน
    const data = await kv.get(BRAND_CONFIG_KEY);
    if (data) return data as any;

    // 2. ถ้าไม่มี (เช่น รันครั้งแรก) ให้ไปอ่านจากไฟล์ JSON
    const localPath = path.join(process.cwd(), "data/brand-config.json");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf-8");
      const jsonData = JSON.parse(content);
      
      // เซฟลง KV เพื่อใช้ในครั้งต่อไป
      await kv.set(BRAND_CONFIG_KEY, jsonData);
      return jsonData;
    }
  } catch (error) {
    console.error("KV Error (getBrandConfig):", error);
    // Fallback ในกรณีที่ KV มีปัญหา (เช่น ยังไม่ได้ตั้งค่า Env) ให้ใช้ไฟล์โลคอล
    try {
      const localPath = path.join(process.cwd(), "data/brand-config.json");
      if (fs.existsSync(localPath)) {
        return JSON.parse(fs.readFileSync(localPath, "utf-8"));
      }
    } catch (e) {}
  }
  return { brands: {} };
}

/**
 * บันทึกข้อมูล Brand Config ลง KV
 */
export async function saveBrandConfig(data: any) {
  try {
    await kv.set(BRAND_CONFIG_KEY, data);
    return true;
  } catch (error) {
    console.error("KV Error (saveBrandConfig):", error);
    return false;
  }
}

/**
 * ดึงข้อมูลรีวิวที่อัปโหลด (Custom Reviews)
 */
export async function getCustomReviews() {
  try {
    const data = await kv.get(CUSTOM_REVIEWS_KEY);
    if (data) return data as any[];

    // Fallback to local file if exists
    const localPath = path.join(process.cwd(), "data/custom_reviews.json");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("KV Error (getCustomReviews):", error);
  }
  return [];
}

/**
 * บันทึกข้อมูลรีวิวที่อัปโหลดลง KV
 */
export async function saveCustomReviews(reviews: any[]) {
  try {
    await kv.set(CUSTOM_REVIEWS_KEY, reviews);
    return true;
  } catch (error) {
    console.error("KV Error (saveCustomReviews):", error);
    return false;
  }
}

/**
 * ดึงข้อมูลการตอบกลับที่อนุมัติแล้ว (Staff Approvals)
 */
export async function getApprovedReplies() {
  try {
    const data = await kv.get(APPROVED_REPLIES_KEY);
    if (data) return data as any[];

    // Fallback to local file if exists
    const localPath = path.join(process.cwd(), "data/approved_replies.json");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("KV Error (getApprovedReplies):", error);
  }
  return [];
}

/**
 * บันทึกข้อมูลการตอบกลับที่อนุมัติแล้วลง KV
 */
export async function saveApprovedReplies(replies: any[]) {
  try {
    await kv.set(APPROVED_REPLIES_KEY, replies);
    return true;
  } catch (error) {
    console.error("KV Error (saveApprovedReplies):", error);
    return false;
  }
}
