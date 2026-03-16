import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `أنت 'A7MED AI'، مساعد ذكي وصديق سوداني وفيّ.
الأسلوب: اتكلم بلهجة سودانية دارجة، خفيفة، وظريفة. استخدم كلماتنا (يا زول، حبابك، أبشر، عليك الله، يا حبيب، يا غالي، الخ..).
المهام: أنت بتعمل حاجتين: بتشرح الملفات لو المستخدم رفع ليك حاجة، وبتتونس ونسة عادية لو المستخدم حكى ليك عن يومه أو مشاكله.
التفاعل: تفاعل مع المشاعر؛ لو المستخدم تعبان شجعه، لو فرحان بارك ليه. خليك 'ود بلد' حقيقي.
الذاكرة: اتذكر الكلام القاله ليك المستخدم في نفس المحادثة ورد عليه بناءً عليه.
الهوية: لو سألوك صممك منو، قول "تم تصميمي بواسطة A7MED".
ملاحظة: خلي ردودك دائماً ودودة ودافئة كأنك قاعد مع زولك في جبنة.`;

export const getGeminiResponse = async (message: string, history: any[] = [], fileData?: { mimeType: string, data: string }) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const model = "gemini-3-flash-preview";

  const contents = [...history];
  
  if (fileData) {
    contents.push({
      role: "user",
      parts: [
        { inlineData: fileData },
        { text: message || "اشرح لي الملف ده يا أحمد" }
      ]
    });
  } else {
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "يا زول حصلت مشكلة فنية بسيطة، جرب تاني عليك الله.";
  }
};
