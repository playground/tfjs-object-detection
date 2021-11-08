import { Observable, of, forkJoin } from 'rxjs';
import { existsSync, renameSync, copyFileSync, unlinkSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { Messenger } from './messenger';
import { Params } from './params';
import path = require('path');
import StaticFileHandler = require('serverless-aws-static-file-handler');
const tfnode = require('@tensorflow/tfjs-node');
const jsonfile = require('jsonfile');
const player = require('play-sound')();
const ffmpeg = require('ffmpeg');
const cp = require('child_process'),
exec = cp.exec;

const clientFilePath = path.join(process.cwd(), './public/');
const fileHandler = new StaticFileHandler(clientFilePath);
let model;

export const handler = (params: Params, context, callback) => {
  params.body = params.body ? JSON.parse(params.body) : null;
  console.log('$$$!!!params', params.path, params.queryStringParameters.score, params.queryStringParameters.assetType)
  params.action = params.body ? params.body.action : params.path.replace(/^\/|\/$/g, '');
  console.log('$$$!!!params', params.path, params.action, process.cwd(), clientFilePath)
  if(!params.action) {
    console.log('$$$###params', params.path, params.action, process.cwd(), clientFilePath)
    params.path = 'index.html';
    ieam.initialInference()
    .subscribe({
      complete: () => {
        callback(null, fileHandler.get(params, context));
      }
    })
  } else {
    params.contentType = params.contentType ? params.contentType : 'application/json';
    const response = new Messenger(params);
    action.exec(params)
    .subscribe((data) => {
      callback(null, response.send(data));
    })
  }
}

let labels;
let version;
const intervalMS = 10000;
let cycles = 0;
let count = 0;
let videoFormat = ['.mp4', '.avi', '.webm'];
let videoSrc = '/static/backup/video-old.mp4';
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
const backupPath = './public/backup';
const oldImage = `${imagePath}/image-old.png`;
let sharedPath = '';

let action = {
  exec: (params: Params) => {
    try {
      console.log('$$$params', params.action, params.score, process.cwd())
      // ieam.initialInference()
      // .subscribe({
      //   complete: () => {
      //     console.log('$$$###params', params.path, params.action, process.cwd(), clientFilePath)
      //     return (action[params.action] || action.default)(params);  
      //   }
      // })
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
  upload: (params: Params) => {
    return new Observable((observer) => {
      try {
        console.log('#$@#$@', params.files, params)
        if (!params.files || Object.keys(params.files).length === 0) {
          // return params.status(400).send('No files were uploaded.');
        } else {
          let imageFile = params.files.imageFile;
          const mimetype = imageFile ? imageFile.mimetype : '';
          if(mimetype.indexOf('image/') >= 0 || mimetype.indexOf('video/') >= 0) {
            // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
            console.log('type: ', imageFile, imageFile.mimetype)
            let uploadPath = __dirname + `/public/images/image.png`;
            if(mimetype.indexOf('video/') >= 0) {
              let ext = imageFile.name.match(/\.([^.]*?)$/);
              uploadPath = __dirname + `/public/video/video${ext[0]}`;
            }
            
            // Use the mv() method to place the file somewhere on your server
            imageFile.mv(uploadPath, (err: any) => {
              // if (err)
                // return params.status(500).send(err);
        
              // res.send({status: true, message: 'File uploaded!'});
            });
          } else {
            observer.next({status: true, message: 'Only image and video files are accepted.'});
            observer.complete();
          }
        }  
      } catch(err) {
        observer.error(err);
      }
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
      confidentCutoff = parseFloat(queryString.score);
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
        (async () => {
          await ieam.loadModel(currentModelPath);

          let images = ieam.getFiles(videoPath, /.jpg|.png/);
          console.log(images)
          ieam.inferenceVideo(images)
          .subscribe({
            complete: () => {
              console.log('helllo')  
              observer.next(`Hello!`);
              observer.complete();
    
            }
          })
        })(); 
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

const mp3s = {
  'snapshot': './public/media/audio-snap.mp3',
  'gotMail': './public/media/youve-got-mail-sound.mp3',
  'theForce': './public/media/may-the-force-be-with-you.mp3' 
};

let ieam = {
  initialInference: () => {
    return new Observable((observer) => {
      try {
        cameraDisabled = process.platform !== 'darwin' && !existsSync('/dev/video0');
        if(!existsSync(currentModelPath)) {
          mkdirSync(currentModelPath);
        }
        if(!existsSync(newModelPath)) {
          mkdirSync(newModelPath);
        }
        if(!existsSync(oldModelPath)) {
          mkdirSync(oldModelPath);
        }
        if(!existsSync(oldImage)) {
          copyFileSync(`${imagePath}/backup.png`, oldImage)
        }
        ieam.renameFile(oldImage, `${imagePath}/image.png`);
        let video = ieam.getVideoFile(`${backupPath}/video-old`);
        if(!video) {
          copyFileSync(`${backupPath}/video-bk.mp4`, `${backupPath}/video-old.mp4`);
        }  
        copyFileSync(`${backupPath}/video-old.mp4`, `${videoPath}/video.mp4`);

        let images = ieam.getFiles(videoPath, /.jpg|.png/);
        ieam.inferenceVideo(images)
        .subscribe({
          complete: () => {
            console.log('$#$#$ inferencvideo')
            observer.complete();
          }
        })        
      } catch(e) {
        console.log(e);
        observer.complete();
      }
    });
  },
  extractVideo: (file) => {
    return new Observable((observer) => {
      try {
        if(existsSync(file)) {
          console.log('$video', file)
          ieam.deleteFiles(videoPath, /.jpg|.png/);
          let process = new ffmpeg(file);
          process.then((video) => {
            video.fnExtractFrameToJPG(videoPath, {
              every_n_frames: 150,
              number: 5,
              keep_pixel_aspect_ratio : true,
              keep_aspect_ratio: true,
              file_name : `image.jpg`
            }, (err, files) => {
              if(!err) {
                console.log('video file: ', files);
                observer.next(files);
                observer.complete();        
              } else {
                console.log('video err: ', err);
                observer.next();
                observer.complete();    
              }
            })  
          }, (err) => {
            console.log('err: ', err);
            observer.next([]);
            observer.complete();
          })
        } else {
          console.log(`${file} not found`)
          observer.next([]);
          observer.complete();    
        }
      } catch(e) {
        console.log('error: ', e.msg);
        observer.next([]);
        observer.complete();
      }
    });
  },
  observerReturn: (observer, data) => {
    observer.next(data);
    observer.complete();    
  },
  checkVideo: () => {
    try {
      let video = ieam.getVideoFile(`${videoPath}/video`);
      if(!video) {
        return;
      }
      console.log('here')
      ieam.extractVideo(video)
      .subscribe((files: any[]) => {
        if(files.length > 0) {
          let images = files.filter((f) => f.indexOf('.jpg') > 0);
          let video = files.filter((f) => f.indexOf('.jpg') < 0);
          if(existsSync(video[0])) {
            console.log(video[0]);
            copyFileSync(video[0], './public/backup/video-old.mp4');
            unlinkSync(video[0]);
          }
          ieam.inferenceVideo(images);  
        }
      })
    } catch(e) {
      console.log(e);
    }
  },
  deleteFiles: (srcDir, ext) => {
    let files = readdirSync(srcDir);
    files.forEach((file) => {
      if(ext && file.match(ext)) {
        unlinkSync(`${videoPath}/${file}`)
      }
    });
  },
  removeFiles: (srcDir) => {
    return new Observable((observer) => {
      let arg = `rm -rf ${srcDir}/*`;
      exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        if(!err) {
          observer.next();
          observer.complete();
        } else {
          console.log(err);
          observer.next();
          observer.complete();
        }
      });
    });    
  },
  getVideoFile: (file: string) => {
    let video = undefined;
    videoFormat.every((ext) => {
      let v = `${file}${ext}`;
      if(existsSync(v)) {
        video = v;
        return false;
      } else {
        return true;
      }
    })
    return video;
  },
  inferenceVideo: (files: any) => {
    return new Observable((observer) => {
      try {
        let $inference = {};
        let result;
        files.forEach(async (imageFile) => {
          if(existsSync(imageFile)) {
            console.log(imageFile)
            const image = readFileSync(imageFile);
            const decodedImage = tfnode.node.decodeImage(new Uint8Array(image), 3);
            const inputTensor = decodedImage.expandDims(0);
            $inference[imageFile.replace('./public/', '/static/')] = (ieam.inference(inputTensor));
          }
        })
        forkJoin($inference)
        .subscribe({
          next: (value) => {
            result = value;
          },
          complete: () => {
            console.log('$#@ ', result);
            let json = Object.assign({}, {images: result, version: version, videoSrc: `${videoSrc}?${Date.now()}`, confidentCutoff: confidentCutoff, platform: `${process.platform}:${process.arch}`, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn});
            jsonfile.writeFileSync(`${staticPath}/video.json`, json, {spaces: 2});
            ieam.soundEffect(mp3s.theForce);  
            console.log('complete');
            observer.complete();
          }
        });
      } catch(e) {
        console.log(e);
        observer.complete();
      }
  
    });
  },
  soundEffect: (mp3) => {
    console.log(mp3)
    player.play(mp3, (err) => {
      if (err) console.log(`Could not play sound: ${err}`);  
    });  
  },
  getFiles: (srcDir, ext) => {
    let files = readdirSync(srcDir);
    return files.map((file) => {
      if(ext && file.match(ext)) {
        return `${srcDir}/${file}`;
      }
    });  
  },
  renameFile: (from, to) => {
    if(existsSync(from)) {
      renameSync(from, to);
    }    
  },
  loadModel: async (modelPath: string) => {
    try {
      const startTime = tfnode.util.now();
      // console.log('$$$model', model)
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
      // console.log('predictions:', predictions.length, predictions[0]);
      console.log('time took: ', elapsedTime);
      console.log('build json...');
      observer.next({bbox: predictions, elapsedTime: elapsedTime});
      observer.complete();  
    });
  }
};