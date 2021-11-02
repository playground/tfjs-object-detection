let tfnode = require('@tensorflow/tfjs-node');
const {unlinkSync, stat, renameSync, readdir, readdirSync, existsSync, readFileSync, copyFileSync, mkdirSync} = require('fs');
const jsonfile = require('jsonfile');
const { Observable, Subject, forkJoin } = require('rxjs');
const ffmpeg = require('ffmpeg');
const https = require('https');
const http = require('http');
const cp = require('child_process'),
exec = cp.exec;
const player = require('play-sound')();

const path = require('path');
const winston = require('winston');
const consoleTransport = new winston.transports.Console()
const myWinstonOptions = {
    transports: [consoleTransport]
}
const logger = new winston.createLogger(myWinstonOptions)

let model;
let labels;
let version;
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
let timer;
const intervalMS = 10000;
let cycles = 0;
let count = 0;
let videoFormat = ['.mp4', '.avi', '.webm'];
let videoSrc = '/static/backup/video-old.mp4';
let cameraDisabled = true;
let confidentCutoff = 0.85;
let assetType = 'Image';
const $score = new Subject().asObservable().subscribe((data) => {
  if(data.name == 'score') {
    confidentCutoff = parseFloat(data.score).toFixed(2);
    console.log('subscribe: ', data)
    assetType = data.assetType; 
    if(data.assetType === 'Image') {
      ieam.renameFile(oldImage, `${imagePath}/image.png`);  
    } else {
      images = ieam.getFiles(videoPath, /.jpg|.png/);
      console.log(images)
      ieam.inferenceVideo(images);  
    } 
  }
});

module.exports.$score = $score;

const state = {
  server: null,
  sockets: [],
};
process.env.npm_config_cameraOn = false;
process.env.npm_config_remoteCamerasOn = false;

console.log('platform ', process.platform, process.arch)

mp3s = {
  'snapshot': './public/media/audio-snap.mp3',
  'gotMail': './public/media/youve-got-mail-sound.mp3',
  'theForce': './public/media/may-the-force-be-with-you.mp3' 
};

