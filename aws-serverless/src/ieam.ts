import { Observable, of } from 'rxjs';
import { Messenger } from './messenger';
import { Params } from './params';
import path = require('path');
import StaticFileHandler = require('serverless-aws-static-file-handler');
import { ieam, util } from './utility';

const clientFilePath = path.join(process.cwd(), './public/');
const fileHandler = new StaticFileHandler(clientFilePath);

export const handler = (params: Params, context, callback) => {
  if(params.body && params.body.indexOf('form-data') < 0) {
    params.body = params.body ? JSON.parse(params.body) : null;
    params.action = params.body ? params.body.action : params.path.replace(/^\/|\/$/g, '');
  } else {
    params.action = params.path.replace(/^\/|\/$/g, '');
  }
  console.log('$$$!!!params', params.path, params.action, clientFilePath)
  if(!params.action) {
    console.log('$$$###params', params.path, params.action, process.cwd(), clientFilePath)
    params.path = 'index.html';
    callback(null, fileHandler.get(params, context));
  } else {
    params.contentType = params.contentType ? params.contentType : 'application/json';
    const response = new Messenger(params);
    action.exec(params)
    .subscribe((data) => {
      callback(null, response.send(data));
    })
  }
}

let action = {
  exec: (params: Params) => {
    try {
      console.log('$$$params', params.action, params.score, process.cwd())
      return (action[params.action] || action.default)(params);  
    } catch(e) {
      return of({data: e});
    }
  },
  sayHi: (params: Params) => {
    return new Observable((observer) => {
      observer.next(`Hello!`);
      observer.complete();
    });
  },  
  init: (params: Params) => {
    return util.initialInference();
  },
  upload: (params: Params) => {
    return ieam.upload(params);
  },  
  score: (params: Params) => {
    return ieam.score(params);
  },
  default: (params: Params) => {
    return new Observable((observer) => {
      observer.next(`Method ${params.action} not found.`);
      observer.complete();
    });
  }
}
