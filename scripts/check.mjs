import { spawnSync } from 'node:child_process';
const commands = ['lint', 'typecheck', 'test', 'test:db', 'build', 'test:e2e'];
for (const command of commands) {
  const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [command], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
