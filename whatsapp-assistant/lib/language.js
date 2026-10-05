// Decide whether to reply in English, Kannada script, or Kannada in English letters.

const KANNADA_SCRIPT = /[ಀ-೿]/;
// Common words in romanised Kannada ("Kanglish") chats.
const KANGLISH_WORDS = new Set([
  "nanna", "nange", "nimma", "illa", "ide", "ideya", "beku", "beda", "yelli", "elli", "yaavaga", "yavaga",
  "yenu", "enu", "yaake", "yake", "haalu", "halu", "mosaru", "akki", "naale", "nale", "ivattu", "ivathu",
  "maadi", "madi", "kodi", "swalpa", "houdu", "hudu", "gottilla", "banni", "barutte",
  "bartide", "bandilla", "aagutta", "agutta", "agide", "aagide", "hege", "estu", "eshtu", "bele", "dhanyavada",
  "namaskara", "thumba", "tumba", "chennagide", "madbeku", "nilsi", "nillisi",
]);
const STRONG = new Set(["nanna", "nange", "illa", "beku", "beda", "yelli", "elli", "yenu", "enu", "naale", "nale",
  "ivattu", "ivathu", "maadi", "madi", "swalpa", "houdu", "gottilla", "barutte", "bartide", "bandilla", "eshtu",
  "estu", "hege", "nilsi", "nillisi", "madbeku", "haalu", "mosaru", "akki", "agide", "aagide", "dhanyavada", "namaskara"]);

export function detectLanguage(text = "") {
  if (KANNADA_SCRIPT.test(text)) return "kn";
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  const strong = words.filter((w) => STRONG.has(w)).length;
  const any = words.filter((w) => KANGLISH_WORDS.has(w)).length;
  if (strong >= 2 || (strong >= 1 && any >= 2) || (strong >= 1 && words.length <= 3)) return "kn-latn";
  return "en";
}

export const LANGUAGE_INSTRUCTION = {
  en: "The customer wrote in English. Reply in simple English.",
  kn: "The customer wrote in Kannada script. Reply ONLY in natural, simple Kannada script (ಕನ್ನಡ). Keep product names, order IDs, prices and times as given.",
  "kn-latn": "The customer wrote Kannada in English letters (Kanglish). Reply the same way: simple Kannada written in English letters, like a friendly Bengaluru shopkeeper on WhatsApp.",
};

// Fixed messages used when the AI is not involved (errors, handover, unsupported media).
export const FIXED = {
  handoverAck: {
    en: "I've passed your chat to our team 🙋. A team member will reply here soon (9 AM–7 PM). Type *BOT* anytime to come back to the assistant.",
    kn: "ನಿಮ್ಮ ಚಾಟ್ ಅನ್ನು ನಮ್ಮ ತಂಡಕ್ಕೆ ಕಳುಹಿಸಿದ್ದೇನೆ 🙋. ತಂಡದ ಸದಸ್ಯರು ಶೀಘ್ರದಲ್ಲೇ ಇಲ್ಲಿ ಉತ್ತರಿಸುತ್ತಾರೆ (ಬೆಳಿಗ್ಗೆ 9 – ಸಂಜೆ 7). ಸಹಾಯಕನ ಬಳಿ ಮರಳಲು *BOT* ಎಂದು ಟೈಪ್ ಮಾಡಿ.",
    "kn-latn": "Nimma chat nam team ge kalsiddini 🙋. Team avru swalpa hottalli illi reply maadtare (9 AM–7 PM). Assistant hatra vaapas barakke *BOT* antha type maadi.",
  },
  backToBot: {
    en: "You're back with the Hasiru Basket assistant 🤖. How can I help?",
    kn: "ನೀವು ಮತ್ತೆ ಹಸಿರು ಬಾಸ್ಕೆಟ್ ಸಹಾಯಕನ ಜೊತೆ ಇದ್ದೀರಿ 🤖. ಏನು ಸಹಾಯ ಬೇಕು?",
    "kn-latn": "Neevu matte Hasiru Basket assistant jothe iddira 🤖. Enu sahaya beku?",
  },
  error: {
    en: "Sorry, I'm having trouble right now 🙏. I've alerted our team and someone will reply here soon.",
    kn: "ಕ್ಷಮಿಸಿ, ಈಗ ಸ್ವಲ್ಪ ತೊಂದರೆ ಆಗಿದೆ 🙏. ನಮ್ಮ ತಂಡಕ್ಕೆ ತಿಳಿಸಿದ್ದೇನೆ, ಶೀಘ್ರದಲ್ಲೇ ಉತ್ತರಿಸುತ್ತಾರೆ.",
    "kn-latn": "Sorry, eega swalpa problem aagide 🙏. Nam team ge tilisiddini, bega reply maadtare.",
  },
  unsupported: {
    en: "This demo can read text messages only for now. Please type your question 🙂",
    kn: "ಈ ಡೆಮೊ ಸದ್ಯಕ್ಕೆ ಪಠ್ಯ ಸಂದೇಶಗಳನ್ನು ಮಾತ್ರ ಓದಬಲ್ಲದು. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ 🙂",
    "kn-latn": "Ee demo eega text message maatra odutte. Dayavittu nimma prashne type maadi 🙂",
  },
  reset: {
    en: "Demo data reset ✅. You have fresh sample orders and a milk subscription. Try: \"Where is my order?\" or \"ನಾಳೆ ಹಾಲು ಬೇಡ\".",
  },
};

export const fixed = (key, lang) => FIXED[key][lang] || FIXED[key].en;
