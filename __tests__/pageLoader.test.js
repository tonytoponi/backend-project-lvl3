import { promises as fs } from 'fs';
import nock from 'nock';
import path from 'path';
import os from 'os';
import loadPage from '../src';

let tempDirectory;

const getFixturePath = (filename) => path.join(__dirname, '..', '__tests__', '__fixtures__', filename);
const getTempFilePath = (filename) => path.join(tempDirectory, filename);
const readFile = (filename) => fs.readFile(filename, 'utf-8');

const url = 'https://tonytoponi.github.io';
const testFilePath = getFixturePath('index.html');
const resultFilePath = getFixturePath('resultIndex.html');
const testScriptPath = getFixturePath('javascript/index.js');
const testStylesPath = getFixturePath('styles/styles.css');
const imagePaths = [
  'img/photo-1594667447546-9a7094a69663.png',
  'img/photo-1595181271233-35297004788d.png',
  'img/photo-1595296647731-432e76106504.png',
  'img/photo-1595831229176-ab024bc68fe9.png',
].map(getFixturePath);


describe('Page-load tests', () => {
  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), '/page-loader-'));
  });

  test(
    'Should download to current work directory if output directory not set',
    async () => {
      const filePath = path.join(process.cwd(), 'tonytoponi-github-io.html');
      const document = '<!DOCTYPE html><html><head></head><body><h1>Hello World</h1></body></html>';
      nock(url)
        .get('/')
        .reply(200, document);
      await loadPage(url);
      await expect(readFile(filePath)).resolves.toBe(document);
      await fs.unlink(filePath);
    },
  );

  test(
    'Should download page, resources from page, and all links to local then request is correct',
    async () => {
      nock(url)
        .get('/')
        .replyWithFile(200, testFilePath, {
          'Content-Type': 'text/html',
        })
        .get('/javascript/index.js')
        .replyWithFile(200, testScriptPath, {
          'Content-Type': 'text/javascript',
        })
        .get('/styles/styles.css')
        .replyWithFile(200, testStylesPath, {
          'Content-Type': 'text/css',
        })
        .get('/img/photo-1594667447546-9a7094a69663.png')
        .replyWithFile(200, imagePaths[0], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595181271233-35297004788d.png')
        .replyWithFile(200, imagePaths[1], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595296647731-432e76106504.png')
        .replyWithFile(200, imagePaths[2], {
          'Content-Type': 'image/jpeg',
        })
        .get('/img/photo-1595831229176-ab024bc68fe9.png')
        .replyWithFile(200, imagePaths[3], {
          'Content-Type': 'image/jpeg',
        });
      await loadPage(url, tempDirectory);
      const tempFilePath = getTempFilePath('tonytoponi-github-io.html');
      const tempScriptPath = getTempFilePath('tonytoponi-github-io_files/javascript-index.js');
      const tempStylePath = getTempFilePath('tonytoponi-github-io_files/styles-styles.css');
      const tempImages = [
        'tonytoponi-github-io_files/img-photo-1594667447546-9a7094a69663.png',
        'tonytoponi-github-io_files/img-photo-1595181271233-35297004788d.png',
        'tonytoponi-github-io_files/img-photo-1595296647731-432e76106504.png',
        'tonytoponi-github-io_files/img-photo-1595831229176-ab024bc68fe9.png',
      ].map(getTempFilePath);
      await expect(readFile(tempFilePath, 'utf-8')).resolves.toBe(await readFile(resultFilePath));
      await expect(readFile(tempScriptPath, 'utf-8')).resolves.toBe(await readFile(testScriptPath));
      await expect(readFile(tempStylePath, 'utf-8')).resolves.toBe(await readFile(testStylesPath));
      tempImages.map(async (image, i) => expect(await readFile(image))
        .toEqual(await readFile(imagePaths[i])));
    },
  );

  test(
    'Should throw an error then resources directory already exists',
    async () => {
      const resourcesDirectoryPath = getTempFilePath('tonytoponi-github-io_files');
      const document = '<!DOCTYPE html><html><head></head><body><h1>Hello World</h1><img src="./img/test.png"/></body></html>';
      const message = `Can't make folder. Error: EEXIST: file already exists, mkdir '${tempDirectory}/tonytoponi-github-io_files'`;
      await fs.mkdir(resourcesDirectoryPath);
      nock(url)
        .get('/')
        .reply(200, document);
      await expect(loadPage(url, tempDirectory)).rejects.toThrow(message);
    },
  );

  test(
    'Should throw an error then target directory not exist',
    async () => {
      const document = '<!DOCTYPE html><html><head></head><body><h1>Hello World</h1></body></html>';
      const message = "Can't save data at disc. Error: ENOENT: no such file or directory, open '/tmp/boom/tonytoponi-github-io.html'";
      nock(url)
        .get('/')
        .reply(200, document);
      await expect(loadPage(url, '/tmp/boom')).rejects.toThrow(message);
    },
  );

  test(
    'Should throw an error then page not accessible',
    async () => {
      const document = '<!DOCTYPE html><html><head></head><body><h1>Hello World</h1></body></html>';
      const message = "Can't download resource https://tonytoponi.github.io Request failed with status code 404";
      nock(url)
        .get('/')
        .reply(404, document);
      await expect(loadPage(url, tempDirectory)).rejects.toThrow(message);
    },
  );
});
