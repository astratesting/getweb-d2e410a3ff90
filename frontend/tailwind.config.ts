import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#e94560",
          dark: "#c73652",
        },
        dark: {
          DEFAULT: "#1a1a2e",
          mid: "#16213e",
          light: "#0f3460",
        },
      },
    },
  },
  plugins: [],
};

export default config;
