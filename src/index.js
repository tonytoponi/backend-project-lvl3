import axios from 'axios';
import debug from 'debug';
import path from 'path';
import Listr from 'listr';
import { promises as fs } from 'fs';
import processPage from './page';
import { generatePageName, generateFolderName } from './localNameGenerators';

const log = debug('page-loader');

const listrSettings = {
  concurrent: true,
  showSubtasks: true,
  collapse: false,
};

const saveFile = (filePath, data) => fs.writeFile(filePath, data)
  .catch((error) => { throw new Error(`Can't save data at disc. ${error}`); });

const streamToBuffer = ({ data: inputStream }) => new Promise((resolve, reject) => {
  const chunks = [];
  inputStream.on('data', (chunk) => chunks.push(chunk));
  inputStream.once('end', () => resolve(Buffer.concat(chunks)));
  inputStream.once('error', (error) => reject(new Error(`Can't download resource ${error}`)));
});

const sendGetRequest = (http, url) => {
  const config = {
    method: 'get',
    url,
    responseType: 'stream',
  };
  const riseError = ({ message }) => {
    const errorMessage = `Can't download resource ${url} ${message}`;
    throw new Error(errorMessage);
  };
  return http(config).catch(riseError);
};

const downloadFile = (http, { url, pathToFile }) => sendGetRequest(http, url)
  .then(streamToBuffer)
  .then((buffer) => saveFile(pathToFile, buffer));

const downloadResources = (http, fileData) => {
  const resourcesTasks = new Listr(fileData.map((data) => ({
    title: `Download ${data.url}`,
    task: () => downloadFile(http, data),
  })), listrSettings);
  return resourcesTasks.run();
};

const makeFolder = (folderPath) => {
  const raiseError = (error) => { throw new Error(`Can't make folder. ${error}`); };
  return fs.mkdir(folderPath).catch(raiseError);
};

const createFileData = (resources, baseURL, dir) => resources.map(({ link, localFilePath }) => ({
  url: new URL(link, baseURL).href,
  pathToFile: path.join(dir, localFilePath),
}));

const loadPage = (baseURL, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL,
  });
  const localPageName = generatePageName(baseURL);
  const localPagePath = path.join(outputDirectory, localPageName);
  const folderName = generateFolderName(baseURL);
  const folderPath = path.join(outputDirectory, folderName);
  log(localPagePath);
  log(folderPath);
  return sendGetRequest(http, baseURL)
    .then(streamToBuffer)
    .then((buffer) => processPage(buffer.toString('utf-8'), folderName))
    .then(({ html, resources }) => {
      if (resources.length === 0) {
        return saveFile(localPagePath, html);
      }
      const fileData = createFileData(resources, baseURL, outputDirectory);
      log(fileData);
      return saveFile(localPagePath, html)
        .then(() => makeFolder(folderPath))
        .then(() => downloadResources(http, fileData));
    });
};

export default loadPage;
