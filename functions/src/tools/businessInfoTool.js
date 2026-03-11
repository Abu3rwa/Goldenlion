const { db } = require("../utils/firestore");

/* ── In-memory cache (tiny doc, rarely changes) ── */
let cachedInfo = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getBusinessInfo() {
    if (cachedInfo && Date.now() - cacheTimestamp < CACHE_TTL) {
        return cachedInfo;
    }
    const snap = await db.collection("settings").doc("chatbotInfo").get();
    cachedInfo = snap.exists ? snap.data() : null;
    cacheTimestamp = Date.now();
    return cachedInfo;
}

/**
 * @param {{ topic: string }} args
 */
async function businessInfoTool(args) {
    const data = await getBusinessInfo();

    if (!data) {
        return { type: "business_info", found: false, data: null };
    }

    const topic = `${args.topic || ""}`.toLowerCase();

    // No specific topic → return everything
    if (!topic || topic === "all") {
        return { type: "business_info", found: true, data };
    }

    const result = {};

    // Location
    if (
        topic.includes("location") || topic.includes("موقع") ||
        topic.includes("عنوان") || topic.includes("وين") ||
        topic.includes("فين") || topic.includes("مكان") ||
        topic.includes("address") || topic.includes("خريطة") ||
        topic.includes("map")
    ) {
        result.location = data.location;
    }

    // Working hours
    if (
        topic.includes("hours") || topic.includes("ساعات") ||
        topic.includes("وقت") || topic.includes("مواعيد") ||
        topic.includes("فتح") || topic.includes("يغلق") ||
        topic.includes("مفتوح") || topic.includes("open") ||
        topic.includes("close")
    ) {
        result.workingHours = data.workingHours;
    }

    // Contact info
    if (
        topic.includes("contact") || topic.includes("تواصل") ||
        topic.includes("هاتف") || topic.includes("رقم") ||
        topic.includes("واتس") || topic.includes("واتساب") ||
        topic.includes("whatsapp") || topic.includes("انستقرام") ||
        topic.includes("instagram") || topic.includes("فيسبوك") ||
        topic.includes("facebook") || topic.includes("بريد") ||
        topic.includes("email") || topic.includes("phone")
    ) {
        result.contact = data.contact;
    }

    // About us
    if (
        topic.includes("about") || topic.includes("من نحن") ||
        topic.includes("عن المتجر") || topic.includes("شنو") ||
        topic.includes("نبذة") || topic.includes("تعريف")
    ) {
        result.aboutUs = data.aboutUs;
    }

    // Delivery info
    if (
        topic.includes("توصيل") || topic.includes("delivery") ||
        topic.includes("شحن") || topic.includes("مدن") ||
        topic.includes("يوصل")
    ) {
        result.delivery = data.delivery;
    }

    // Payment info
    if (
        topic.includes("دفع") || topic.includes("payment") ||
        topic.includes("فيزا") || topic.includes("visa") ||
        topic.includes("كاش") || topic.includes("نقد") ||
        topic.includes("تحويل")
    ) {
        result.payment = data.payment;
    }

    // Return / exchange policy
    if (
        topic.includes("استرجاع") || topic.includes("ارجاع") ||
        topic.includes("استبدال") || topic.includes("return") ||
        topic.includes("exchange") || topic.includes("refund")
    ) {
        result.returnPolicy = data.returnPolicy;
    }

    // Custom FAQs – fuzzy word match
    if (Array.isArray(data.customFaqs) && data.customFaqs.length) {
        const words = topic.split(/\s+/).filter((w) => w.length > 2);
        const matchingFaq = data.customFaqs.find((faq) =>
            words.some((w) => `${faq.question || ""}`.toLowerCase().includes(w))
        );
        if (matchingFaq) {
            result.faq = matchingFaq;
        }
    }

    const hasData = Object.keys(result).length > 0;
    return {
        type: "business_info",
        found: hasData,
        // If no specific section matched, return everything so the LLM can pick
        data: hasData ? result : data,
    };
}

module.exports = { businessInfoTool };
