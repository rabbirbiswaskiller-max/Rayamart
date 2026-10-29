export const FREE_OVER = 3500;
export const SHIP_FEE = 120;

export const ONLINE_DISCOUNT_OVER = 3000;
export const ONLINE_DISCOUNT_RATE = 0.03;

export function onlineDiscountFor(subtotal: number) {
  if (subtotal < ONLINE_DISCOUNT_OVER) return 0;
  return Math.round(subtotal * ONLINE_DISCOUNT_RATE);
}

export function taka(n: number) {
  return `৳${new Intl.NumberFormat("en-US").format(n)}`;
}

export function discount(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function shippingFor(subtotal: number) {
  if (subtotal <= 0 || subtotal >= FREE_OVER) return 0;
  return SHIP_FEE;
}

export type House = {
  slug: string;
  name: string;
  origin: string;
  line: string;
};

export const houses: House[] = [
  {
    slug: "lumiere",
    name: "Lumière",
    origin: "Lyon",
    line: "Daylight skincare, bottled quietly.",
  },
  {
    slug: "mira",
    name: "Atelier Mira",
    origin: "Seoul",
    line: "Rice, water, and a very light hand.",
  },
  {
    slug: "velora",
    name: "Velora",
    origin: "Grasse",
    line: "Fragrance that stays close to the skin.",
  },
  {
    slug: "koen",
    name: "Kōen",
    origin: "Kyoto",
    line: "Oils and tea, pressed without hurry.",
  },
  {
    slug: "halcyon",
    name: "Halcyon",
    origin: "Copenhagen",
    line: "Minerals, measured.",
  },
  {
    slug: "nordhavn",
    name: "Nordhavn",
    origin: "Aarhus",
    line: "Objects for a still room.",
  },
];

export type Category = {
  slug: string;
  name: string;
  line: string;
  image: string;
};

export const categories: Category[] = [
  {
    slug: "skincare",
    name: "Skincare",
    line: "Serums and veils",
    image: "/media/veil.jpg",
  },
  {
    slug: "fragrance",
    name: "Fragrance",
    line: "Water and resin",
    image: "/media/neroli.jpg",
  },
  {
    slug: "hair",
    name: "Hair",
    line: "A single pressed oil",
    image: "/media/camellia.jpg",
  },
  {
    slug: "wellness",
    name: "Wellness",
    line: "Minerals and ceremony",
    image: "/media/matcha.jpg",
  },
  {
    slug: "home",
    name: "Home",
    line: "One good object",
    image: "/media/diffuser.jpg",
  },
  {
    slug: "sets",
    name: "Sets",
    line: "Edited together",
    image: "/media/arrival.jpg",
  },
];

export type Product = {
  slug: string;
  name: string;
  house: string;
  category: string;
  origin: string;
  price: number;
  compareAt?: number;
  rating: number;
  reviews: number;
  image: string;
  alt: string;
  flash?: boolean;
  landed: boolean;
  featured: number;
  size: string;
  blurb: string;
  story: string;
  notes: string[];
};

export const products: Product[] = [
  {
    slug: "rice-veil",
    name: "Rice Veil",
    house: "mira",
    category: "skincare",
    origin: "Seoul, Korea",
    price: 1890,
    compareAt: 2450,
    rating: 4.8,
    reviews: 242,
    image: "/media/veil.jpg",
    alt: "Matte stoneware jar of Atelier Mira Rice Veil cream",
    landed: true,
    featured: 2,
    size: "50 ml",
    blurb: "A rice cream with the weight of a veil. Cool, then gone.",
    story:
      "Atelier Mira mills rice in small batches and folds it into a cream that never feels like a mask. It is the piece we recommend if you only want one thing from Seoul. The jar is stoneware, meant to be kept.",
    notes: ["Rice extract", "Panthenol", "Beta-glucan", "Fragrance-free"],
  },

];

export const cities = [
  "Dhaka",
  "Gazipur",
  "Narayanganj",
  "Chattogram",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Rangpur",
  "Mymensingh",
  "Cumilla",
  "Other district",
];

export type PayMethod = "bkash" | "nagad" | "card" | "cod";

export const payMethods: { id: PayMethod; name: string; line: string }[] = [
  {
    id: "bkash",
    name: "bKash",
    line: "We send a payment note after the desk confirms the piece.",
  },
  {
    id: "nagad",
    name: "Nagad",
    line: "Same as bKash — nothing is taken before we call.",
  },
  {
    id: "card",
    name: "Card",
    line: "A secure link, only once the order is confirmed.",
  },
  {
    id: "cod",
    name: "Cash on delivery",
    line: "Pay the courier. Available on pieces already in Dhaka.",
  },
];

export function houseBy(slug: string) {
  return houses.find((h) => h.slug === slug);
}

export function categoryBy(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export type ShopQuery = {
  q?: string;
  cat?: string;
  house?: string;
  sort?: "price-asc" | "price-desc" | "rating";
  ready?: "1";
};

export function filterProducts(query: ShopQuery) {
  let list = products.slice();
  if (query.cat) list = list.filter((p) => p.category === query.cat);
  if (query.house) list = list.filter((p) => p.house === query.house);
  if (query.ready === "1") list = list.filter((p) => p.landed);
  if (query.q) {
    const s = query.q.trim().toLowerCase();
    list = list.filter((p) => {
      const house = houseBy(p.house)?.name ?? "";
      const cat = categoryBy(p.category)?.name ?? "";
      return [p.name, p.blurb, p.origin, p.notes.join(" "), house, cat]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }
  if (query.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (query.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (query.sort === "rating")
    list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
  else list.sort((a, b) => a.featured - b.featured);
  return list;
}

export function relatedTo(slug: string) {
  const current = getProduct(slug);
  if (!current) return [];
  const same = products.filter(
    (p) => p.slug !== slug && p.category === current.category,
  );
  const rest = products.filter(
    (p) => p.slug !== slug && p.category !== current.category,
  );
  return [...same, ...rest].slice(0, 4);
}
