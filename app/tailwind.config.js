/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "var(--color-border)",
        input: "var(--color-bg)",
        ring: "var(--color-brand)",
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        primary: {
          DEFAULT: "var(--color-brand)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--color-bg-raised)",
          foreground: "var(--color-text-secondary)",
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--color-bg-hover)",
          foreground: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-brand)",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "var(--color-bg-raised)",
          foreground: "var(--color-text)",
        },
        sidebar: {
          DEFAULT: "var(--color-bg)",
          foreground: "var(--color-text)",
          primary: "var(--color-brand)",
          "primary-foreground": "#ffffff",
          accent: "var(--color-bg-hover)",
          "accent-foreground": "var(--color-text)",
          border: "var(--color-border)",
          ring: "var(--color-brand)",
        },
      },
      borderRadius: {
        card: "var(--radius-card)",
        btn: "var(--radius-btn)",
        input: "var(--radius-input)",
        sm: "var(--radius-sm)",
        full: "var(--radius-full)",
        lg: "var(--radius-card)",
        md: "var(--radius-btn)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      fontSize: {
        'xs': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'base': ['15px', { lineHeight: '1.5', fontWeight: '400' }],
        'lg': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'xl': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        '2xl': ['32px', { lineHeight: '1.15', fontWeight: '700' }],
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
      transitionTimingFunction: {
        out: 'ease-out',
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
        "slide-up": "slide-up 250ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}