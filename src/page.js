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

const actions = [
  {
    check: ($, element) => !!$(element).attr('src'),
    get: ($, element) => $(element).attr('src'),
    change: ($, element, localPath) => {
      $(element).attr('src', localPath);
      return $;
    },
  },
  {
    check: ($, element) => !!$(element).attr('href'),
    get: ($, element) => $(element).attr('href'),
    change: (($, element, localPath) => {
      $(element).attr('href', localPath);
      return $;
    }),
  },
];

const processPage = (html, folderName) => {
  // log(html);
  const current = {
    resources: [],
    $: cheerio.load(html),
  };
  // log(current.$.html());
  current.$('[src], [href]').each((_i, element) => {
    const { get, change } = actions.find(({ check }) => check(current.$, element));
    const link = get(current.$, element);
    if (isLocal(link)) {
      const localFileName = generateFileName(link);
      const localFilePath = `./${path.join(folderName, localFileName)}`;
      current.$ = change(current.$, element, localFilePath);
      current.resources = [...current.resources, { link, localFilePath }];
      // log(current.$.html());
    }
  });
  const { resources, $ } = current;
  return { html: $.html(), resources };
};

export default processPage;
