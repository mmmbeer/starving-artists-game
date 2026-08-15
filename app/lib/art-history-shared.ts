export interface ArtSource {
  label: string;
  href: string;
}

export interface ArtHistoryEntry {
  slug: string;
  canvasId: string;
  title: string;
  artist: string;
  artistYears: string;
  year: string;
  movement: string;
  collection: string;
  publicImage: string;
  publicImageSource: string;
  artistImage: string;
  artistImageSource: string;
  artistImageAlt: string;
  summary: string;
  history: string[];
  lookFor: string[];
  sources: ArtSource[];
}

export function commonsImage(fileName: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=${width}`;
}

export const wikipedia = (slug: string) => `https://en.wikipedia.org/wiki/${slug}`;
export const commons = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fileName)}`;

export const portraits = {
  vanGogh: {
    image: commonsImage("Vincent van Gogh - Self-Portrait - Google Art Project.jpg", 700),
    source: commons("Vincent van Gogh - Self-Portrait - Google Art Project.jpg"),
    alt: "Self-portrait of Vincent van Gogh",
  },
  hokusai: {
    image: commonsImage("Portrait of Hokusai by Keisai Eisen.jpg", 700),
    source: commons("Portrait of Hokusai by Keisai Eisen.jpg"),
    alt: "Portrait of Katsushika Hokusai by Keisai Eisen",
  },
  vermeer: {
    image: commonsImage("Johannes Vermeer - The Procuress - Google Art Project.jpg", 700),
    source: commons("Johannes Vermeer - The Procuress - Google Art Project.jpg"),
    alt: "Detail often identified as Johannes Vermeer in The Procuress",
  },
  munch: {
    image: commonsImage("Edvard Munch 1933-2.jpg", 700),
    source: commons("Edvard Munch 1933-2.jpg"),
    alt: "Photograph of Edvard Munch",
  },
  botticelli: {
    image: commonsImage("Sandro Botticelli 083.jpg", 700),
    source: commons("Sandro Botticelli 083.jpg"),
    alt: "Portrait traditionally identified as Sandro Botticelli",
  },
  klimt: {
    image: commonsImage("Gustav Klimt 1914.jpg", 700),
    source: commons("Gustav Klimt 1914.jpg"),
    alt: "Photograph of Gustav Klimt",
  },
  monet: {
    image: commonsImage("Claude Monet 1899 Nadar crop.jpg", 700),
    source: commons("Claude Monet 1899 Nadar crop.jpg"),
    alt: "Photograph of Claude Monet by Nadar",
  },
  michelangelo: {
    image: commonsImage("Michelangelo Daniele da Volterra (dettaglio).jpg", 700),
    source: commons("Michelangelo Daniele da Volterra (dettaglio).jpg"),
    alt: "Portrait of Michelangelo by Daniele da Volterra",
  },
  raphael: {
    image: commonsImage("Raffaello Sanzio.jpg", 700),
    source: commons("Raffaello Sanzio.jpg"),
    alt: "Self-portrait of Raphael",
  },
  bosch: {
    image: commonsImage("Jheronimus Bosch (cropped).jpg", 700),
    source: commons("Jheronimus Bosch (cropped).jpg"),
    alt: "Portrait of Hieronymus Bosch",
  },
  leonardo: {
    image: commonsImage("Francesco Melzi - Portrait of Leonardo - WGA14795.jpg", 700),
    source: commons("Francesco Melzi - Portrait of Leonardo - WGA14795.jpg"),
    alt: "Portrait of Leonardo da Vinci attributed to Francesco Melzi",
  },
  titian: {
    image: commonsImage("Tizian 056.jpg", 700),
    source: commons("Tizian 056.jpg"),
    alt: "Self-portrait of Titian",
  },
  caravaggio: {
    image: commonsImage("Bild-Ottavio Leoni, Caravaggio.jpg", 700),
    source: commons("Bild-Ottavio Leoni, Caravaggio.jpg"),
    alt: "Portrait of Caravaggio by Ottavio Leoni",
  },
  seurat: {
    image: commonsImage("Georges Seurat 1888.jpg", 700),
    source: commons("Georges Seurat 1888.jpg"),
    alt: "Portrait of Georges Seurat",
  },
  renoir: {
    image: commonsImage("Pierre-Auguste Renoir, uncropped image.jpg", 700),
    source: commons("Pierre-Auguste Renoir, uncropped image.jpg"),
    alt: "Photograph of Pierre-Auguste Renoir",
  },
  leighton: {
    image: commonsImage("Frederic Leighton - Self portrait - Google Art Project.jpg", 700),
    source: commons("Frederic Leighton - Self portrait - Google Art Project.jpg"),
    alt: "Self-portrait of Frederic Leighton",
  },
  rembrandt: {
    image: commonsImage("Rembrandt van Rijn - Self-Portrait - Google Art Project.jpg", 700),
    source: commons("Rembrandt van Rijn - Self-Portrait - Google Art Project.jpg"),
    alt: "Self-portrait of Rembrandt van Rijn",
  },
  gentileschi: {
    image: commonsImage("Artemisia Gentileschi - Self-Portrait as the Allegory of Painting - Royal Collection.jpg", 700),
    source: commons("Artemisia Gentileschi - Self-Portrait as the Allegory of Painting - Royal Collection.jpg"),
    alt: "Artemisia Gentileschi as the Allegory of Painting",
  },
  elGreco: {
    image: commonsImage("El Greco - Portrait of an Old Man - WGA10554.jpg", 700),
    source: commons("El Greco - Portrait of an Old Man - WGA10554.jpg"),
    alt: "Portrait often identified as El Greco",
  },
  osman: {
    image: commonsImage("Osman Hamdi Bey.jpg", 700),
    source: commons("Osman Hamdi Bey.jpg"),
    alt: "Photograph of Osman Hamdi Bey",
  },
  goya: {
    image: commonsImage("Francisco de Goya, Autorretrato, 1815.jpg", 700),
    source: commons("Francisco de Goya, Autorretrato, 1815.jpg"),
    alt: "Self-portrait of Francisco Goya",
  },
  copley: {
    image: commonsImage("John Singleton Copley - Self-Portrait - Google Art Project.jpg", 700),
    source: commons("John Singleton Copley - Self-Portrait - Google Art Project.jpg"),
    alt: "Self-portrait of John Singleton Copley",
  },
} as const;


