import { Observable, of } from 'rxjs';
import { existsSync, renameSync, copyFileSync, unlinkSync, readFileSync } from 'fs';
import { Messenger } from './messenger';
import { Params } from './params';
import path = require('path');
import StaticFileHandler = require('serverless-aws-static-file-handler');
let tfnode = require('@tensorflow/tfjs-node');
const jsonfile = require('jsonfile');

const clientFilePath = path.join(process.cwd(), './public/');
const fileHandler = new StaticFileHandler(clientFilePath);

export const handler = (params: Params, context, callback) => {
  params.body = params.body ? JSON.parse(params.body) : null;
  params.action = params.body ? params.body.action : params.path.replace(/^\/|\/$/g, '');
  console.log('$$$params', params.path, params.action, process.cwd(), clientFilePath)
  if(!params.action) {
    params.path = 'index.html';
    callback(null, fileHandler.get(params, context));
  } else {
    params.contentType = params.contentType ? params.contentType : 'application/json';
    const response = new Messenger(params);
    action.exec(params, )
    .subscribe((data) => {
      callback(null, response.send(data));
    })
  }
}

let model;
let labels;
let version;
const intervalMS = 10000;
let cycles = 0;
let count = 0;
let videoFormat = ['.mp4', '.avi', '.webm'];
let cameraDisabled = true;
let confidentCutoff = 0.85;
const currentModelPath = './model';
const imagePath = './public/images';
const newModelPath = './model-new';
const oldModelPath = './model-old';
const staticPath = './public/js';
const mmsPath = '/mms-shared';
const localPath = './local-shared';
const videoPath = './public/video';
const oldImage = `${imagePath}/image-old.png`;
let sharedPath = '';

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
  score: (params: Params) => {
    return new Observable((observer) => {
      const queryString = params.queryStringParameters;
      console.log('$$$', queryString)
      tfnode.ready().then((s) => {
        console.log('$@$@', s)
      })
      console.log('$$$tf', tfnode.getBackend())
      confidentCutoff = +parseFloat(queryString.score).toFixed(2);
      console.log(confidentCutoff)

      if(queryString.assetType === 'Image') {
        ieam.renameFile(oldImage, `${imagePath}/image.png`); 
        (async () => {
          await ieam.loadModel(currentModelPath);
          let imageFile = `${imagePath}/image.png`;
          if(!existsSync(imageFile)) {
            imageFile = `${imagePath}/image.jpg`;
          }
          if(existsSync(imageFile)) {
            try {
              console.log(imageFile)
              const image = readFileSync(imageFile);
              const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
              const inputTensor = decodedImage.expandDims(0);
              ieam.inference(inputTensor)
              .subscribe((json) => {
                let images = {};
                images['/static/images/image-old.png'] = json;
                json = Object.assign({images: images, version: version, confidentCutoff: confidentCutoff, platform: `${process.platform}:${process.arch}`, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn});
                jsonfile.writeFile(`${staticPath}/image.json`, json, {spaces: 2});
                ieam.renameFile(imageFile, `${imagePath}/image-old.png`);
  
                observer.next(`Hello!`);
                observer.complete();
              });  
            } catch(e) {
              console.log(e);
              observer.next(`Hello!`);
              observer.complete();
            }
          }
        })(); 
      } else {
        // images = ieam.getFiles(videoPath, /.jpg|.png/);
        // console.log(images)
        // ieam.inferenceVideo(images);  
        observer.next(`Hello!`);
        observer.complete();
      } 
  
    });
  },
  default: (params: Params) => {
    return new Observable((observer) => {
      observer.next(`Method ${params.action} not found.`);
      observer.complete();
    });
  }
}

let ieam = {
  renameFile: (from, to) => {
    if(existsSync(from)) {
      renameSync(from, to);
    }    
  },
  loadModel: async (modelPath: string) => {
    try {
      const startTime = tfnode.util.now();
      console.log('$$$model', model)
      if(!model) {
        model = await tfnode.node.loadSavedModel(modelPath);
      } else {
        console.log('already loaded')
      }
      const endTime = tfnode.util.now();

      console.log(`loading time:  ${modelPath}, ${endTime-startTime}`);
      labels = jsonfile.readFileSync(`${modelPath}/assets/labels.json`);
      version = jsonfile.readFileSync(`${modelPath}/assets/version.json`);
      console.log('version: ', version)

    } catch(e) {
      console.log('$@$@', e)
    }
  },
  inference: (inputTensor) => {
    return new Observable((observer) => {
      const startTime = tfnode.util.now();
      let outputTensor = model.predict({input_tensor: inputTensor});
      const scores = outputTensor['detection_scores'].arraySync();
      const boxes = outputTensor['detection_boxes'].arraySync();
      const classes = outputTensor['detection_classes'].arraySync();
      const num = outputTensor['num_detections'].arraySync();
      const endTime = tfnode.util.now();
      outputTensor['detection_scores'].dispose();
      outputTensor['detection_boxes'].dispose();
      outputTensor['detection_classes'].dispose();
      outputTensor['num_detections'].dispose();
      
      let predictions = [];
      const elapsedTime = endTime - startTime;
      for (let i = 0; i < scores[0].length; i++) {
        let score = scores[0][i].toFixed(2);
        if (score >= confidentCutoff) {
          predictions.push({
            detectedBox: boxes[0][i].map((el)=>el.toFixed(2)),
            detectedClass: labels[classes[0][i]],
            detectedScore: score
          });
        }
      }
      console.log('predictions:', predictions.length, predictions[0]);
      console.log('time took: ', elapsedTime);
      console.log('build json...');
      observer.next({bbox: predictions, elapsedTime: elapsedTime});
      observer.complete();  
    });
  }
};