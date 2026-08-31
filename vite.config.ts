import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// served from https://<user>.github.io/school-scheduler/
export default defineConfig({
  base: '/school-scheduler/',
  plugins: [react()],
})
