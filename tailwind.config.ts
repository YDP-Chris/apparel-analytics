import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    transparent: "transparent",
    current: "currentColor",
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // SoCal/Vuori-inspired palette
        socal: {
          // Ocean blues - primary accent
          ocean: {
            50: "#e6f4f8",
            100: "#cce9f1",
            200: "#99d3e3",
            300: "#66bdd5",
            400: "#33a7c7",
            500: "#2c7da0",
            600: "#1a5f7a",
            700: "#144a5f",
            800: "#0d3544",
            900: "#071f29",
          },
          // Sand/warm neutrals
          sand: {
            50: "#fefcf8",
            100: "#fdf8ed",
            200: "#faedcd",
            300: "#e9d8a6",
            400: "#ddb892",
            500: "#d4a373",
            600: "#bc8a5f",
            700: "#a47148",
            800: "#7a5534",
            900: "#513820",
          },
          // Sage greens
          sage: {
            50: "#f4f6f0",
            100: "#e9ede1",
            200: "#cad2c5",
            300: "#a3b18a",
            400: "#84a98c",
            500: "#606c38",
            600: "#4a5428",
            700: "#3a4220",
            800: "#2a3018",
            900: "#1a1e10",
          },
          // Sunset/terracotta - for highlights
          sunset: {
            50: "#fef3f0",
            100: "#fce7e1",
            200: "#f9cfc3",
            300: "#f3a896",
            400: "#e07a5f",
            500: "#c96a52",
            600: "#bc6c25",
            700: "#9a5a20",
            800: "#78471a",
            900: "#563414",
          },
          // Stone - warm grays for backgrounds
          stone: {
            50: "#fafaf9",
            100: "#f5f5f4",
            200: "#e7e5e4",
            300: "#d6d3d1",
            400: "#a8a29e",
            500: "#78716c",
            600: "#57534e",
            700: "#44403c",
            800: "#292524",
            900: "#1c1917",
          },
        },
        // Override tremor with SoCal palette
        tremor: {
          brand: {
            faint: "#e6f4f8",
            muted: "#99d3e3",
            subtle: "#2c7da0",
            DEFAULT: "#1a5f7a",
            emphasis: "#144a5f",
            inverted: "#fefcf8",
          },
          background: {
            muted: "#f5f5f4",
            subtle: "#fdf8ed",
            DEFAULT: "#fafaf9",
            emphasis: "#e7e5e4",
          },
          border: {
            DEFAULT: "#e7e5e4",
          },
          ring: {
            DEFAULT: "#cad2c5",
          },
          content: {
            subtle: "#78716c",
            DEFAULT: "#57534e",
            emphasis: "#292524",
            strong: "#1c1917",
            inverted: "#fafaf9",
          },
        },
      },
      boxShadow: {
        "tremor-input": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "tremor-card": "0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
        "tremor-dropdown": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
        "soft": "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
      },
      borderRadius: {
        "tremor-small": "0.375rem",
        "tremor-default": "0.5rem",
        "tremor-full": "9999px",
      },
      fontSize: {
        "tremor-label": ["0.75rem", { lineHeight: "1rem" }],
        "tremor-default": ["0.875rem", { lineHeight: "1.25rem" }],
        "tremor-title": ["1.125rem", { lineHeight: "1.75rem" }],
        "tremor-metric": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"],
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
    },
  ],
  plugins: [],
};
export default config;
