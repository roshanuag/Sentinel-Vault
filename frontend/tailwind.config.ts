import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        vintage: {
          bg: "#F7F4EE",
          card: "#FFFFFF",
          cardWarm: "#FCFAF7",
          text: "#2A2421",
          mutedText: "#7E756B",
          faintText: "#9F9588",
          primary: "#A07855",
          primaryHover: "#8D6544",
          secondary: "#E4DFD7",
          secondaryHover: "#D9D3CA",
          accent: "#DDD5C7",
          muted: "#EDE6DA",
          destructive: "#BA4A38",
          destructiveHover: "#A53E2D",
          border: "#D5CDBD",
          borderStrong: "#B8ADA0",
          emerald: "#2E7D5B",
          amber: "#B87720",
          violet: "#7D6B9C",
        },
        soc: {
          bg: "#F7F4EE",
          secondary: "#EDE6DA",
          panel: "rgba(255, 255, 255, 0.85)",
          panelSolid: "#FCFAF7",
          border: "#D5CDBD",
          borderStrong: "#B8ADA0",
          text: "#2A2421",
          muted: "#7E756B",
          faint: "#9F9588",
          emerald: "#2E7D5B",
          crimson: "#BA4A38",
          amber: "#B87720",
          slate: "#857E76",
          violet: "#7D6B9C",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [tailwindcssAnimate],
}
export default config
