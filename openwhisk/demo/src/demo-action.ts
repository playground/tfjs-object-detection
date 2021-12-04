import { Observable, of, from } from 'rxjs';
import { Params } from '@common/params/params';
import { Messenger } from '@common/messenger';
import { ieam, util } from '@common/utility';
import { mkdirSync, readdir, readFileSync, stat, existsSync } from 'fs';
import path = require('path');
const cp = require('child_process'),
exec = cp.exec;

export default function main(params: Params) {
  let result: any;
  return new Promise((resolve, reject) => {
    // const response = new Messenger(params);
    // resolve(response.send({"data": params}));
    // resolve(Object.assign({}, //params, 
    //   {
    //     statusCode: 200,
    //     headers: { 'Content-Type': 'application/json' },
    //     body: {"result": "image generation completed."}
    //   }));
    action.exec(params)
    .subscribe((data) => {
      result = data;
      console.log('$data', result);
    }, (err) => {
      console.log(err);
      const response = new Messenger(params);
      resolve(response.error('something went wrong...', 400));
    }, () => {
      const response = new Messenger(params);
      resolve(response.send(result));
    });
  });
}

(<any>global).main = main;  // required when using webpack

let action = {
  exec: (params: Params) => {
    // const baseUrl = 'https://service.us.apiconnect.ibmcloud.com/gws/apigateway/api/646d429a9e5f06572b1056ccc9f5ba4de6f5c30159f10fcd1f1773f58d35579b/demo/';
    // let path = params['__ow_headers']['x-forwarded-url'].replace(baseUrl, '').replace(/\//g, '_');
    let path = params['__ow_path'].replace(/\//g, '_')
    console.log('$$$$$$', params['__ow_path'], path)
    // params.days = params.days ? params.days : '1';
    // if(!params.date) {
    //   const date = util.formatMD(util.getDate());
    //   params.date = `${date.year}${date.month}${date.day}`;
    // }
    return (action[path] || action[params.method] || action.default)(params);
  },
  _demo_get: (params: Params) => {
    return of({data: 'test demo get!'});
  },
  _demo_post: (params: Params) => {
    return of({data: params.body});
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
  error: (msg) => {
    return new Observable((observer) => {
      observer.next(msg);
      observer.complete();
    });
  },
  default: (params: Params) => {
    return new Observable((observer) => {
      observer.next(`Method ${params.method} not found.`);
      observer.complete();
    });
  }
}