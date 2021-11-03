import path = require('path');
import { Messenger } from './messenger';
import { Params } from './params';

import StaticFileHandler = require('serverless-aws-static-file-handler');

const clientFilePath = path.join(process.cwd(), './public/');
const fileHandler = new StaticFileHandler(clientFilePath);

export const handler = (params: Params, context, callback) => {
  console.log('$$$params', params.path, process.cwd(), clientFilePath)
  if(params.path === '/') {
    params.path = 'index.html';
  }
  callback(null, fileHandler.get(params, context));
}
