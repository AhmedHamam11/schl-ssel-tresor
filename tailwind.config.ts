import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tresor: {
          bg: "#f4f5f7",
          line: "#e2e5ea",
          text: "#1f2733",
          muted: "#6b7280",
          blau: "#1d4e89",
        },
        status: {
          gruen: "#1e9e5a",
          gelb: "#d9a406",
          rot: "#c8362f",
          grau: "#9aa3af",
        },
      },
      fontFamily: { sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
