import { expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import fs from 'node:fs';
import ts from 'typescript';
import en from '../messages/en.json';
import fr from '../messages/fr.json';
import pcm from '../messages/pcm.json';
import yo from '../messages/yo.json';
import ha from '../messages/ha.json';
import ig from '../messages/ig.json';

for (const [locale, messages] of Object.entries({ en, fr, pcm, yo, ha, ig })) {
  it(`${locale} covers every message and contains valid translation syntax`, () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
    const errors: unknown[] = [];
    const translate = createTranslator({
      locale,
      messages,
      onError: (error) => errors.push(error),
    });
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      const values = Object.fromEntries(
        [...en[key].matchAll(/\{(\w+)\}/g)].map((match) => [
          match[1],
          ['current', 'total', 'percent'].includes(match[1]) ? 2 : 'example',
        ]),
      );
      expect(translate(key, values)).not.toBe('');
    }
    expect(errors).toEqual([]);
  });
}

it('all page and component copy uses translations, apart from the product name', () => {
  const files = ['src/app', 'src/components'].flatMap((root) =>
    fs
      .readdirSync(root, { recursive: true })
      .filter((file) => String(file).endsWith('.tsx'))
      .map((file) => `${root}/${file}`),
  );
  const untranslated: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        const text = node.text.trim();
        if (/[A-Za-z]/.test(text) && !['pathmap', 'LEARN', 'PathMap Learn'].includes(text))
          untranslated.push(`${file}: ${text}`);
      }
      if (
        ts.isJsxAttribute(node) &&
        ['aria-label', 'alt', 'placeholder', 'title'].includes(node.name.getText(ast)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer)
      )
        untranslated.push(`${file}: ${node.initializer.text}`);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(untranslated).toEqual([]);
});
