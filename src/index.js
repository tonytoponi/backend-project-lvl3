import { promises as fs, createWriteStream } from 'fs';
import axios from 'axios';
import path from 'path';
import { parse } from 'url';
import { getAllResoursesLinks, changeLink } from './page.js';

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

const makeurl = (pathname, base) => new URL(pathname, base).href;

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

const pageLoad = (baseURL, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL,
    timeout: 5000,
  });
  const pageData = downloadData(http, '/');
  const pageResourses = pageData.then(({ data }) => {
    const links = getAllResoursesLinks(data, baseURL);
    if (links.length === 0) {
      return { html: data, resourses: [] };
    }
    const addresses = links.map((link) => makeurl(link, baseURL));
    const resourses = Promise.all(addresses.map((address) => downloadData(http, address)));
    return { html: data, resourses };
  });
  return pageResourses.then(({ html, resourses }) => {
    const pageName = generateName(baseURL, '.html');
    const pagePath = path.join(outputDirectory, pageName);
    if (resourses.length === 0) {
      return fs.writeFile(pagePath, html);
    }
    const folderName = generateName(baseURL);
    const folderPath = path.join(outputDirectory, folderName);
    const result = [];
    result.push(fs.mkdir(folderPath));
    resourses.then((responses) => {
      const localHtml = responses.reduce((acc, { config: { url } }) => {
        const { pathname } = parse(url);
        const fileName = generateName(removeType(pathname), getType(pathname));
        const newLink = `./${folderName}/${fileName}`;
        return changeLink(acc, pathname, newLink);
      }, html);
      responses.forEach(({ config: { url }, data }) => {
        const { pathname } = parse(url);
        const fileName = generateName(removeType(pathname), getType(pathname));
        const filePath = path.join(outputDirectory, folderName, fileName);
        result.push(streamToFile(data, filePath));
      });
      result.push(fs.writeFile(pagePath, localHtml));
    });
    return Promise.all(result);
  });
};
export default pageLoad;
