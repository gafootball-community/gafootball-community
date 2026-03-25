import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#050706',
        panel: '#0d1512',
        panelSoft: '#111d18',
        accent: '#23c16b',
        accentSoft: '#174f33',
        textMain: '#ecf4ef',
        textSub: '#9ab3a5',
        bubbleSelf: '#1d9d58',
        bubbleOther: '#1a2520'
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
