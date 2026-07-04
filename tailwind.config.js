/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mantle: '#00D9A3',
        byreal: '#9D4EDD',
        solana: '#FFB703',
        meth: '#00D4FF',
        xeyit: '#FF6B6B',
      },
    },
  },
  plugins: [],
}
