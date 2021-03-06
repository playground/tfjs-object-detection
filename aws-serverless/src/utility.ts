import { Observable, of, forkJoin } from 'rxjs';
import { existsSync, renameSync, copyFileSync, unlinkSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { Params } from './params';

const queryString = require('querystring');
const tfnode = require('@tensorflow/tfjs-node');
const jsonfile = require('jsonfile');
const player = require('play-sound')();
const ffmpeg = require('ffmpeg');
const cp = require('child_process'),
exec = cp.exec;

let model;
let labels;
let version;
const intervalMS = 10000;
let cycles = 0;
let count = 0;
let videoFormat = ['.mp4', '.avi', '.webm'];
let videoSrc = '/static/backup/video-old.mp4';
let cameraDisabled = true;
let confidentCutoff = 0.85;
export const currentModelPath = './model';
const imagePath = './public/images';
const newModelPath = './model-new';
const oldModelPath = './model-old';
const staticPath = './public/js';
export const mmsPath = '/mms-shared';
export const localPath = './local-shared';
const videoPath = './public/video';
const backupPath = './public/backup';
const oldImage = `${imagePath}/image-old.png`;
const video = `${videoPath}/video.mp4`;
const oldVideo = `${backupPath}/video-old.mp4`;
export let sharedPath = '';

const mp3s = {
  'snapshot': './public/media/audio-snap.mp3',
  'gotMail': './public/media/youve-got-mail-sound.mp3',
  'theForce': './public/media/may-the-force-be-with-you.mp3' 
};

export const util = {
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
        model = null;
        ieam.renameFile(oldImage, `${imagePath}/image.png`);
        ieam.checkImage()
        .subscribe({
          complete: () => {
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
                observer.next('inference complete')
                observer.complete();
              }
            })            
          }
        })
      } catch(e) {
        console.log(e);
        observer.next(e)
        observer.complete();
      }
    });
  },
  checkMMS: () => {
    try {
      let list;
      let config;
      if(existsSync(mmsPath)) {
        list = readdirSync(mmsPath);
        list = list.filter(item => /(\.zip)$/.test(item));
        sharedPath = mmsPath;  
      } else if(existsSync(localPath)) {
        list = readdirSync(localPath);
        config = list.filter(item => item === 'config.json');
        list = list.filter(item => /(\.zip)$/.test(item));
        sharedPath = localPath;
      }
      return list;  
    } catch(e) {
      console.log(e)
    }
  },
  outdated: () => {
    let json = jsonfile.readFileSync(`${staticPath}/image.json`);
    json.outdated = true;
    jsonfile.writeFileSync(`${staticPath}/image.json`, json, {spaces: 2});
    json = jsonfile.readFileSync(`${staticPath}/video.json`);
    json.outdated = true;
    jsonfile.writeFileSync(`${staticPath}/video.json`, json, {spaces: 2});
  },
  unzipMMS: (files: any) => {
    return new Observable((observer) => {
      let arg = '';
      console.log('list', files, sharedPath, newModelPath);
      if(!files || files.length == 0) {
        observer.complete()
      }
      files.forEach((file: string) => {
        if(file === 'model.zip') {
          arg = `unzip -o ${sharedPath}/${file} -d ${newModelPath}`;
        } else if(file === 'image.zip') {
          arg = `unzip -o ${sharedPath}/${file} -d ${imagePath}`;
        } else {
          observer.next();
          observer.complete();
        }
        console.log(arg)
        exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
          if(existsSync(`${sharedPath}/${file}`)) {
            unlinkSync(`${sharedPath}/${file}`);
          }
          if(!err) {
            ieam.moveFiles(currentModelPath, oldModelPath)
            .subscribe({
              complete: () => ieam.moveFiles(newModelPath, currentModelPath)
                .subscribe({
                  complete: () => {
                    util.outdated();
                    console.log('new model is available, restarting server...');
                    observer.complete();
                  },   
                  error: (e) => {
                    console.log(e);
                    observer.complete(); 
                  }
                }),  
            })
          } else {
            console.log(err);
            observer.complete();
          }
        });
      })
    });    
  }
}

