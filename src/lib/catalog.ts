export const FREE_OVER = 3500;
export const SHIP_FEE = 120;

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
    slug: "dawn-serum",
    name: "Dawn Serum",
    house: "lumiere",
    category: "skincare",
    origin: "Lyon, France",
    price: 3690,
    compareAt: 4890,
    rating: 4.9,
    reviews: 186,
    image: "/media/dawn.jpg",
    alt: "Frosted glass dropper bottle of Lumière Dawn Serum on warm ivory",
    flash: true,
    landed: true,
    featured: 1,
    size: "30 ml",
    blurb: "A light morning serum. Sea buckthorn, rice water, nothing loud.",
    story:
      "Lumière makes this in a small Lyon atelier and ships it sealed. It sits under a moisturiser, not instead of one. Most people use four drops. The glass is frosted so the colour of the oil stays a private thing.",
    notes: ["Sea buckthorn", "Rice ferment", "Squalane", "No added scent"],
  },
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
  {
    slug: "neroli-water",
    name: "Neroli Water",
    house: "velora",
    category: "fragrance",
    origin: "Grasse, France",
    price: 6400,
    rating: 4.9,
    reviews: 97,
    image: "/media/neroli.jpg",
    alt: "Rectangular glass bottle of pale amber Velora Neroli Water",
    landed: false,
    featured: 3,
    size: "50 ml",
    blurb: "Orange blossom, cut with green tea. Stays on skin, not in the room.",
    story:
      "Velora is a two-person house in Grasse. Neroli Water is their daytime bottle: blossom, a bitter leaf, a clean musk. It does not announce you from the lift. It is ordered from the house, so allow the longer passage.",
    notes: ["Neroli", "Green tea", "White musk", "Eau de parfum"],
  },
  {
    slug: "night-resin",
    name: "Night Resin",
    house: "velora",
    category: "fragrance",
    origin: "Grasse, France",
    price: 5460,
    compareAt: 7800,
    rating: 4.7,
    reviews: 64,
    image: "/media/night.jpg",
    alt: "Dark smoked-glass bottle of Velora Night Resin",
    flash: true,
    landed: false,
    featured: 4,
    size: "30 ml",
    blurb: "Labdanum, smoke, a little orange peel. For after dark.",
    story:
      "The evening counterpart to Neroli Water, in smoked glass. Night Resin is denser and slower. A little at the wrist is enough. This week the house price is open — it returns to full when the desk clock ends.",
    notes: ["Labdanum", "Birch", "Orange peel", "Extrait"],
  },
  {
    slug: "camellia-shine",
    name: "Camellia Shine",
    house: "koen",
    category: "hair",
    origin: "Kyoto, Japan",
    price: 1740,
    compareAt: 2280,
    rating: 4.8,
    reviews: 153,
    image: "/media/camellia.jpg",
    alt: "Small amber bottle of Kōen camellia hair oil",
    flash: true,
    landed: true,
    featured: 5,
    size: "40 ml",
    blurb: "Pressed camellia. Two drops through the ends, never the roots.",
    story:
      "Kōen presses camellia seed the way a tea house would want it done: small, named, unperfumed beyond the nut itself. It is already at the Dhaka desk, so it leaves quickly. Use it on dry ends or as a night oil.",
    notes: ["Camellia oleifera", "Nothing else", "Unheated press"],
  },
  {
    slug: "marine-magnesium",
    name: "Marine Magnesium",
    house: "halcyon",
    category: "wellness",
    origin: "Copenhagen, Denmark",
    price: 1390,
    compareAt: 1980,
    rating: 4.6,
    reviews: 318,
    image: "/media/magnesium.jpg",
    alt: "Sage-green glass jar of Halcyon Marine Magnesium",
    flash: true,
    landed: true,
    featured: 6,
    size: "60 capsules",
    blurb: "Magnesium from seawater, one capsule with supper.",
    story:
      "Halcyon does not make miracle jars. This is magnesium glycinate from a marine source, dosed plainly, labelled in Danish and English. We keep a standing tin at the desk because people reorder it. Not a medicine — a daily mineral.",
    notes: ["Magnesium glycinate", "No sweetener", "One with food"],
  },
  {
    slug: "ceremony-tin",
    name: "Ceremony Tin",
    house: "koen",
    category: "wellness",
    origin: "Uji, Japan",
    price: 3250,
    rating: 4.9,
    reviews: 88,
    image: "/media/matcha.jpg",
    alt: "Matte forest-green tin of Kōen ceremonial matcha",
    landed: false,
    featured: 7,
    size: "40 g",
    blurb: "First-flush matcha from Uji. Whisk, do not stir.",
    story:
      "A single estate tin, stone-milled, sealed the week it was ground. It travels from Uji, so the date on the lid still matters when it reaches you. Thirty to forty bowls if you are measured. Store it closed, away from the kettle.",
    notes: ["Tencha, first flush", "Stone milled", "Drink within 6 weeks of opening"],
  },
  {
    slug: "stone-diffuser",
    name: "Stone Diffuser",
    house: "nordhavn",
    category: "home",
    origin: "Aarhus, Denmark",
    price: 3890,
    compareAt: 4600,
    rating: 4.7,
    reviews: 41,
    image: "/media/diffuser.jpg",
    alt: "Sand-coloured sculptural ceramic diffuser by Nordhavn",
    landed: false,
    featured: 8,
    size: "One object",
    blurb: "A ceramic stone. Unscented until you give it oil.",
    story:
      "Nordhavn throws these in small runs. The form holds a few drops of any oil you already trust — Neroli Water included — and lets them leave slowly. It is an object first. No plastic, no plug, no light.",
    notes: ["Stoneware", "Unglazed foot", "Add your own oil"],
  },
  {
    slug: "travertine-morning",
    name: "Travertine Morning",
    house: "lumiere",
    category: "sets",
    origin: "Lyon & Seoul",
    price: 4980,
    compareAt: 5580,
    rating: 5,
    reviews: 37,
    image: "/media/hero.jpg",
    alt: "Dawn Serum and Rice Veil styled on travertine with linen and camellia",
    landed: true,
    featured: 9,
    size: "Serum 30 ml + Veil 50 ml",
    blurb: "Dawn Serum and Rice Veil, paired by the desk.",
    story:
      "The two we reach for before anything else. Lumière Dawn Serum underneath, Atelier Mira Rice Veil on top. Photographed with a Velora bottle and the Nordhavn dish — those are not in the box. What arrives is the serum, the veil, and a card from the desk.",
    notes: ["Dawn Serum", "Rice Veil", "Ready in Dhaka"],
  },
  {
    slug: "the-arrival",
    name: "The Arrival",
    house: "mira",
    category: "sets",
    origin: "Wrapped in Dhaka",
    price: 3450,
    compareAt: 3630,
    rating: 4.9,
    reviews: 52,
    image: "/media/arrival.jpg",
    alt: "Hands opening a cream gift box lined with tissue and a glass bottle",
    landed: true,
    featured: 10,
    size: "Veil + Camellia, wrapped",
    blurb: "Rice Veil and Camellia Shine, in the cream box.",
    story:
      "A gift that does not look like a promotion. We wrap Atelier Mira Rice Veil with Kōen Camellia Shine in tissue, in the cream box you see here. Leave a name in the order note and we will write the card by hand.",
    notes: ["Rice Veil", "Camellia Shine", "Handwritten card"],
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
