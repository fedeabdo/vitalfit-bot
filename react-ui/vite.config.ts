import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server:{
  host: "0.0.0.0",
   hmr: { 
     clientPort: 5173,
   },
   allowedHosts: ["vitalfit.uy", "www.vitalfit.uy"],
  },   
  plugins: [react()],
  css: {
    modules: {
      localsConvention: 'camelCase', // Optional but recommended
    }
  }
});
