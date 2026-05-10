/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ledger: {
          ink: "#0b1020",
          panel: "#111827",
          line: "#263244",
          mint: "#2dd4bf",
          blue: "#38bdf8",
          amber: "#f59e0b",
          rose: "#fb7185",
        },
      },
    },
  },
  plugins: [],
};
