import fs from 'fs';
import path from 'path';

describe('package runtime entrypoint scripts', () => {
  it('points production entrypoints at the compiled server output', () => {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    expect(packageJson.main).toBe('dist/src/server.js');
    expect(packageJson.scripts.start).toBe('node dist/src/server.js');
  });
});
