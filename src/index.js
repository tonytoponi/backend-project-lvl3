import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';

const generateFileName = (pageUrl) => {
  const { hostname } = url.parse(pageUrl);
  const fileName = hostname.split('.').join('-').concat('.html');
  return fileName;
};


const pageLoad = (pageUrl, outputDirectory = process.cwd()) => {
  const http = axios.create({
    baseURL: pageUrl,
    timeout: 5000,
  });
  const fileName = generateFileName(pageUrl);
  const filePath = path.join(outputDirectory, fileName);
  return http.get('/')
    .then(({ data }) => fs.writeFile(filePath, data));
};

export default pageLoad;
