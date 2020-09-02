import { promises as fs, createWriteStream } from 'fs';
import axios from 'axios';
import path from 'path';
import debug from 'debug';
import { isBinary } from 'istextorbinary';
import Listr from 'listr';
import { parse } from 'url';
import { getAllResourcesLinks, changeLink } from './page.js';

require('axios-debug-log');

const listrSettings = {
  showSubtasks: true,
  collapse: false,
};

const streamToFile = (inputStream, filePath) => new Promise((resolve, reject) => {
  const fileWriteStream = createWriteStream(filePath);
  inputStream
    .pipe(fileWriteStream)
    .on('finish', resolve)
    .on('error', reject);
});

const generateName = (pageUrl, type = '.html') => {
  const lastSymbol = /[/]$/gi;
  const firstSymbol = /^[/]/;
  const nonSymbolDigit = /[^a-z\d]/gi;
  const { hostname, pathname } = parse(pageUrl);
  if (hostname) {
    const pageLocation = hostname.concat(pathname);
    const name = pageLocation.replace(lastSymbol, '').replace(nonSymbolDigit, '-').concat(type);
    return name;
  }
  const name = pathname.replace(firstSymbol, '').replace(lastSymbol, '').replace(nonSymbolDigit, '-').concat(type);
  return name;
};

const downloadData = (http, url) => {
  const { pathname } = parse(url);
  const { base } = path.parse(pathname);
  const handleError = ({ message }) => {
    const errorMessage = `Can't download resource ${url} ${message}`;
    throw new Error(errorMessage);
  };
  if (isBinary(base)) {
    return http({
      method: 'get',
      url,
      responseType: 'stream',
    }).catch(handleError);
  }
  return http.get(url).catch(handleError);
};

const saveFile = ({ config: { baseURL, url }, data }, folderPath) => {
  const deb = debug('page-loader');
  const handleError = (error) => { throw new Error(`Can't save data at disc. ${error}`); };
  const { pathname } = parse(url);
  const { dir, name, ext } = path.parse(pathname);
  const fileName = ext.length === 0 ? generateName(baseURL)
    : generateName(path.join(dir, name), ext);
  const filePath = path.join(folderPath, fileName);
  deb(`Document ${fileName}`);
  deb(`Saved at ${filePath}`);
  if (isBinary(fileName)) {
    return streamToFile(data, filePath).catch(handleError);
  }
  return fs.writeFile(filePath, data).catch(handleError);
};

const getPageInformation = (response) => {
  const { config: { baseURL }, data } = response;
  const deb = debug('page-loader');
  const links = getAllResourcesLinks(data, baseURL);
  const urls = links.map((p) => new URL(p, baseURL).href);
  deb('URLs to resources:', urls.map((url) => deb(url)));
  return { response, urls };
};

const downloadResources = (http, urls) => {
  const resourcesTasks = new Listr(urls.map((url) => ({
    title: `Download ${url}`,
    task: (ctx) => ctx.requests.push(downloadData(http, url)),
  })), { concurrent: true });
  return resourcesTasks;
};

const changePageLinkToLocal = (acc, url, folderName) => {
  const { pathname } = parse(url);
  const {
    dir, base, name, ext,
  } = path.parse(pathname);
  const fileName = generateName(path.join(dir, name), ext);
  const newLink = `./${path.join(folderName, fileName)}`;
  return changeLink(acc, base, newLink);
};

const savePage = (outputDirectory, response, urls, resources) => {
  const deb = debug('page-loader');
  const pageSavePromises = [];
  if (urls.length === 0) {
    pageSavePromises.push(saveFile(response, outputDirectory));
    return Promise.all(pageSavePromises);
  }
  const folderName = generateName(response.config.baseURL, '_files');
  const localHtml = urls.reduce(
    (acc, url) => changePageLinkToLocal(acc, url, folderName), response.data,
  );
  pageSavePromises.push(saveFile({ ...response, data: localHtml }, outputDirectory));
  const folderPath = path.join(outputDirectory, folderName);
  pageSavePromises.push(fs.mkdir(folderPath).catch((error) => { throw new Error(`Can't make folder. ${error}`); }));
  deb(`Folder ${folderName} created`);
  return resources.then((responses) => {
    const resourceSavePromises = responses.map(
      (res) => saveFile(res, folderPath),
    );
    return Promise.all([...pageSavePromises, ...resourceSavePromises]);
  });
};

const pageLoad = (baseURL, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL,
    timeout: 5000,
  });
  const tasks = [
    {
      title: 'Download page data',
      task: (ctx) => { ctx.pageData = downloadData(http, baseURL); },
    },
    {
      title: 'Get resources links',
      task: (ctx) => { ctx.pageInformation = ctx.pageData.then(getPageInformation); },
    },
    {
      title: 'Download resources',
      task: (ctx) => ctx.pageInformation.then(({ urls }) => downloadResources(http, urls)),
    },
    {
      title: 'Save page and resources at disc',
      task: (ctx) => {
        ctx.savedPage = ctx.pageInformation.then(({ response, urls }) => {
          const resources = Promise.all(ctx.requests);
          return savePage(outputDirectory, response, urls, resources);
        });
      },
    },
  ];
  return new Listr(tasks, listrSettings)
    .run({ requests: [] }).then(({ savedPage }) => savedPage);
};
export default pageLoad;
