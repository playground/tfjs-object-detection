"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.handler = void 0;
var rxjs_1 = require("rxjs");
var fs_1 = require("fs");
var messenger_1 = require("./messenger");
var path = require("path");
var StaticFileHandler = require("serverless-aws-static-file-handler");
var tfnode = require('@tensorflow/tfjs-node');
var jsonfile = require('jsonfile');
var player = require('play-sound')();
var clientFilePath = path.join(process.cwd(), './public/');
var fileHandler = new StaticFileHandler(clientFilePath);
var model;
var handler = function (params, context, callback) {
    params.body = params.body ? JSON.parse(params.body) : null;
    params.action = params.body ? params.body.action : params.path.replace(/^\/|\/$/g, '');
    console.log('$$$params', params.path, params.action, process.cwd(), clientFilePath);
    if (!params.action) {
        params.path = 'index.html';
        callback(null, fileHandler.get(params, context));
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
var labels;
var version;
var intervalMS = 10000;
var cycles = 0;
var count = 0;
var videoFormat = ['.mp4', '.avi', '.webm'];
var cameraDisabled = true;
var confidentCutoff = 0.85;
var currentModelPath = './model';
var imagePath = './public/images';
var newModelPath = './model-new';
var oldModelPath = './model-old';
var staticPath = './public/js';
var mmsPath = '/mms-shared';
var localPath = './local-shared';
var videoPath = './public/video';
var oldImage = imagePath + "/image-old.png";
var sharedPath = '';
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
    score: function (params) {
        return new rxjs_1.Observable(function (observer) {
            var queryString = params.queryStringParameters;
            console.log('$$$', queryString);
            tfnode.ready().then(function (s) {
                console.log('$@$@', s);
            });
            console.log('$$$tf', tfnode.getBackend());
            confidentCutoff = +parseFloat(queryString.score).toFixed(2);
            console.log(confidentCutoff);
            if (queryString.assetType === 'Image') {
                ieam.renameFile(oldImage, imagePath + "/image.png");
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var imageFile, image, decodedImage, inputTensor;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, ieam.loadModel(currentModelPath)];
                            case 1:
                                _a.sent();
                                imageFile = imagePath + "/image.png";
                                if (!(0, fs_1.existsSync)(imageFile)) {
                                    imageFile = imagePath + "/image.jpg";
                                }
                                if ((0, fs_1.existsSync)(imageFile)) {
                                    try {
                                        console.log(imageFile);
                                        image = (0, fs_1.readFileSync)(imageFile);
                                        decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
                                        inputTensor = decodedImage.expandDims(0);
                                        ieam.inference(inputTensor)
                                            .subscribe(function (json) {
                                            var images = {};
                                            images['/static/images/image-old.png'] = json;
                                            json = Object.assign({ images: images, version: version, confidentCutoff: confidentCutoff, platform: process.platform + ":" + process.arch, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn });
                                            jsonfile.writeFile(staticPath + "/image.json", json, { spaces: 2 });
                                            ieam.renameFile(imageFile, imagePath + "/image-old.png");
                                            observer.next("Hello!");
                                            observer.complete();
                                        });
                                    }
                                    catch (e) {
                                        console.log(e);
                                        observer.next("Hello!");
                                        observer.complete();
                                    }
                                }
                                return [2 /*return*/];
                        }
                    });
                }); })();
            }
            else {
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var images;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, ieam.loadModel(currentModelPath)];
                            case 1:
                                _a.sent();
                                images = ieam.getFiles(videoPath, /.jpg|.png/);
                                console.log(images);
                                ieam.inferenceVideo(images);
                                console.log('helllo');
                                observer.next("Hello!");
                                observer.complete();
                                return [2 /*return*/];
                        }
                    });
                }); })();
            }
        });
    },
    "default": function (params) {
        return new rxjs_1.Observable(function (observer) {
            observer.next("Method " + params.action + " not found.");
            observer.complete();
        });
    }
};
var mp3s = {
    'snapshot': './public/media/audio-snap.mp3',
    'gotMail': './public/media/youve-got-mail-sound.mp3',
    'theForce': './public/media/may-the-force-be-with-you.mp3'
};
var ieam = {
    inferenceVideo: function (files) {
        try {
            var $inference_1 = {};
            files.forEach(function (imageFile) { return __awaiter(void 0, void 0, void 0, function () {
                var image, decodedImage, inputTensor;
                return __generator(this, function (_a) {
                    if ((0, fs_1.existsSync)(imageFile)) {
                        console.log(imageFile);
                        image = (0, fs_1.readFileSync)(imageFile);
                        decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
                        inputTensor = decodedImage.expandDims(0);
                        $inference_1[imageFile.replace('./public/', '/static/')] = (ieam.inference(inputTensor));
                    }
                    return [2 /*return*/];
                });
            }); });
            (0, rxjs_1.forkJoin)($inference_1)
                .subscribe({
                next: function (value) {
                    console.log(value);
                    var json = Object.assign({}, { images: value, version: version, confidentCutoff: confidentCutoff, platform: process.platform + ":" + process.arch, cameraDisabled: cameraDisabled });
                    jsonfile.writeFile(staticPath + "/video.json", json, { spaces: 2 });
                    ieam.soundEffect(mp3s.theForce);
                },
                complete: function () {
                    console.log('complete');
                }
            });
        }
        catch (e) {
            console.log(e);
        }
    },
    soundEffect: function (mp3) {
        console.log(mp3);
        player.play(mp3, function (err) {
            if (err)
                console.log("Could not play sound: " + err);
        });
    },
    getFiles: function (srcDir, ext) {
        var files = (0, fs_1.readdirSync)(srcDir);
        return files.map(function (file) {
            if (ext && file.match(ext)) {
                return srcDir + "/" + file;
            }
        });
    },
    renameFile: function (from, to) {
        if ((0, fs_1.existsSync)(from)) {
            (0, fs_1.renameSync)(from, to);
        }
    },
    loadModel: function (modelPath) { return __awaiter(void 0, void 0, void 0, function () {
        var startTime, endTime, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    startTime = tfnode.util.now();
                    console.log('$$$model', model);
                    if (!!model) return [3 /*break*/, 2];
                    return [4 /*yield*/, tfnode.node.loadSavedModel(modelPath)];
                case 1:
                    model = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    console.log('already loaded');
                    _a.label = 3;
                case 3:
                    endTime = tfnode.util.now();
                    console.log("loading time:  " + modelPath + ", " + (endTime - startTime));
                    labels = jsonfile.readFileSync(modelPath + "/assets/labels.json");
                    version = jsonfile.readFileSync(modelPath + "/assets/version.json");
                    console.log('version: ', version);
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _a.sent();
                    console.log('$@$@', e_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    inference: function (inputTensor) {
        return new rxjs_1.Observable(function (observer) {
            var startTime = tfnode.util.now();
            var outputTensor = model.predict({ input_tensor: inputTensor });
            var scores = outputTensor['detection_scores'].arraySync();
            var boxes = outputTensor['detection_boxes'].arraySync();
            var classes = outputTensor['detection_classes'].arraySync();
            var num = outputTensor['num_detections'].arraySync();
            var endTime = tfnode.util.now();
            outputTensor['detection_scores'].dispose();
            outputTensor['detection_boxes'].dispose();
            outputTensor['detection_classes'].dispose();
            outputTensor['num_detections'].dispose();
            var predictions = [];
            var elapsedTime = endTime - startTime;
            for (var i = 0; i < scores[0].length; i++) {
                var score = scores[0][i].toFixed(2);
                if (score >= confidentCutoff) {
                    predictions.push({
                        detectedBox: boxes[0][i].map(function (el) { return el.toFixed(2); }),
                        detectedClass: labels[classes[0][i]],
                        detectedScore: score
                    });
                }
            }
            console.log('predictions:', predictions.length, predictions[0]);
            console.log('time took: ', elapsedTime);
            console.log('build json...');
            observer.next({ bbox: predictions, elapsedTime: elapsedTime });
            observer.complete();
        });
    }
};
//# sourceMappingURL=ieam.js.map