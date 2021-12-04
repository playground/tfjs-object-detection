"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const messenger_1 = require("./js/messenger");
const utility_1 = require("./js/utility");
const cp = require('child_process'), exec = cp.exec;
function main(params) {
    let result;
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
            const response = new messenger_1.Messenger(params);
            resolve(response.error('something went wrong...', 400));
        }, () => {
            const response = new messenger_1.Messenger(params);
            resolve(response.send(result));
        });
    });
}
exports.main = main;
global.main = main; // required when using webpack
let action = {
    exec: (params) => {
        // const baseUrl = 'https://service.us.apiconnect.ibmcloud.com/gws/apigateway/api/646d429a9e5f06572b1056ccc9f5ba4de6f5c30159f10fcd1f1773f58d35579b/demo/';
        // let path = params['__ow_headers']['x-forwarded-url'].replace(baseUrl, '').replace(/\//g, '_');
        let path = params['__ow_path'].replace(/\//g, '_');
        console.log('$$$$$$', params['__ow_path'], path);
        // params.days = params.days ? params.days : '1';
        // if(!params.date) {
        //   const date = util.formatMD(util.getDate());
        //   params.date = `${date.year}${date.month}${date.day}`;
        // }
        return (action[path] || action[params.method] || action.default)(params);
    },
    _demo_get: (params) => {
        return (0, rxjs_1.of)({ data: 'test demo get!' });
    },
    _demo_post: (params) => {
        return (0, rxjs_1.of)({ data: params.body });
    },
    init: (params) => {
        return utility_1.util.initialInference();
    },
    upload: (params) => {
        return utility_1.ieam.upload(params);
    },
    score: (params) => {
        return utility_1.ieam.score(params);
    },
    error: (msg) => {
        return new rxjs_1.Observable((observer) => {
            observer.next(msg);
            observer.complete();
        });
    },
    default: (params) => {
        return new rxjs_1.Observable((observer) => {
            observer.next(`Method ${params.method} not found.`);
            observer.complete();
        });
    }
};
//# sourceMappingURL=demo-action.js.map