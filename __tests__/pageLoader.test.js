import { promises as fs } from 'fs';
import nock from 'nock';
import path from 'path';
import os from 'os';
import pageLoader from '../src';

const url = 'https://tonytoponi.github.io';
const testFilePath = path.join(process.cwd(), '/__tests__/__fixtures__/index.html');
const testScriptFile = path.join(process.cwd(), '/__tests__/__fixtures__/javascript/index.js');
const testStylesFile = path.join(process.cwd(), '/__tests__/__fixtures__/styles/styles.css');
const imageFiles = [
  '/__tests__/__fixtures__/img/photo-1594667447546-9a7094a69663.jpeg',
  '/__tests__/__fixtures__/img/photo-1595181271233-35297004788d.jpeg',
  '/__tests__/__fixtures__/img/photo-1595296647731-432e76106504.jpeg',
  '/__tests__/__fixtures__/img/photo-1595831229176-ab024bc68fe9.jpeg',
].map((imagePath) => path.join(process.cwd(), imagePath));
let tempDirectory;

describe('Page-load tests', () => {
  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/page-loader-'));
  });
  test(
    'Should download page, resourses from page, and all links to local then request is correct',
    async () => {
      const body = await fs.readFile(testFilePath, 'utf-8');
      const script = await fs.readFile(testScriptFile, 'utf-8');
      const styles = await fs.readFile(testStylesFile, 'utf-8');
      const images = await imageFiles.map((image) => fs.readFile(image, 'binary'));
      const scope = nock(url)
        .get('/')
        .reply(200, body)
        .get('/javascript/index.js')
        .reply(200, script)
        .get('/style/styles.css')
        .reply(200, styles)
        .get('/img/photo-1594667447546-9a7094a69663.jpeg')
        .reply(200, images[0])
        .get('/img/photo-1595181271233-35297004788d.jpeg')
        .reply(200, images[1])
        .get('/img/photo-1595296647731-432e76106504.jpeg')
        .reply(200, images[2])
        .get('/img/photo-1595831229176-ab024bc68fe9.jpeg')
        .reply(200, images[3]);
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

test(
  'Should download page at process.cwd directory by default',
  async () => {
    const body = await fs.readFile(testFilePath, 'utf-8');
    const scope = nock(url)
      .get('/')
      .reply(200, body);
    await pageLoader(url);
    expect(scope.isDone()).toBeTruthy();
    const tempFilePath = path.join(process.cwd(), 'tonytoponi-github-io.html');
    await expect(fs.readFile(tempFilePath, 'utf-8')).resolves.toBe(body);
    await fs.unlink(tempFilePath);
  },
);
