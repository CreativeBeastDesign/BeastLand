/**
 * Demo wallpaper manifest.
 *
 * The library ships no wallpapers (see `$lib/wallpapers.svelte.ts`) — these
 * five are this app's own, registered at module load from `+layout.svelte`
 * (`<script module>`, before the shell renders). Files live under
 * `static/wallpapers/`. `monolith`/`monolith-pixel`/`ruins`/`bridge` share
 * one palette — deep teal darkness with a pink horizon glow — which
 * `beast-dark` is tuned against; `adler` (an eagle over a garden) is
 * `garden-light`'s pair.
 */

import type { Wallpaper } from "$lib/wallpapers.svelte.js";

export const demoWallpapers: Wallpaper[] = [
  {
    id: "monolith",
    label: "Monolith",
    src: "/wallpapers/monolith.jpg",
    description: "Glowing pyramid over still water",
  },
  {
    id: "monolith-pixel",
    label: "Monolith (pixel)",
    src: "/wallpapers/monolith-pixel.jpg",
    description: "Pixel-art take on the monolith",
  },
  {
    id: "ruins",
    label: "Ruins",
    src: "/wallpapers/ruins.jpg",
    description: "Cat beneath overgrown arches and a floating prism",
  },
  {
    id: "bridge",
    label: "Bridge",
    src: "/wallpapers/bridge.jpg",
    description: "Cat on a branch bridge under a hanging prism",
  },
  {
    id: "adler",
    label: "Adler",
    src: "/wallpapers/adler.jpg",
    description: "An eagle overseeing a garden",
  },
];
