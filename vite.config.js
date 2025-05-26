import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  console.log('Loaded environment variables:', {
    VITE_OPENAI_API_KEY: env.VITE_OPENAI_API_KEY ? 'Present' : 'Missing',
  })

  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Make env variables available to the app
    define: {
      'process.env': env
    }
  }
}) 