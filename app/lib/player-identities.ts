import type { PlayerAvatar, PlayerAvatarColor } from "./types";

export const PLAYER_AVATAR_COLORS: PlayerAvatarColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
];

export const PLAYER_AVATAR_OPTIONS: Record<
  PlayerAvatarColor,
  Array<{ id: string; label: string; image: string }>
> = {
  red: [
    { id: "apple", label: "Apple", image: "/food-icons/red-apple.png" },
    {
      id: "strawberry",
      label: "Strawberry",
      image: "/food-icons/red-strawberry.png",
    },
    { id: "tomato", label: "Tomato", image: "/food-icons/red-tomato.png" },
    {
      id: "cherries",
      label: "Cherries",
      image: "/food-icons/red-cherries.png",
    },
    {
      id: "watermelon",
      label: "Watermelon",
      image: "/food-icons/red-watermelon.png",
    },
  ],
  orange: [
    {
      id: "orange",
      label: "Orange",
      image: "/food-icons/orange-orange.png",
    },
    {
      id: "carrot",
      label: "Carrot",
      image: "/food-icons/orange-carrot.png",
    },
    {
      id: "pumpkin",
      label: "Pumpkin",
      image: "/food-icons/orange-pumpkin.png",
    },
    {
      id: "peach",
      label: "Peach",
      image: "/food-icons/orange-peach.png",
    },
    {
      id: "sweet-potato",
      label: "Sweet potato",
      image: "/food-icons/orange-sweet-potato.png",
    },
  ],
  yellow: [
    {
      id: "banana",
      label: "Banana",
      image: "/food-icons/yellow-banana.png",
    },
    {
      id: "lemon",
      label: "Lemon",
      image: "/food-icons/yellow-lemon.png",
    },
    {
      id: "pineapple",
      label: "Pineapple",
      image: "/food-icons/yellow-pineapple.png",
    },
    { id: "corn", label: "Corn", image: "/food-icons/yellow-corn.png" },
    {
      id: "cheese",
      label: "Cheese",
      image: "/food-icons/yellow-cheese.png",
    },
  ],
  green: [
    {
      id: "avocado",
      label: "Avocado",
      image: "/food-icons/green-avocado.png",
    },
    {
      id: "broccoli",
      label: "Broccoli",
      image: "/food-icons/green-broccoli.png",
    },
    {
      id: "green-apple",
      label: "Green apple",
      image: "/food-icons/green-green-apple.png",
    },
    {
      id: "pea-pod",
      label: "Pea pod",
      image: "/food-icons/green-pea-pod.png",
    },
    {
      id: "cucumber",
      label: "Cucumber",
      image: "/food-icons/green-cucumber.png",
    },
  ],
  blue: [
    {
      id: "blueberries",
      label: "Blueberries",
      image: "/food-icons/blue-blueberries.png",
    },
    {
      id: "cupcake",
      label: "Blue cupcake",
      image: "/food-icons/blue-cupcake.png",
    },
    {
      id: "popsicle",
      label: "Blue popsicle",
      image: "/food-icons/blue-popsicle.png",
    },
    {
      id: "macaron",
      label: "Blue macaron",
      image: "/food-icons/blue-macaron.png",
    },
    {
      id: "candy",
      label: "Blue candy",
      image: "/food-icons/blue-candy.png",
    },
  ],
  purple: [
    {
      id: "grapes",
      label: "Grapes",
      image: "/food-icons/purple-grapes.png",
    },
    {
      id: "eggplant",
      label: "Eggplant",
      image: "/food-icons/purple-eggplant.png",
    },
    { id: "plum", label: "Plum", image: "/food-icons/purple-plum.png" },
    {
      id: "cabbage",
      label: "Purple cabbage",
      image: "/food-icons/purple-cabbage.png",
    },
    {
      id: "blackberry",
      label: "Blackberry",
      image: "/food-icons/purple-blackberry.png",
    },
  ],
};

