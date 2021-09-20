#! /usr/bin/env node
const path = require('path');
const cp = require('child_process'),
  exec = cp.exec;
const fs = require('fs');

const task = process.env.npm_config_task;
const userName = process.env.npm_config_username;
const imageName = process.env.npm_config_imagename;
const version = process.env.npm_config_imageversion;


let build = {
  dockerImage: () => {
    if(userName && imageName && version) {
      let arg = `hzn architecture`
      exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        if(!err) {
          let arch = stdout.replace(/\r?\n|\r/g, '');
          arg = `docker build -t ${userName}/${imageName}_${arch}:${version} -f Dockerfile-${arch} .`;
          exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
            if(!err) {
              console.log(stdout)
              console.log(`done building image ${imageName}`);
            } else {
              console.log(`failed to build image ${imageName}`, err);
            }
          });
        } else {
          console.log('failed to identify arch', err);
          observer.error(err);
        }
      });  
    } else {
      console.log('docker username, imagename and imageversion are required...');
      process.exit(0);
    }
  },
  pushImage: () => {
    if(userName && imageName && version) {
      let arg = `hzn architecture`
      exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        if(!err) {
          let arch = stdout.replace(/\r?\n|\r/g, '');
          arg = `docker push ${userName}/${imageName}_${arch}:${version}`;
          exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
            if(!err) {
              console.log(stdout)
              console.log(`done publishing image ${imageName}`);
            } else {
              console.log(`failed to publish image ${imageName}`, err);
            }
          });
        } else {
          console.log('failed to identify arch', err);
          observer.error(err);
        }
      });  
    } else {
      console.log('docker username, imagename and imageversion are required...');
      process.exit(0);
    }
  },
  default: () => {
    console.log('command not found.');
    process.exit(0);
  }
}

build[task] ? build[task]() : build.default();
