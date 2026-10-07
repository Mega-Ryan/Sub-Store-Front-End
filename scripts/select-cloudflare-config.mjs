import { copyFile } from 'node:fs/promises';

const environment = process.argv[2] || 'staging';
if (!['staging', 'production'].includes(environment)) {
  throw new Error('Environment must be staging or production');
}
// Pages CLI currently requires the standard root filename.
// Named templates remain the source of truth; generated selection is ignored by Git.
await copyFile(new URL('../wrangler.' + environment + '.jsonc', import.meta.url), new URL('../wrangler.jsonc', import.meta.url));
console.log('Selected Pages configuration: ' + environment);
