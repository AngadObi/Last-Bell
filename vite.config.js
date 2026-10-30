import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Ship the holiday data as its own file too, so dates can be refreshed
// without touching the app code. The app also bundles a copy for offline use.
const holidayFile = () => ({
  name: 'holiday-data-file',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'data/holidays.json',
      source: readFileSync('src/data/holidays.json', 'utf8'),
    });
  },
});

export default defineConfig({ base: './', plugins: [holidayFile()], build: { target: 'es2020' } });
