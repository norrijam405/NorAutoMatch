import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#071018",
        panel: "#0e1a26",
        amber: {
          300: "#fbc76b",
          400: "#f6a928",
          500: "#e9900d"
        },
        emerald: {
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981"
        }
      },
      boxShadow: {
        glow: "0 0 50px rgba(246,169,40,.14)",
        card: "0 24px 80px rgba(0,0,0,.36)"
      },
      animation: {
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
        "slide-up": "slideUp .45s ease-out both"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".65" }
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
