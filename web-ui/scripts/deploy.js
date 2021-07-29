#! /usr/bin/env node
const {renameSync, readdirSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} = require('fs');
const { Observable, forkJoin } = require('rxjs');
const cp = require('child_process'),
exec = cp.exec;

const task = process.env.npm_config_task || 'deploy';

let build = {
  deploy: () => {
    return new Observable((observer) => {
      let arg = `ng build --output-hashing=none`;
      exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        if(!err) {
          console.log(`done building web-ui`);
          let html = readFileSync(`dist/web-ui/index.html`);
          html = html.replace('favicon.ico', '/static/js/favicon.ico');
          html = html.replace('runtime.js', '/static/js/runtime.js');
          html = html.replace('polyfills.js', '/static/js/polyfills.js');
          html = html.replace('main.js', '/static/js/main.js');
          writeFileSync(`../saved-model-service/index.html`, html);
          copyFileSync(`dist/web-ui/favicon.ico`, `../saved-model-service/favicon.ico`);
          copyFileSync(`dist/web-ui/runtime.js`, `../saved-model-service/runtime.js`);
          copyFileSync(`dist/web-ui/polyfills.js`, `../saved-model-service/polyfills.js`);
          copyFileSync(`dist/web-ui/main.js`, `../saved-model-service/main.js`);
          observer.next();
          observer.complete();
        } else {
          console.log(`failed to build and deploy`, err);
        }
      });

    });
  },
  exit: (msg) => {
    console.log(msg);
    process.exit(0);
  }
}

build[task]()
.subscribe(() => console.log('process completed.'));
