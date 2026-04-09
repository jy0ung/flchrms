import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      // No screens override: use Tailwind defaults (max-w-7xl = 1280px, max-w-full uncapped)
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Enterprise typography scale
        "xs": ["0.8125rem", { lineHeight: "1.2" }],       // 13px
        "sm": ["0.875rem", { lineHeight: "1.42" }],       // 14px
        "base": ["1rem", { lineHeight: "1.6" }],          // 16px
        "lg": ["1.125rem", { lineHeight: "1.5" }],        // 18px
        "xl": ["1.25rem", { lineHeight: "1.4" }],         // 20px
        "2xl": ["1.5rem", { lineHeight: "1.3" }],         // 24px
        "3xl": ["1.875rem", { lineHeight: "1.2" }],       // 30px
        "4xl": ["2.25rem", { lineHeight: "1.1" }],        // 36px
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    // Typography utility classes
    function ({ addComponents }: any) {
      addComponents({
        ".t-h1": {
          "@apply text-4xl font-semibold leading-none tracking-tight": {},
        },
        ".t-h2": {
          "@apply text-3xl font-semibold leading-tight tracking-tight": {},
        },
        ".t-h3": {
          "@apply text-xl font-semibold leading-tight tracking-tight": {},
        },
        ".t-h4": {
          "@apply text-lg font-semibold leading-tight tracking-tight": {},
        },
        ".t-body": {
          "@apply text-base leading-relaxed": {},
        },
        ".t-body-sm": {
          "@apply text-sm leading-relaxed": {},
        },
        ".t-label": {
          "@apply text-sm font-medium": {},
        },
        ".t-meta": {
          "@apply text-xs font-normal text-muted-foreground": {},
        },
      });
    },
  ],
} satisfies Config;
