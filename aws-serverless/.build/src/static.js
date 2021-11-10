"use strict";
exports.__esModule = true;
exports.handler = void 0;
var path = require("path");
var utility_1 = require("./utility");
var StaticFileHandler = require("serverless-aws-static-file-handler");
var clientFilePath = path.join(process.cwd(), './public/');
var fileHandler = new StaticFileHandler(clientFilePath);
var handler = function (params, context, callback) {
    console.log('$$$params', params.path, process.cwd(), clientFilePath);
    if (params.path === '/') {
        params.path = 'index.html';
        utility_1.ieam.imageVideoExist()
            .subscribe({
            complete: function () { return callback(null, fileHandler.get(params, context)); }
        });
    }
    else {
        callback(null, fileHandler.get(params, context));
    }
};
exports.handler = handler;
//# sourceMappingURL=static.js.map