import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#171717",
        "surface-3": "#1f1f1f",
        border: "#262626",
        "border-2": "#333333",
        "text-1": "#fafafa",
        "text-2": "#a3a3a3",
        "text-3": "#525252",
        accent: "#10b981",
        "accent-dim": "#059669",
        danger: "#ef4444",
        "danger-dim": "#b91c1c",
        warning: "#f59e0b",
        info: "#3b82f6",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
