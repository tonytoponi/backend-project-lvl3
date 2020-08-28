import { promises as fs } from 'fs';
import nock from 'nock';
import path from 'path';
import os from 'os';
import rmdir from 'rimraf';
import pageLoader from '../src';

const url = 'https://tonytoponi.github.io';
const testFilePath = path.join(process.cwd(), '/__tests__/__fixtures__/index.html');
const resultFilePath = path.join(process.cwd(), '/__tests__/__fixtures__/localIndex.html');
const testScriptFile = path.join(process.cwd(), '/__tests__/__fixtures__/javascript/index.js');
const testStylesFile = path.join(process.cwd(), '/__tests__/__fixtures__/styles/styles.css');
const imageFiles = [
  '/__tests__/__fixtures__/img/photo-1594667447546-9a7094a69663.jpeg',
  '/__tests__/__fixtures__/img/photo-1595181271233-35297004788d.jpeg',
  '/__tests__/__fixtures__/img/photo-1595296647731-432e76106504.jpeg',
  '/__tests__/__fixtures__/img/photo-1595831229176-ab024bc68fe9.jpeg',
].map((imagePath) => path.join(process.cwd(), imagePath));
let tempDirectory;

describe('Page-load positive tests', () => {
  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/page-loader-'));
  });

  test(
    'Should download to process.cwd() if output directory not set',
    async () => {
      const filePath = path.join(process.cwd(), 'tonytoponi-github-io.html');
      const document = '<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>';
      const scope = nock(url)
        .get('/')
        .reply(200, document);
      await pageLoader(url);
      expect(scope.isDone()).toBeTruthy();
      await expect(fs.readFile(filePath, 'utf-8')).resolves.toBe(document);
      await fs.unlink(filePath);
    },
  );

  test(
    'Should download page, resources from page, and all links to local then request is correct',
    async () => {
      const result = await fs.readFile(resultFilePath, 'utf-8');
      const script = await fs.readFile(testScriptFile, 'utf-8');
      const styles = await fs.readFile(testStylesFile, 'utf-8');
      const images = await Promise.all(imageFiles.map((image) => fs.readFile(image)));
      const scope = nock(url)
        .get('/')
        .replyWithFile(200, testFilePath, {
          'Content-Type': 'text/html',
        })
        .get('/javascript/index.js')
        .replyWithFile(200, testScriptFile, {
          'Content-Type': 'text/javascript',
        })
        .get('/styles/styles.css')
        .replyWithFile(200, testStylesFile, {
          'Content-Type': 'text/css',
        })
        .get('/img/photo-1594667447546-9a7094a69663.jpeg')
        .replyWithFile(200, imageFiles[0], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595181271233-35297004788d.jpeg')
        .replyWithFile(200, imageFiles[1], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595296647731-432e76106504.jpeg')
        .replyWithFile(200, imageFiles[2], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595831229176-ab024bc68fe9.jpeg')
        .replyWithFile(200, imageFiles[3], {
          'Content-Type': 'image/jpeg',
        });
      await pageLoader(url, tempDirectory);
      expect(scope.isDone()).toBeTruthy();
      const tempFilePath = path.join(tempDirectory, 'tonytoponi-github-io.html');
      const tempScriptPath = path.join(tempDirectory, 'tonytoponi-github-io_files/javascript-index.js');
      const tempStylePath = path.join(tempDirectory, 'tonytoponi-github-io_files/styles-styles.css');
      const tempImages = [
        'tonytoponi-github-io_files/img-photo-1594667447546-9a7094a69663.jpeg',
        'tonytoponi-github-io_files/img-photo-1595181271233-35297004788d.jpeg',
        'tonytoponi-github-io_files/img-photo-1595296647731-432e76106504.jpeg',
        'tonytoponi-github-io_files/img-photo-1595831229176-ab024bc68fe9.jpeg',
      ].map((imagePath) => path.join(tempDirectory, imagePath));
      await expect(fs.readFile(tempFilePath, 'utf-8')).resolves.toBe(result);
      await expect(fs.readFile(tempScriptPath, 'utf-8')).resolves.toBe(script);
      await expect(fs.readFile(tempStylePath, 'utf-8')).resolves.toBe(styles);
      tempImages.map((image, i) => expect(fs.readFile(image)).resolves.toStrictEqual(images[i]));
    },
  );

  afterEach(async () => {
    await fs.unlink(path.join(tempDirectory, 'tonytoponi-github-io.html'));
    await rmdir(tempDirectory, (error) => error);
  });
});

describe('Page-load negative cases', () => {
  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/page-loader-'));
  });

  test(
    'Should throw an error then resources directory already exists',
    async () => {
      const resourcesDirectoryPath = path.join(tempDirectory, 'tonytoponi-github-io_files');
      const document = '<!DOCTYPE html><html><body><h1>Hello World</h1><img src="./img/test.jpeg"/></body></html>';
      const message = `Can't save data at disc. Error: EEXIST: file already exists, mkdir '${tempDirectory}/tonytoponi-github-io_files'`;
      await fs.mkdir(resourcesDirectoryPath);
      const scope = nock(url)
        .get('/')
        .reply(200, document)
        .get('/img/test.jpeg')
        .replyWithFile(200, imageFiles[0], {
          'Content-Type': 'image/jpeg',
        });
      await expect(pageLoader(url, tempDirectory)).rejects.toThrow(message);
      expect(scope.isDone()).toBeTruthy();
    },
  );

  test(
    'Should throw an error then target directory not exist',
    async () => {
      const document = '<!DOCTYPE html><html><body><h1>Hello World</h1></body></html>';
      const message = "Can't save data at disc. Error: ENOENT: no such file or directory, open '/tmp/boom/tonytoponi-github-io.html'";
      const scope = nock(url)
        .get('/')
        .reply(200, document);
      await expect(pageLoader(url, '/tmp/boom')).rejects.toThrow(message);
      expect(scope.isDone()).toBeTruthy();
    },
  );

  test(
    'Should throw an error then resource not downloaded',
    async () => {
      const document = '<!DOCTYPE html><html><body><h1>Hello World</h1><img src="./img/test.jpeg"/></body></html>';
      const message = "Can't download resource https://tonytoponi.github.io/img/test.jpeg Request failed with status code 404";
      const scope = nock(url)
        .get('/')
        .reply(200, document)
        .get('/img/test.jpeg')
        .reply(404);
      await expect(pageLoader(url, tempDirectory)).rejects.toThrow(message);
      expect(scope.isDone()).toBeTruthy();
    },
  );

  afterEach(async () => {
    await rmdir(tempDirectory, (error) => error);
  });
});
