// WhatsApp ordering: opens a chat with the desk and pre-fills the order message.
export const WHATSAPP_NUMBER = "8801408706191";

export function whatsappOrderUrl({ product, size, color, qty }: { product?: string; size?: string; color?: string; qty?: number } = {}) {
  const lines = [
    "আসসালামু আলাইকুম,",
    "আমি Raya Mart থেকে অর্ডার করতে চাই।",
    "",
    `প্রোডাক্ট: ${product ?? ""}`,
    `সাইজ: ${size ?? ""}`,
    ...(color ? [`Color: ${color}`] : []),
    `পরিমাণ: ${qty ?? 1}`,
    "নাম: ",
    "ঠিকানা: ",
    "মোবাইল: ",
  ];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
