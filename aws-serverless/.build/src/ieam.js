"use strict";
exports.__esModule = true;
exports.handler = void 0;
var rxjs_1 = require("rxjs");
var messenger_1 = require("./messenger");
var path = require("path");
var StaticFileHandler = require("serverless-aws-static-file-handler");
var utility_1 = require("./utility");
var clientFilePath = path.join(process.cwd(), './public/');
var fileHandler = new StaticFileHandler(clientFilePath);
var handler = function (params, context, callback) {
    if (params.body && params.body.indexOf('form-data') < 0) {
        params.body = params.body ? JSON.parse(params.body) : null;
        params.action = params.body ? params.body.action : params.path.replace(/^\/|\/$/g, '');
    }
    else {
        params.action = params.path.replace(/^\/|\/$/g, '');
    }
    console.log('$$$!!!params', params.path, params.action, clientFilePath);
    if (!params.action) {
        console.log('$$$###params', params.path, params.action, process.cwd(), clientFilePath);
        params.path = 'index.html';
        utility_1.ieam.initialInference()
            .subscribe({
            complete: function () {
                callback(null, fileHandler.get(params, context));
            }
        });
    }
    else {
        params.contentType = params.contentType ? params.contentType : 'application/json';
        var response_1 = new messenger_1.Messenger(params);
        action.exec(params)
            .subscribe(function (data) {
            callback(null, response_1.send(data));
        });
    }
};
exports.handler = handler;
var action = {
    exec: function (params) {
        try {
            console.log('$$$params', params.action, params.score, process.cwd());
            return (action[params.action] || action["default"])(params);
        }
        catch (e) {
            return (0, rxjs_1.of)({ data: e });
        }
    },
    sayHi: function (params) {
        return new rxjs_1.Observable(function (observer) {
            observer.next("Hello!");
            observer.complete();
        });
    },
    upload: function (params) {
        return utility_1.ieam.upload(params);
    },
    score: function (params) {
        return utility_1.ieam.score(params);
    },
    "default": function (params) {
        return new rxjs_1.Observable(function (observer) {
            observer.next("Method " + params.action + " not found.");
            observer.complete();
        });
    }
};
//# sourceMappingURL=ieam.js.map