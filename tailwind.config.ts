import type { Config } from "tailwindcss";

/**
 * BVI Sargassum Monitoring palette.
 * Government-appropriate: ocean blues (primary) + sargassum gold/amber (accent).
 * Clean and official, not playful. High contrast for bright-sunlight readability.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Primary — ocean blue
        ocean: {
          50: "#f0f9fb",
          100: "#d9eff5",
          200: "#b3dfeb",
          300: "#80c6db",
          400: "#47a6c4",
          500: "#2589aa",
          600: "#1b6d8d", // primary
          700: "#185873",
          800: "#184a60",
          900: "#183e52",
          950: "#0c2837",
        },

        // Accent — sargassum gold / amber
        sargassum: {
          50: "#fdf9ec",
          100: "#faf0cb",
          200: "#f5df93",
          300: "#efc85a",
          400: "#eab434",
          500: "#e29b1b", // accent
          600: "#c87914",
          700: "#a65714",
          800: "#874517",
          900: "#733a17",
          950: "#432008",
        },

        // Severity buckets — used by the admin map/table
        // green 1–3, amber 4–6, red 7–10
        severity: {
          low: "#16a34a",
          mid: "#f59e0b",
          high: "#dc2626",
        },
      },
      fontFamily: {
        // Body text
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Title / headings — MADE Tommy Soft Black
        display: ["var(--font-made-tommy)", "var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
