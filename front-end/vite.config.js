import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = '/[WEGMine]'; 

export default defineConfig({
  plugins: [react()],
  base: repoName, 
});