import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // ShadowNode design tokens
        void: "#000000",
        abyss: "#0a0a0f",
        slate9: "#0f172a",
        cyan: {
          DEFAULT: "#00f0ff",
          glow: "#22d3ee",
          deep: "#0891b2",
        },
        alert: "#ff0044",
        ok: "#22c55e",
        border: "hsl(240 10% 18%)",
        input: "hsl(240 10% 18%)",
        ring: "#00f0ff",
        background: "hsl(240 10% 4%)",
        foreground: "hsl(0 0% 98%)",
        primary: {
          DEFAULT: "#00f0ff",
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "hsl(240 10% 14%)",
          foreground: "hsl(240 5% 65%)",
        },
        card: {
          DEFAULT: "rgba(255,255,255,0.04)",
          foreground: "hsl(0 0% 98%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0,240,255,0.35), 0 0 40px rgba(0,240,255,0.15)",
        "glow-lg": "0 0 30px rgba(0,240,255,0.5), 0 0 80px rgba(0,240,255,0.25)",
        "glow-sm": "0 0 12px rgba(0,240,255,0.3)",
      },
      backgroundImage: {
        "radial-fade": "radial-gradient(circle at 50% 0%, rgba(0,240,255,0.08), transparent 60%)",
        "void-gradient": "linear-gradient(180deg, #000000 0%, #0a0a0f 100%)",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 12px rgba(0,240,255,0.3)" },
          "50%": { opacity: "0.6", boxShadow: "0 0 24px rgba(0,240,255,0.6)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2.5s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
        shimmer: "shimmer 2s infinite",
        scan: "scan 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
