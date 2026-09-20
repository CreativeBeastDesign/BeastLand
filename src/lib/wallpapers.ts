/**
 * Wallpaper manifest.
 *
 * Files live under `static/wallpapers/`. All four share the same palette:
 * deep teal darkness with a pink horizon glow, which is what the brand theme
 * (`beast-dark`) is tuned against.
 */

export type WallpaperId = "monolith" | "monolith-pixel" | "ruins" | "bridge" | "adler";

export type Wallpaper = {
  id: WallpaperId;
  label: string;
  src: string;
  /** Short description used by the showcase and the terminal `wallpaper` command. */
  description: string;
};

export const wallpapers: Record<WallpaperId, Wallpaper> = {
  monolith: {
    id: "monolith",
    label: "Monolith",
    src: "/wallpapers/monolith.jpg",
    description: "Glowing pyramid over still water",
  },
  "monolith-pixel": {
    id: "monolith-pixel",
    label: "Monolith (pixel)",
    src: "/wallpapers/monolith-pixel.jpg",
    description: "Pixel-art take on the monolith",
  },
  ruins: {
    id: "ruins",
    label: "Ruins",
    src: "/wallpapers/ruins.jpg",
    description: "Cat beneath overgrown arches and a floating prism",
  },
  bridge: {
    id: "bridge",
    label: "Bridge",
    src: "/wallpapers/bridge.jpg",
    description: "Cat on a branch bridge under a hanging prism",
  },
  adler: {
    id: "adler",
    label: "Adler",
    src: "/wallpapers/adler.jpg",
    description: "An eagle overseeing a garden",
  },
};

export const wallpaperIds = Object.keys(wallpapers) as WallpaperId[];

export const defaultWallpaper: Wallpaper = wallpapers.monolith;

export function isWallpaperId(value: string): value is WallpaperId {
  return value in wallpapers;
}

export function getWallpaper(id: WallpaperId | string): Wallpaper {
  return wallpapers[id as WallpaperId] ?? defaultWallpaper;
}
