#! /usr/bin/env node
const {renameSync, readdirSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, readFile} = require('fs');
const { Observable, forkJoin } = require('rxjs');
const cp = require('child_process'),
exec = cp.exec;

const task = process.env.npm_config_task || 'deploy';

let build = {
  deploy: () => {
    return new Observable((observer) => {
      console.log(`begin building web-ui then deploy bundle...`);
      let arg = `ng build --output-hashing=none`;
      let child = exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        if(!err) {
          console.log(`done building web-ui`);
          readFile(`dist/web-ui/index.html`, 'utf8', (err, html) => {
            if(!err) {
              html = html.replace('favicon.ico', '/static/js/favicon.ico');
              html = html.replace('runtime.js', '/static/js/runtime.js');
              html = html.replace('polyfills.js', '/static/js/polyfills.js');
              html = html.replace('main.js', '/static/js/main.js');
              writeFileSync(`../saved-model-service/index.html`, html);
              copyFileSync(`dist/web-ui/favicon.ico`, `../saved-model-service/public/js/favicon.ico`);
              copyFileSync(`dist/web-ui/runtime.js`, `../saved-model-service/public/js/runtime.js`);
              copyFileSync(`dist/web-ui/polyfills.js`, `../saved-model-service/public/js/polyfills.js`);
              copyFileSync(`dist/web-ui/main.js`, `../saved-model-service/public/js/main.js`);
              console.log(`done deploying web-ui`);
              observer.next();
              observer.complete();
            } else {
              console.log('failed to read index.html');
              process.exit(0);
            }
          });
        } else {
          console.log(`failed to build and deploy`, err);
        }
      });
      child.stdout.pipe(process.stdout);
      child.on('data', (data) => {
        console.log(data)
      })
    });
  },
  exit: (msg) => {
    console.log(msg);
    process.exit(0);
  }
}

build[task]()
.subscribe(() => console.log('process completed.'));