const PLAYER_FIRST_NAMES = [
  "Avery",
  "Billie",
  "Carmen",
  "Dara",
  "Eli",
  "Farah",
  "Gio",
  "Harper",
  "Imani",
  "Jules",
  "Kai",
  "Leonie",
  "Mara",
  "Nico",
  "Oren",
  "Paz",
  "Quinn",
  "Ravi",
  "Sage",
  "Tala",
  "Uma",
  "Vera",
  "Wren",
  "Xavi",
  "Yara",
  "Zuri",
  "Arlo",
  "Bea",
  "Cleo",
  "Diego",
  "Esme",
  "Finn",
  "Greta",
  "Hugo",
  "Indie",
  "Jun",
  "Kira",
  "Luca",
  "Mina",
  "Noa",
];

const PLAYER_LAST_NAMES = [
  "Ash",
  "Banks",
  "Bell",
  "Bloom",
  "Brush",
  "Cedar",
  "Clay",
  "Cole",
  "Dove",
  "Dusk",
  "Field",
  "Finch",
  "Flint",
  "Frost",
  "Glass",
  "Gray",
  "Hart",
  "Haze",
  "Lake",
  "Lane",
  "Lark",
  "Light",
  "Moss",
  "North",
  "Page",
  "Pike",
  "Reed",
  "Rose",
  "Slate",
  "Stone",
  "Vale",
  "Voss",
  "Ward",
  "West",
  "Wilde",
  "Wolf",
];

const STUDIO_MODIFIERS = [
  "After Hours",
  "Black Frame",
  "Bright Field",
  "Corner",
  "Crimson",
  "Daylight",
  "East Wall",
  "Electric",
  "Found Color",
  "Grey Door",
  "High Line",
  "Last Light",
  "Midnight",
  "North Window",
  "Open Hand",
  "Paper Moon",
  "Red Room",
  "Second Floor",
  "Sharp Edge",
  "Small Hours",
  "South Wall",
  "Spare Room",
  "Still Life",
  "White Box",
  "Wild Color",
];

const STUDIO_NOUNS = [
  "Atelier",
  "Canvas",
  "Collective",
  "Easel",
  "Factory",
  "Gallery",
  "House",
  "Kiln",
  "Loft",
  "Palette",
  "Press",
  "Salon",
  "Studio",
  "Workshop",
];

function randomIndex(length: number): number {
  if (length <= 1) return 0;
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % length;
}

export function randomPlayerName(existingNames: string[] = []): string {
  const existing = new Set(
    existingNames.map((name) => name.trim().toLocaleLowerCase()),
  );
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const name = `${PLAYER_FIRST_NAMES[randomIndex(PLAYER_FIRST_NAMES.length)]} ${
      PLAYER_LAST_NAMES[randomIndex(PLAYER_LAST_NAMES.length)]
    }`;
    if (!existing.has(name.toLocaleLowerCase())) return name;
  }
  return `Artist ${100 + randomIndex(900)}`;
}

export function randomStudioName(): string {
  return `${STUDIO_MODIFIERS[randomIndex(STUDIO_MODIFIERS.length)]} ${
    STUDIO_NOUNS[randomIndex(STUDIO_NOUNS.length)]
  }`;
}

export function defaultPlayerAvatar(
  usedColors: PlayerAvatarColor[] = [],
): PlayerAvatar {
  const used = new Set(usedColors);
  const color =
    PLAYER_AVATAR_COLORS.find((entry) => !used.has(entry)) ??
    PLAYER_AVATAR_COLORS[0];
  return { color, icon: PLAYER_AVATAR_OPTIONS[color][0].id };
}

export function avatarOption(avatar?: PlayerAvatar) {
  if (!avatar) return undefined;
  return PLAYER_AVATAR_OPTIONS[avatar.color]?.find(
    (option) => option.id === avatar.icon,
  );
}

export function isPlayerAvatar(value: unknown): value is PlayerAvatar {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlayerAvatar>;
  return (
    PLAYER_AVATAR_COLORS.includes(candidate.color as PlayerAvatarColor) &&
    typeof candidate.icon === "string" &&
    PLAYER_AVATAR_OPTIONS[candidate.color as PlayerAvatarColor].some(
      (option) => option.id === candidate.icon,
    )
  );
}
