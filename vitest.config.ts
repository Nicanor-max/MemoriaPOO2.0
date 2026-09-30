import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Se mide TODO el código de producción, aunque algún archivo no lo importe un test.
      include: ['src/**/*.ts'],
      // Los archivos que sólo tienen interfaces/tipos no generan código ejecutable.
      exclude: ['src/interfaces/**', 'src/index.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'cobertura',
      thresholds: { lines: 90.01 },
    },
  },
});
