"use strict";
exports.__esModule = true;
exports.handler = void 0;
var path = require("path");
var StaticFileHandler = require("serverless-aws-static-file-handler");
var clientFilePath = path.join(process.cwd(), './public/');
var fileHandler = new StaticFileHandler(clientFilePath);
var handler = function (params, context, callback) {
    console.log('$$$params', params.path, process.cwd(), clientFilePath);
    if (params.path === '/') {
        params.path = 'index.html';
    }
    callback(null, fileHandler.get(params, context));
};
exports.handler = handler;
//# sourceMappingURL=static.js.map