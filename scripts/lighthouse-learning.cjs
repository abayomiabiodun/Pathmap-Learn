// Prepare a completed path choice only in the isolated performance-test browser.
module.exports = async (browser, { url }) => {
  const page = await browser.newPage();
  try {
    // Use a static document so preparation does not warm app fonts or install its worker.
    await page.goto(new URL('/icon.svg', url).href);
    await page.evaluate((target) => {
      localStorage.removeItem('pathmap-quiz-v1');
      localStorage.removeItem('pathmap-learning-v1');
      if (target === '/learn' || target === '/library' || target.startsWith('/learn/'))
        localStorage.setItem(
          'pathmap-quiz-v1',
          JSON.stringify({
            version: 1,
            draft: {},
            attempts: [],
            selections: [
              { path: 'web', level: 'new', language: 'en', completedAt: '2026-10-11T09:00:00Z' },
            ],
          }),
        );
    }, new URL(url).pathname);
  } finally {
    await page.close();
  }
};
