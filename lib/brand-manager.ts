import venuesData from "@/data/brand-list.json";

/**
 * โครงสร้างข้อมูลของร้าน (Venue)
 */
export type Venue = {
  id: string;          // รหัสอ้างอิงของร้าน
  name: string;        // ชื่อร้าน
  area: string;        // พื้นที่ตั้ง
  tagline: string;     // คำขวัญหรือสโลแกน
  personality: string; // บุคลิกภาพของแบรนด์
  tone: string;        // โทนเสียงในการตอบโต้
  keywords: string[];  // คำสำคัญที่เกี่ยวข้องกับร้าน
};

// โหลดข้อมูลร้านค้าจาก JSON และกำหนดประเภทข้อมูล
const venues = venuesData as Venue[];

/**
 * ลำดับการจัดกลุ่มร้านค้าสำหรับการเทรนข้อมูล
 * ถ้า dataset มี metadata ร้านจริง จะใช้ field นั้น
 * ถ้าไม่มี metadata แต่มี review text จะแมปตาม keyword ที่ตรงกับประเภทร้าน
 * ถ้าไม่มีข้อมูลอื่นเลย จะ fallback เป็น index mod 3
 */
export const VENUE_TRAIN_ORDER = ["common-room", "hom-duan", "tid-din"] as const;

/**
 * หาตำแหน่ง (index) ของร้านค้าในรายการลำดับการเทรน
 */
export function trainSlotForVenue(venueId: string): number {
  const i = (VENUE_TRAIN_ORDER as readonly string[]).indexOf(venueId);
  return i >= 0 ? i : 0;
}

/**
 * ตรวจสอบว่าแถวข้อมูล (rowIndex) นี้ตรงกับลำดับของร้านที่ระบุหรือไม่ (ใช้สำหรับ Fallback)
 */
export function rowIndexMatchesVenue(rowIndex: number, venueId: string): boolean {
  return rowIndex % VENUE_TRAIN_ORDER.length === trainSlotForVenue(venueId);
}

/**
 * โครงสร้างข้อมูลแถวใน Dataset
 */
type DatasetRow = {
  review_body?: string;    // ข้อความรีวิว
  restaurant_id?: string;  // ID ร้าน (ถ้ามี)
  restaurant_name?: string; // ชื่อร้าน (ถ้ามี)
};

/**
 * คำนวณคะแนนความสอดคล้องของข้อความรีวิวกับร้านค้า โดยนับจากจำนวน Keyword ที่พบ
 */
export function reviewScoreForVenue(text: string, venue: Venue): number {
  const c = compactForMatch(text);
  return venue.keywords.reduce((score, keyword) => {
    return c.includes(compactForMatch(keyword)) ? score + 1 : score;
  }, 0);
}

/**
 * ค้นหา ID ของร้านค้าที่ตรงกับข้อมูลในแถวนั้นๆ มากที่สุด
 */
export function bestMatchingVenueId(row: DatasetRow | undefined): string | null {
  if (!row?.review_body) return null;

  const scores = venues.map((venue) => ({
    venueId: venue.id,
    score: reviewScoreForVenue(row.review_body ?? "", venue),
  }));
  const maxScore = Math.max(...scores.map((s) => s.score));
  if (maxScore <= 0) return null;

  // คืนค่า ID ถ้านำโด่งเพียงร้านเดียว (ไม่มีคะแนนเท่ากัน)
  const winners = scores.filter((s) => s.score === maxScore);
  if (winners.length !== 1) return null;
  return winners[0].venueId;
}

/**
 * ฟังก์ชันหลักในการตรวจสอบว่า แถวข้อมูลนี้ (row) ควรจัดอยู่ในกลุ่มของร้าน (venue) ที่กำหนดหรือไม่
 */
export function rowMatchesVenue(
  row: DatasetRow | undefined,
  venue: Venue,
  rowIndex: number
): boolean {
  if (!row) return false;

  // 1. ตรวจสอบจาก Metadata (ลำดับความสำคัญสูงสุด)
  if (row.restaurant_id && row.restaurant_id === venue.id) return true;
  if (row.restaurant_name) {
    const normalizedName = compactForMatch(row.restaurant_name);
    // ตรวจสอบทั้งชื่อตรงๆ และ Keyword ของร้าน
    if (compactForMatch(venue.name) === normalizedName) return true;
    if (venue.keywords.some((keyword) => compactForMatch(keyword) === normalizedName)) return true;
  }

  // 2. ตรวจสอบจากการให้คะแนน Keyword
  const scores = venues.map((v) => ({
    id: v.id,
    score: reviewScoreForVenue(row.review_body ?? "", v),
  }));
  
  const maxScore = Math.max(...scores.map((s) => s.score));
  const currentVenueScore = scores.find(s => s.id === venue.id)?.score ?? 0;

  if (maxScore > 0) {
    // กฎที่ 1: ต้องมีผู้ชนะเพียงหนึ่งเดียวเท่านั้น (ไม่มีคะแนนเท่ากันเพื่อลดความสับสน)
    const winners = scores.filter(s => s.score === maxScore);
    if (winners.length > 1) return false; 

    // กฎที่ 2: ถ้าคะแนนสูงสุดไม่ใช่ของร้านปัจจุบัน ให้ข้ามไป
    if (currentVenueScore !== maxScore) return false;

    // กฎที่ 3: การคัดออกอย่างเข้มงวด (Strict Exclusions)
    // ตัวอย่าง: ถ้าเป็นร้านอาหารเหนือหรือร้านอาหารอีสาน แต่มีคำที่เกี่ยวกับคาเฟ่/กาแฟ ให้คัดออก
    const text = compactForMatch(row.review_body ?? "");
    const cafeKeywords = ["กาแฟ", "คาเฟ่", "cafe", "coffee", "ลาเต้", "latte", "ขนมหวาน"];
    if ((venue.id === "hom-duan" || venue.id === "tid-din") && 
        cafeKeywords.some(k => text.includes(compactForMatch(k)))) {
      return false;
    }

    return true;
  }

  // 3. กรณีสุดท้าย (Fallback): ถ้าไม่พบ Keyword ที่ตรงกับร้านไหนเลย ให้จัดกลุ่มตามลำดับแถว
  return rowIndexMatchesVenue(rowIndex, venue.id);
}

/**
 * ดึงรายการร้านค้าทั้งหมด
 */
export function listVenues(): Venue[] {
  return venues;
}

/**
 * ค้นหาร้านค้าจาก ID
 */
export function getVenueById(id: string): Venue | undefined {
  return venues.find((v) => v.id === id);
}

/** 
 * จัดรูปแบบข้อความเพื่อใช้เปรียบเทียบ (ลบช่องว่าง, ตัวอักษรพิเศษ, และทำเป็นตัวพิมพ์เล็ก) 
 * ช่วยให้การค้นหาคำภาษาไทยแม่นยำขึ้นเนื่องจากมักไม่มีการเว้นวรรคที่แน่นอน
 */
export function compactForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/[\s\u200b-\u200d\ufeff]+/g, "");
}

/**
 * ตรวจสอบว่าข้อความรีวิวมี Keyword ของร้านที่ระบุหรือไม่
 */
export function reviewMatchesVenue(text: string, venue: Venue): boolean {
  const c = compactForMatch(text);
  return venue.keywords.some((k) => c.includes(compactForMatch(k)));
}
