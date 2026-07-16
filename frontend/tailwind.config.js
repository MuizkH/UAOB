/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: {
            dark: '#0B1120',
            darker: '#070A14',
            light: '#F8FAFC',
            lighter: '#FFFFFF'
          },
          panel: {
            dark: '#1E293B',
            light: '#F1F5F9'
          },
          border: {
            dark: '#334155',
            light: '#E2E8F0'
          },
          accent: {
            blue: '#3B82F6',     // Electric Blue
            amber: '#F59E0B',    // Safety Alert Amber
            green: '#10B981',    // Running/Safe Green
            red: '#EF4444',      // Error/Emergency Red
            cyan: '#06B6D4'      // Status Cyan
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['IBM Plex Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
