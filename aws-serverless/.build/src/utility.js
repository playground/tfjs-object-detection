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
exports.ieam = exports.util = exports.sharedPath = exports.localPath = exports.mmsPath = exports.currentModelPath = void 0;
var rxjs_1 = require("rxjs");
var fs_1 = require("fs");
var queryString = require('querystring');
var tfnode = require('@tensorflow/tfjs-node');
var jsonfile = require('jsonfile');
var player = require('play-sound')();
var ffmpeg = require('ffmpeg');
var cp = require('child_process'), exec = cp.exec;
var model;
var labels;
var version;
var intervalMS = 10000;
var cycles = 0;
var count = 0;
var videoFormat = ['.mp4', '.avi', '.webm'];
var videoSrc = '/static/backup/video-old.mp4';
var cameraDisabled = true;
var confidentCutoff = 0.85;
exports.currentModelPath = './model';
var imagePath = './public/images';
var newModelPath = './model-new';
var oldModelPath = './model-old';
var staticPath = './public/js';
exports.mmsPath = '/mms-shared';
exports.localPath = './local-shared';
var videoPath = './public/video';
var backupPath = './public/backup';
var oldImage = imagePath + "/image-old.png";
exports.sharedPath = '';
var mp3s = {
    'snapshot': './public/media/audio-snap.mp3',
    'gotMail': './public/media/youve-got-mail-sound.mp3',
    'theForce': './public/media/may-the-force-be-with-you.mp3'
};
exports.util = {
    checkMMS: function () {
        try {
            var list = void 0;
            var config = void 0;
            if ((0, fs_1.existsSync)(exports.mmsPath)) {
                list = (0, fs_1.readdirSync)(exports.mmsPath);
                list = list.filter(function (item) { return /(\.zip)$/.test(item); });
                exports.sharedPath = exports.mmsPath;
            }
            else if ((0, fs_1.existsSync)(exports.localPath)) {
                list = (0, fs_1.readdirSync)(exports.localPath);
                config = list.filter(function (item) { return item === 'config.json'; });
                list = list.filter(function (item) { return /(\.zip)$/.test(item); });
                exports.sharedPath = exports.localPath;
            }
            return list;
        }
        catch (e) {
            console.log(e);
        }
    },
    unzipMMS: function (files) {
        return new rxjs_1.Observable(function (observer) {
            var arg = '';
            console.log('list', files);
            files.forEach(function (file) {
                if (file === 'model.zip') {
                    arg = "unzip -o " + exports.sharedPath + "/" + file + " -d " + newModelPath;
                }
                else if (file === 'image.zip') {
                    arg = "unzip -o " + exports.sharedPath + "/" + file + " -d " + imagePath;
                }
                else {
                    observer.next();
                    observer.complete();
                }
                exec(arg, { maxBuffer: 1024 * 2000 }, function (err, stdout, stderr) {
                    if ((0, fs_1.existsSync)(exports.sharedPath + "/" + file)) {
                        (0, fs_1.unlinkSync)(exports.sharedPath + "/" + file);
                    }
                    if (!err) {
                        observer.next();
                        observer.complete();
                    }
                    else {
                        console.log(err);
                        observer.next();
                        observer.complete();
                    }
                });
            });
        });
    }
};
exports.ieam = {
    imageVideoExist: function () {
        return new rxjs_1.Observable(function (observer) {
            if (!(0, fs_1.existsSync)("" + oldImage) || !exports.ieam.getVideoFile(backupPath + "/video-old")) {
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.ieam.loadModel(exports.currentModelPath)];
                            case 1:
                                _a.sent();
                                exports.ieam.initialInference()
                                    .subscribe({
                                    complete: function () { return observer.complete(); }
                                });
                                return [2 /*return*/];
                        }
                    });
                }); })();
            }
            else {
                observer.complete();
            }
        });
    },
    upload: function (params) {
        return new rxjs_1.Observable(function (observer) {
            try {
                var body = params.body;
                var content = queryString.parse(body, '\r\n', ':');
                if (content['Content-Type'].indexOf('image') != -1) {
                    console.log(content['Content-Type']);
                    var entireData = body.toString();
                    var contentType = content['Content-Type'].substring(1);
                    //Get the location of the start of the binary file, 
                    //which happens to be where contentType ends
                    var upperBoundary = entireData.indexOf(contentType) + contentType.length;
                    var data = entireData.substring(upperBoundary);
                    //replace trailing and starting spaces 
                    var cleanData = data.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    //Cut the extra things at the end of the data (Webkit stuff)
                    var binaryData = cleanData.substring(0, cleanData.indexOf('------WebKitFormBoundary'));
                    (0, fs_1.writeFileSync)(imagePath + "/image.png", binaryData, 'binary');
                    exports.ieam.checkImage()
                        .subscribe({
                        complete: function () {
                            observer.next('Image captured.');
                            observer.complete();
                        }
                    });
                }
                else {
                    console.log('invalid file type');
                    observer.next('Invalid file type');
                    observer.complete();
                }
            }
            catch (err) {
                observer.error(err);
            }
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
            confidentCutoff = queryString.score ? parseFloat(queryString.score) : confidentCutoff;
            console.log(confidentCutoff);
            if (queryString.assetType === 'Image') {
                exports.ieam.renameFile(oldImage, imagePath + "/image.png");
                (function () { return __awaiter(void 0, void 0, void 0, function () {
                    var imageFile, image, decodedImage, inputTensor;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, exports.ieam.loadModel(exports.currentModelPath)];
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
                                        exports.ieam.inference(inputTensor)
                                            .subscribe(function (json) {
                                            var images = {};
                                            images['/static/images/image-old.png'] = json;
                                            json = Object.assign({ images: images, version: version, confidentCutoff: confidentCutoff, platform: process.platform + ":" + process.arch, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn });
                                            jsonfile.writeFile(staticPath + "/image.json", json, { spaces: 2 });
                                            exports.ieam.renameFile(imageFile, imagePath + "/image-old.png");
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
                            case 0: return [4 /*yield*/, exports.ieam.loadModel(exports.currentModelPath)];
                            case 1:
                                _a.sent();
                                images = exports.ieam.getFiles(videoPath, /.jpg|.png/);
                                console.log(images);
                                exports.ieam.inferenceVideo(images)
                                    .subscribe({
                                    complete: function () {
                                        console.log('helllo');
                                        observer.next("Hello!");
                                        observer.complete();
                                    }
                                });
                                return [2 /*return*/];
                        }
                    });
                }); })();
            }
        });
    },
    checkImage: function () {
        return new rxjs_1.Observable(function (observer) {
            (function () { return __awaiter(void 0, void 0, void 0, function () {
                var imageFile, image, decodedImage, inputTensor;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, exports.ieam.loadModel(exports.currentModelPath)];
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
                                    exports.ieam.inference(inputTensor)
                                        .subscribe(function (json) {
                                        var images = {};
                                        images['/static/images/image-old.png'] = json;
                                        json = Object.assign({ images: images, version: version, confidentCutoff: confidentCutoff, platform: process.platform + ":" + process.arch, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn });
                                        jsonfile.writeFile(staticPath + "/image.json", json, { spaces: 2 });
                                        exports.ieam.renameFile(imageFile, imagePath + "/image-old.png");
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
        });
    },
    initialInference: function () {
        return new rxjs_1.Observable(function (observer) {
            try {
                cameraDisabled = process.platform !== 'darwin' && !(0, fs_1.existsSync)('/dev/video0');
                if (!(0, fs_1.existsSync)(exports.currentModelPath)) {
                    (0, fs_1.mkdirSync)(exports.currentModelPath);
                }
                if (!(0, fs_1.existsSync)(newModelPath)) {
                    (0, fs_1.mkdirSync)(newModelPath);
                }
                if (!(0, fs_1.existsSync)(oldModelPath)) {
                    (0, fs_1.mkdirSync)(oldModelPath);
                }
                if (!(0, fs_1.existsSync)(oldImage)) {
                    (0, fs_1.copyFileSync)(imagePath + "/backup.png", oldImage);
                }
                exports.ieam.renameFile(oldImage, imagePath + "/image.png");
                exports.ieam.checkImage()
                    .subscribe({
                    complete: function () {
                        var video = exports.ieam.getVideoFile(backupPath + "/video-old");
                        if (!video) {
                            (0, fs_1.copyFileSync)(backupPath + "/video-bk.mp4", backupPath + "/video-old.mp4");
                        }
                        (0, fs_1.copyFileSync)(backupPath + "/video-old.mp4", videoPath + "/video.mp4");
                        var images = exports.ieam.getFiles(videoPath, /.jpg|.png/);
                        exports.ieam.inferenceVideo(images)
                            .subscribe({
                            complete: function () {
                                console.log('$#$#$ inferencvideo');
                                observer.complete();
                            }
                        });
                    }
                });
            }
            catch (e) {
                console.log(e);
                observer.complete();
            }
        });
    },
    extractVideo: function (file) {
        return new rxjs_1.Observable(function (observer) {
            try {
                if ((0, fs_1.existsSync)(file)) {
                    console.log('$video', file);
                    exports.ieam.deleteFiles(videoPath, /.jpg|.png/);
                    var process_1 = new ffmpeg(file);
                    process_1.then(function (video) {
                        video.fnExtractFrameToJPG(videoPath, {
                            every_n_frames: 150,
                            number: 5,
                            keep_pixel_aspect_ratio: true,
                            keep_aspect_ratio: true,
                            file_name: "image.jpg"
                        }, function (err, files) {
                            if (!err) {
                                console.log('video file: ', files);
                                observer.next(files);
                                observer.complete();
                            }
                            else {
                                console.log('video err: ', err);
                                observer.next();
                                observer.complete();
                            }
                        });
                    }, function (err) {
                        console.log('err: ', err);
                        observer.next([]);
                        observer.complete();
                    });
                }
                else {
                    console.log(file + " not found");
                    observer.next([]);
                    observer.complete();
                }
            }
            catch (e) {
                console.log('error: ', e.msg);
                observer.next([]);
                observer.complete();
            }
        });
    },
    observerReturn: function (observer, data) {
        observer.next(data);
        observer.complete();
    },
    checkVideo: function () {
        try {
            var video = exports.ieam.getVideoFile(videoPath + "/video");
            if (!video) {
                return;
            }
            console.log('here');
            exports.ieam.extractVideo(video)
                .subscribe(function (files) {
                if (files.length > 0) {
                    var images = files.filter(function (f) { return f.indexOf('.jpg') > 0; });
                    var video_1 = files.filter(function (f) { return f.indexOf('.jpg') < 0; });
                    if ((0, fs_1.existsSync)(video_1[0])) {
                        console.log(video_1[0]);
                        (0, fs_1.copyFileSync)(video_1[0], './public/backup/video-old.mp4');
                        (0, fs_1.unlinkSync)(video_1[0]);
                    }
                    exports.ieam.inferenceVideo(images);
                }
            });
        }
        catch (e) {
            console.log(e);
        }
    },
    deleteFiles: function (srcDir, ext) {
        var files = (0, fs_1.readdirSync)(srcDir);
        files.forEach(function (file) {
            if (ext && file.match(ext)) {
                (0, fs_1.unlinkSync)(videoPath + "/" + file);
            }
        });
    },
    removeFiles: function (srcDir) {
        return new rxjs_1.Observable(function (observer) {
            var arg = "rm -rf " + srcDir + "/*";
            exec(arg, { maxBuffer: 1024 * 2000 }, function (err, stdout, stderr) {
                if (!err) {
                    observer.next();
                    observer.complete();
                }
                else {
                    console.log(err);
                    observer.next();
                    observer.complete();
                }
            });
        });
    },
    getVideoFile: function (file) {
        var video = undefined;
        videoFormat.every(function (ext) {
            var v = "" + file + ext;
            if ((0, fs_1.existsSync)(v)) {
                video = v;
                return false;
            }
            else {
                return true;
            }
        });
        return video;
    },
    inferenceVideo: function (files) {
        return new rxjs_1.Observable(function (observer) {
            try {
                var $inference_1 = {};
                var result_1;
                files.forEach(function (imageFile) { return __awaiter(void 0, void 0, void 0, function () {
                    var image, decodedImage, inputTensor;
                    return __generator(this, function (_a) {
                        if ((0, fs_1.existsSync)(imageFile)) {
                            console.log(imageFile);
                            image = (0, fs_1.readFileSync)(imageFile);
                            decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
                            inputTensor = decodedImage.expandDims(0);
                            $inference_1[imageFile.replace('./public/', '/static/')] = (exports.ieam.inference(inputTensor));
                        }
                        return [2 /*return*/];
                    });
                }); });
                (0, rxjs_1.forkJoin)($inference_1)
                    .subscribe({
                    next: function (value) {
                        result_1 = value;
                    },
                    complete: function () {
                        console.log('$#@ ', result_1);
                        var json = Object.assign({}, { images: result_1, version: version, videoSrc: videoSrc + "?" + Date.now(), confidentCutoff: confidentCutoff, platform: process.platform + ":" + process.arch, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn });
                        jsonfile.writeFileSync(staticPath + "/video.json", json, { spaces: 2 });
                        exports.ieam.soundEffect(mp3s.theForce);
                        console.log('complete');
                        observer.complete();
                    }
                });
            }
            catch (e) {
                console.log(e);
                observer.complete();
            }
        });
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
            // console.log('predictions:', predictions.length, predictions[0]);
            console.log('time took: ', elapsedTime);
            console.log('build json...');
            observer.next({ bbox: predictions, elapsedTime: elapsedTime });
            observer.complete();
        });
    }
};
//# sourceMappingURL=utility.js.map