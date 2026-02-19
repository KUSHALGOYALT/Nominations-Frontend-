/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        "hexa-primary": "#1E40AF", // Royal Blue (blue-800)
        "hexa-secondary": "#2563EB", // Lighter Royal Blue (blue-600)
        "hexa-dark": "#172554", // Deep Blue (blue-950)
        "hexa-light": "#EFF6FF", // Light Blue (blue-50)
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)",
        "card-lg": "0 4px 24px -4px rgba(15, 118, 110, 0.12), 0 1px 3px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      animation: {
        "spin": "spin 0.8s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
