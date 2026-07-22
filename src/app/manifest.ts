import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BVI Sargassum Monitoring",
    short_name: "Sargassum BVI",
    description:
      "Report sargassum sightings to help the Ministry of Environment, Natural Resources & Climate Change monitor the Territory.",
    start_url: "/",
    display: "standalone",
    background_color: "#123950",
    theme_color: "#1b6d8d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
