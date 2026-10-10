import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('public/fonts', { recursive: true });
for (const name of ['manrope', 'dm-sans']) {
  for (const subset of ['latin', 'latin-ext']) {
    await copyFile(
      `node_modules/@fontsource-variable/${name}/files/${name}-${subset}-wght-normal.woff2`,
      `public/fonts/${name}-${subset}.woff2`,
    );
  }
  await copyFile(
    `node_modules/@fontsource-variable/${name}/LICENSE`,
    `public/fonts/${name}-LICENSE.txt`,
  );
}
