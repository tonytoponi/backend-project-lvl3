import { parse } from 'url';
import path from 'path';
import debug from 'debug';

const selectors = {
  firstSymbol: /^[/]/,
  nonSymbolAndDigit: /[^a-z\d]/gi,
  lastSymbol: /[/]$/gi,
};

const log = debug('page-loader-generators');

export const generatePageName = (pageUrl) => {
  const { hostname, pathname } = parse(pageUrl);
  const pageLocation = path.join(hostname, pathname);
  const pageName = pageLocation
    .replace(selectors.lastSymbol, '')
    .replace(selectors.nonSymbolAndDigit, '-')
    .concat('.html');
  log(`Local page name ${pageName}`);
  return pageName;
};

export const generateFileName = (filePath) => {
  const { dir, name, ext } = path.parse(filePath);
  const localFileName = path.join(dir, name)
    .replace(selectors.lastSymbol, '')
    .replace(selectors.firstSymbol, '')
    .replace(selectors.nonSymbolAndDigit, '-')
    .concat(ext);
  log(`Local file name ${localFileName}`);
  return localFileName;
};

export const generateFolderName = (pageUrl) => {
  const { hostname, pathname } = parse(pageUrl);
  const pageLocation = hostname.concat(pathname);
  const folderName = pageLocation
    .replace(selectors.lastSymbol, '')
    .replace(selectors.nonSymbolAndDigit, '-')
    .concat('_files');
  log(`Local folder name ${folderName}`);
  return folderName;
};
