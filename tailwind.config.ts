import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saiyan: {
          orange: "#f4820e",
          blue: "#2a6ff0",
        },
      },
    },
  },
  plugins: [],
};

export default config;
