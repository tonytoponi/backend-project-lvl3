import { promises as fs } from 'fs';
import nock from 'nock';
import path from 'path';
import os from 'os';
import pageLoader from '../src';

const url = 'https://tonytoponi.github.io';
const testFilePath = path.join(process.cwd(), '/__tests__/__fixtures__/test.html');
let tempDirectory;

describe('Page-load tests', () => {
  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/page-loader-'));
  });
  test(
    'Should download page then request is correct',
    async () => {
      const body = await fs.readFile(testFilePath, 'utf-8');
      const scope = nock(url)
        .get('/')
        .reply(200, body);
      await pageLoader(url, tempDirectory);
      expect(scope.isDone()).toBeTruthy();
      const tempFilePath = path.join(tempDirectory, 'tonytoponi-github-io.html');
      await expect(fs.readFile(tempFilePath, 'utf-8')).resolves.toBe(body);
    },
  );

  afterEach(async () => {
    await fs.unlink(path.join(tempDirectory, 'tonytoponi-github-io.html'));
    await fs.rmdir(tempDirectory);
  });
});
