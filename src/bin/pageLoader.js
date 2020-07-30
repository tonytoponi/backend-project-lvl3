#!/usr/bin/env node

import app from 'commander';
import pageLoader from '..';
import { version } from '../../package.json';

app
  .version(version)
  .option('-o, --output [directory]', 'output directory, default is process.cwd()', process.cwd())
  .arguments('<url>')
  .description('Download web page to specified folder')
  .action((url) => console.log(pageLoader(url, app.output)))
  .parse(process.argv);
