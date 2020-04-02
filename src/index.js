import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';

const generateName = (pageUrl) => {
  const lastSymbol = /[/]$/gi;
  const nonSymbolDigit = /[^a-z\d]/gi;
  const { hostname, pathname } = url.parse(pageUrl);
  const pageLocation = hostname.concat(pathname);
  const fileName = pageLocation.replace(lastSymbol, '').replace(nonSymbolDigit, '-').concat('.html');
  return fileName;
};

const pageLoad = (pageUrl, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL: pageUrl,
    timeout: 5000,
  });
  const fileName = generateName(pageUrl);
  const filePath = path.join(outputDirectory, fileName);
  return http.get('/')
    .then(({ data }) => fs.writeFile(filePath, data));
};
export default pageLoad;
