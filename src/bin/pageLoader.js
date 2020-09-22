#!/usr/bin/env node

import app from 'commander';
import pageLoader from '..';
import { version } from '../../package.json';

app
  .version(version)
  .option('-o, --output [directory]', 'output directory', process.cwd())
  .arguments('<url>')
  .description('Download web page to specified folder')
  .action((url) => pageLoader(url, app.output).then(() => {
    console.log('Page downloaded successfully');
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  }))
  .parse(process.argv);
