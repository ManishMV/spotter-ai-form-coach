import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// `npm run dev`       → laptop only, http://localhost:5173
// `npm run dev:phone` → also reachable from phones on the same Wi-Fi, over https
//                       (phones only allow the camera on https links)
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'phone' ? [basicSsl()] : [])],
}))