export const ieam = {
  moveFiles: (srcDir, destDir) => {
    return new Observable((observer) => {
      let arg = `cp -r ${srcDir}/* ${destDir}`;
      if(srcDir === newModelPath) {
        arg += ` && rm -rf ${srcDir}/*`;
      }
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
  imageVideoExist: () => {
    return new Observable((observer) => {
      if(!existsSync(`${oldImage}`) || !ieam.getVideoFile(`${backupPath}/video-old`)) {
        (async () => {
          await ieam.loadModel(currentModelPath);      
          util.initialInference()
          .subscribe({
            complete: () => observer.complete()
          })
        })();
      } else {
        observer.complete()
      }
    });  
  },
  upload: (params: Params) => {
    return new Observable((observer) => {
      try {
        let body = params.body;
        let content = queryString.parse(body, '\r\n', ':');
        // console.log(params)
        if(content['Content-Type'].match(/image|video/)) {
          console.log(content['Content-Type'])
          let entireData = body.toString();           
          let contentType = content['Content-Type'].substring(1); 
  
          //Get the location of the start of the binary file, 
          //which happens to be where contentType ends
          let upperBoundary = entireData.indexOf(contentType) + contentType.length; 
          let data = entireData.substring(upperBoundary); 
  
          //replace trailing and starting spaces 
          let cleanData = data.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
  
          //Cut the extra things at the end of the data (Webkit stuff)
          let binaryData = cleanData.substring(0, cleanData.indexOf('------WebKitFormBoundary'));
          if(content['Content-Type'].indexOf('image') != -1) {
            writeFileSync(`${imagePath}/image.png`, binaryData, 'binary');
            ieam.checkImage()
            .subscribe({
              complete: () => {
                observer.next('File uploaded.')
                observer.complete()
              }  
            })
          } else {
            writeFileSync(video, binaryData, 'binary');
            ieam.extractVideo(`${videoPath}/video.mp4`)
            .subscribe({
              complete: () => {
                ieam.loadModelInferenceVideo()
                .subscribe({
                  complete: () => {
                    observer.next('File uploaded.')
                    observer.complete()
                  }
                })
              }  
            })
          }
        } else {
          console.log('invalid file type');
          observer.next('Invalid file type')
          observer.complete();
        }
      } catch(err) {
        observer.error(err);
      }
    });
  },
  loadModelInferenceVideo: () => {
    return new Observable((observer) => {
      (async () => {
        await ieam.loadModel(currentModelPath);

        let images = ieam.getFiles(videoPath, /.jpg|.png/);
        console.log(images)
        ieam.inferenceVideo(images)
        .subscribe({
          complete: () => {
            ieam.renameFile(video, oldVideo);
            console.log('helllo')  
            observer.next(`Hello!`);
            observer.complete();
  
          }
        })
      })(); 

    })
  },
  score: (params: Params) => {
    return new Observable((observer) => {
      const queryString = params.queryStringParameters;
      console.log('$$$', queryString)
      tfnode.ready().then((s) => {
        console.log('$@$@', s)
      })
      console.log('$$$tf', tfnode.getBackend())
      confidentCutoff = queryString.score ? parseFloat(queryString.score) : confidentCutoff;
      console.log(confidentCutoff)

      if(queryString.assetType === 'Image') {
        ieam.renameFile(oldImage, `${imagePath}/image.png`);
        ieam.checkImage()
        .subscribe({
          complete: () => {
            console.log('Updated result threshhold')  
            observer.next(`Updated result threshhold`);
            observer.complete()
          }  
        })
      } else {
        ieam.loadModelInferenceVideo()
        .subscribe({
          complete: () => {
            console.log('Updated result threshhold')  
            observer.next(`Updated result threshhold`);
            observer.complete();
          }
        })
      } 
    });
  },
  checkImage: () => {
    return new Observable((observer) => {
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
    })
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
    return new Observable((observer) => {
      try {
        let video = ieam.getVideoFile(`${videoPath}/video`);
        if(!video) {
          observer.complete();
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
            ieam.inferenceVideo(images)
            .subscribe({
              complete: () => observer.complete()
            })  
          }
        })
      } catch(e) {
        console.log(e);
        observer.complete()
      }  
    });
  },
  deleteFiles: (srcDir, ext) => {
    let files = readdirSync(srcDir);
    files.forEach((file) => {
      if(ext && file.match(ext)) {
        unlinkSync(`${videoPath}/${file}`)
      }
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
      model = await tfnode.node.loadSavedModel(modelPath);
      // if(!model) {
      //   model = await tfnode.node.loadSavedModel(modelPath);
      // } else {
      //   console.log('already loaded')
      // }
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
}