import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-fg)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        surface: "var(--color-surface)",
        accent: "var(--color-accent)"
      },
      borderRadius: {
        card: "10px"
      },
      boxShadow: {
        subtle: "0 6px 20px rgba(0,0,0,0.05)"
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "system-ui", "sans-serif"],
        body: ["\"IBM Plex Sans\"", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
