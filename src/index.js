import { promises as fs } from 'fs';
import axios from 'axios';
import url from 'url';
import path from 'path';

const pageLoad = (pageUrl, outputDirectory = process.cwd()) => {
  const { hostname } = url.parse(pageUrl);
  const fileName = hostname.split('.').join('-').concat('.html');
  const filePath = path.join(outputDirectory, fileName);
  const http = axios.create({
    baseURL: pageUrl,
    timeout: 5000,
  });
  return http.get('/')
    .catch((error) => {
      console.log(error);
    })
    .then(({ data }) => fs.writeFile(filePath, data));
};

export default pageLoad;