let ieam = {
  soundEffect: (mp3) => {
    // console.log(mp3)
    player.play(mp3, (err) => {
      if (err) {
        // console.log(`Could not play sound: ${err}`);
      }    
    });  
  },
  capture: () => {
    ieam.soundEffect(mp3s.snapshot);
    let arg = `ffmpeg -ss 0.5 -f avfoundation -r 30.000030 -i "0" -t 1 -vframes 1 ./public/images/image.png -y`;
    if(process.platform !== 'darwin') {
      // arg = `ffmpeg -i /dev/video0 -vframes 1 -vf "eq=contrast=1.5:brightness=0.5" ./public/images/image.png -y`;
      arg = `fswebcam -r 640x480 --no-banner -S 25 public/images/image.jpg`;
    }
    exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
      if(!err) {
        console.log('photo captured...');
      } else {
        console.log(err);
      }
    });
  },
  sleep: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  checkImage: async () => {
    try {
      if(process.env.npm_config_cameraOn == 'true' && ieam.doCapture) {
        console.log('pause ', Boolean(process.env.npm_config_cameraOn), process.env.npm_config_cameraOn)
        ieam.capture();
      }
      let imageFile = `${imagePath}/image.png`;
      if(!existsSync(imageFile)) {
        imageFile = `${imagePath}/image.jpg`;
      }
      if(existsSync(imageFile)) {
        try {
          cycles = 0;
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
            // ieam.soundEffect(mp3s.theForce);  
            ieam.doCapture = true;  
          });
        } catch(e) {
          console.log(e);
          unlinkSync(imageFile);
        }
      } else if((process.env.npm_config_remoteCamerasOn === true || process.env.npm_config_remoteCamerasOn === 'true') && ++cycles >= 3) {
        console.log('is ' + process.env.npm_config_remoteCamerasOn)
        if(Date.now() - process.env.npm_config_lastinteractive > 120000) {
          process.env.npm_config_remoteCamerasOn = false;
        }
        if(assetType === 'Image') {
          const random = Math.floor(Math.random() * 10);
          imageFile = `${imagePath}/dataset/image${random}.jpg`;
          copyFileSync(imageFile, `${imagePath}/image.jpg`)  
        } else {
          images = ieam.getFiles(videoPath, /.jpg|.png/);
          ieam.inferenceVideo(images);  
        }
      }  
    } catch(e) {
      console.log(e);
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
  },
  inferenceVideo: (files) => {
    try {
      let $inference = {};
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
          console.log(value);
          let json = Object.assign({}, {images: value, version: version, videoSrc: `${videoSrc}?${Date.now()}`, confidentCutoff: confidentCutoff, platform: `${process.platform}:${process.arch}`, cameraDisabled: cameraDisabled, remoteCamerasOn: process.env.npm_config_remoteCamerasOn});
          jsonfile.writeFile(`${staticPath}/video.json`, json, {spaces: 2});
          // ieam.soundEffect(mp3s.theForce);  
        },
        complete: () => {
          console.log('complete');
        }
      });
    } catch(e) {
      console.log(e);
    }
  },
  traverse: (dir, done) => {
    var results = [];
    readdir(dir, (err, list) => {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = path.resolve(dir, file);
        stat(file, (err, stat) => {
          if (stat && stat.isDirectory()) {
            ieam.traverse(file, (err, res) => {
              results = results.concat(res);
              next();
            });
          } else {
            results.push(file);
            next();
          }
        });
      })();
    });
  },
  readConfig: (configs) => {
    configs.forEach((config) => {
      let json = jsonfilereadFileSync(`${sharedPath}/${config}`);
      if(json && json.modelPath) {
        
      }
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
      ieam.checkVideo();
      return list;  
    } catch(e) {
      console.log(e)
    }
  },
  getVideoFile: (file) => {
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
  checkVideo: () => {
    try {
      let video = ieam.getVideoFile(`${videoPath}/video`);
      if(!video) {
        return;
      }
      console.log('here')
      ieam.extractVideo(video)
      .subscribe((files) => {
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
  unzipMMS: (files) => {
    return new Observable((observer) => {
      let arg = '';
      console.log('list', files);
      files.forEach((file) => {
        if(file === 'model.zip') {
          arg = `unzip -o ${sharedPath}/${file} -d ${newModelPath}`;
        } else if(file === 'image.zip') {
          arg = `unzip -o ${sharedPath}/${file} -d ${imagePath}`;
        } else {
          observer.next();
          observer.complete();
        }
        exec(arg, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
          if(existsSync(`${sharedPath}/${file}`)) {
            unlinkSync(`${sharedPath}/${file}`);
          }
          if(!err) {
            observer.next();
            observer.complete();
          } else {
            console.log(err);
            observer.next();
            observer.complete();
          }
        });
      })
    });    
  },  
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
  getFiles: (srcDir, ext) => {
    let files = readdirSync(srcDir);
    return files.map((file) => {
      if(ext && file.match(ext)) {
        return `${srcDir}/${file}`;
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
  renameFile: (from, to) => {
    if(existsSync(from)) {
      renameSync(from, to);
    }    
  },
  loadModel: async (modelPath) => {
    try {
      let newVersion = jsonfile.readFileSync(`${modelPath}/assets/version.json`);
      if(version && version.version === newVersion.version) {
        ieam.removeFiles(modelPath)
        .subscribe(() => {
          ieam.resetTimer();
        });
      }
      else if(modelPath === newModelPath || modelPath === localPath) {
        console.log('iam new')
        ieam.moveFiles(currentModelPath, oldModelPath)
        .subscribe({
          next: (v) => ieam.moveFiles(newModelPath, currentModelPath)
            .subscribe({
              next: (v) => {
                
                  console.log('new model is available, restarting server...');
                  ieam.soundEffect(mp3s.gotMail);  
                  process.exit(0);
                
              },   
              error: (e) => {
                console.log('reset timer');
                ieam.resetTimer(); 
              }
            }),  
          error: (e) => {
            console.log('reset timer');
            ieam.resetTimer(); 
          }
        })
      } else if(modelPath !== newModelPath){
        count++;
        const startTime = tfnode.util.now();
        model = await tfnode.node.loadSavedModel(modelPath);
        const endTime = tfnode.util.now();

        console.log(`loading time:  ${modelPath}, ${endTime-startTime}`);
        labels = jsonfile.readFileSync(`${modelPath}/assets/labels.json`);
        version = jsonfile.readFileSync(`${modelPath}/assets/version.json`);
        console.log('version: ', version)

        let images = ieam.getFiles(videoPath, /.jpg|.png/);
        console.log(images)
        ieam.inferenceVideo(images);      
      }
    } catch(e) {
      console.log(e);
      if(modelPath === newModelPath) {
        ieam.removeFiles(modelPath)
        .subscribe(() => {
          console.log('modelpath', modelPath)
          ieam.loadModel(currentModelPath);
        })
      } else if(modelPath === currentModelPath) {
        ieam.loadModel(oldModelPath);
      } else {
        console.log('PANIC! no good model to load');
      }
      ieam.resetTimer();
    }
  },
  resetTimer: () => {
    clearInterval(timer);
    timer = null;
    ieam.setInterval(intervalMS);  
  },
  checkNewModel: async () => {
      let files = readdirSync(newModelPath);
      list = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
      // console.log(files, list)
      if(list.length > 0) {
        clearInterval(timer);
        await ieam.loadModel(newModelPath);
        // ieam.setInterval(intervalMS);
      }
  },
  setInterval: (ms) => {
    timer = setInterval(async () => {
      let mmsFiles = ieam.checkMMS(); 
      if(mmsFiles && mmsFiles.length > 0) {
        clearInterval(timer);
        ieam.unzipMMS(mmsFiles)
        .subscribe(async () => {
          await ieam.checkNewModel();
          ieam.setInterval(intervalMS);
        }) 
      } else {
        await ieam.checkNewModel();
        ieam.checkImage();
      }
    }, ms);
  },
  initialInference: () => {
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
  },
  start: () => {
    count = 0;
    let app = require('./server')();
    if(existsSync('certs/private.key') && existsSync('certs/certificate.crt') && existsSync('certs/carootcert.der') && existsSync('certs/caintermediatecert.der')) {
      const credentials = {
        passphrase: 'ieam',
        key: readFileSync('certs/private.key', 'ascii'),
        cert: readFileSync('certs/certificate.crt', 'ascii'),
        ca: [readFileSync('certs/carootcert.der', 'ascii'), readFileSync('certs/caintermediatecert.der', 'ascii')]
      }
      https.Server(credentials, app).listen(443, () => {
        console.log('Started on 443');
      });
      state.server = app.listen(80, () => {
        console.log('Started on 80');
      });
    } else {
      state.server = app.listen(3000, () => {
        console.log('Started on 3000');
      });
    }
    state.server.on('connection', (socket) => {
      // console.log('Add socket', state.sockets.length + 1);
      state.sockets.push(socket);
    });
  },
  restart: () => {
    // clean the cache
    Object.keys(require.cache).forEach((id) => {
      if(id.indexOf('/tfjs-node/') > 0) {
        // console.log('Reloading', id);
        delete require.cache[id];
      }  
    });

    state.sockets.forEach((socket, index) => {
      // console.log('Destroying socket', index + 1);
      if (socket.destroyed === false) {
        socket.destroy();
      }
    });
  
    state.sockets = [];
  
    state.server.close(() => {
      console.log('Server is closed');
      console.log('\n----------------- restarting -------------');
      ieam.start();
      tfnode = require('@tensorflow/tfjs-node');
      delete(model);
      delete(labels);
      delete(version);
      ieam.loadModel(currentModelPath)
      ieam.initialInference();  
      ieam.setInterval(intervalMS);
    });
  }      
}

ieam.start();
ieam.loadModel(currentModelPath)
ieam.initialInference();  
ieam.setInterval(intervalMS);
