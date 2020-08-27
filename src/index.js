import { promises as fs, createWriteStream } from 'fs';
import axios from 'axios';
import path from 'path';
import debug from 'debug';
import { parse } from 'url';
import { getAllResoursesLinks, changeLink } from './page.js';

require('axios-debug-log');


const streamToFile = (inputStream, filePath) => new Promise((resolve, reject) => {
  const fileWriteStream = createWriteStream(filePath);
  inputStream
    .pipe(fileWriteStream)
    .on('finish', resolve)
    .on('error', reject);
});

const generateName = (pageUrl, type = '_files') => {
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

const getType = (url) => `.${url.split('.').slice(-1)[0]}`;
const removeType = (url) => url.split('.').slice(0, -1).join('.');

const isBinary = (url) => {
  const binaryTypes = ['.css', '.js', '.png', '.jpg', '.jpeg', '.ico', '.svg', '.gif'];
  const type = getType(url);
  return binaryTypes.includes(type);
};

const downloadData = (http, url) => {
  if (isBinary(url)) {
    return http({
      method: 'get',
      url,
      responseType: 'stream',
    });
  }
  return http.get(url);
};

const getPageInformation = (page) => {
  const { config: { baseURL }, data } = page;
  const deb = debug('page-loader');
  const paths = getAllResoursesLinks(data, baseURL);
  const links = paths.map((p) => new URL(p, baseURL).href);
  deb(`Links to resourses ${links}`);
  return { page, links };
};

const downloadResourses = (http, { page, links }) => {
  const resourses = Promise.all(links.map((l) => downloadData(http, l)));
  return { page, links, resourses };
};

const makePageResourseLocal = (acc, url, folderName) => {
  const { pathname } = parse(url);
  const fileName = generateName(removeType(pathname), getType(pathname));
  const newLink = `./${folderName}/${fileName}`;
  return changeLink(acc, pathname, newLink);
};

const saveResourse = (folderPath, { config: { url }, data }) => {
  const deb = debug('page-loader');
  const { pathname } = parse(url);
  const fileName = generateName(removeType(pathname), getType(pathname));
  const filePath = path.join(folderPath, fileName);
  deb(`Document ${fileName}`);
  deb(`Saved at ${filePath}`);
  return streamToFile(data, filePath);
};

const savePage = (outputDirectory, { page, links, resourses }) => {
  const deb = debug('page-loader');
  const pageSavePromises = [];
  const { config: { baseURL }, data } = page;
  const pageName = generateName(baseURL, '.html');
  const pagePath = path.join(outputDirectory, pageName);
  if (links.length === 0) {
    pageSavePromises.push(fs.writeFile(pagePath, data));
    return Promise.all(pageSavePromises);
  }
  const folderName = generateName(baseURL);
  const localHtml = links.reduce(
    (acc, link) => makePageResourseLocal(acc, link, folderName), data,
  );
  pageSavePromises.push(fs.writeFile(pagePath, localHtml));
  const folderPath = path.join(outputDirectory, folderName);
  pageSavePromises.push(fs.mkdir(folderPath));
  deb(`Folder ${folderName} created`);
  return resourses.then((responses) => {
    const resourseSavePromises = responses.map((res) => saveResourse(folderPath, res));
    return Promise.all([...pageSavePromises, ...resourseSavePromises]);
  });
};

const pageLoad = (baseURL, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL,
    timeout: 5000,
  });
  const pageData = downloadData(http, '/');
  const pageInformation = pageData.then(getPageInformation);
  const pageResourses = pageInformation.then((data) => downloadResourses(http, data));
  const savedPage = pageResourses.then((data) => savePage(outputDirectory, data));
  return savedPage;
};
export default pageLoad;
