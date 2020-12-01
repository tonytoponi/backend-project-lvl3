import cheerio from 'cheerio';
import debug from 'debug';
import path from 'path';
import { parse } from 'url';
import { generateFileName } from './localNameGenerators';

const log = debug('page-loader');

const isLocal = (link) => {
  const { host } = parse(link);
  return !host;
};

const selectors = {
  link: 'href',
  script: 'src',
  img: 'src',
  video: 'src',
};

const processPage = (html, folderName) => {
  log(html);
  const $ = cheerio.load(html);
  const resources = [];
  log($.html());
  $('[src], [href]').each((_i, element) => {
    const { name } = element;
    const selector = selectors[name];
    const link = $(element).attr(selector);
    if (isLocal(link)) {
      const localFileName = generateFileName(link);
      const localFilePath = `./${path.join(folderName, localFileName)}`;
      $(element).attr(selector, localFilePath);
      resources.push({ link, localFilePath });
    }
  });
  return { html: $.html(), resources };
};

export default processPage;
