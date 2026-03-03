const { db } = require("../utils/firestore");

/**
 * @param {{ topic: string, locale: "ar"|"en" }} args
 */
async function policyLookupTool(args) {
  const topic = args.topic.toLowerCase().trim();
  const locale = args.locale === "en" ? "en" : "ar";
  const snapshot = await db
    .collection("kbArticles")
    .where("locale", "==", locale)
    .limit(40)
    .get();

  const matches = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => {
      const haystack = `${item.title || ""} ${(item.content || "").slice(0, 400)} ${(item.tags || []).join(" ")}`.toLowerCase();
      return haystack.includes(topic);
    })
    .slice(0, 2);

  return {
    type: "policy",
    records: matches.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      locale: m.locale,
    })),
  };
}

module.exports = { policyLookupTool };
