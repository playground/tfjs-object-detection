const { Observable } = require('rxjs');
const { util } = require('./.build/src/utility');
const findProcess = require('find-process');
const cp = require('child_process'),
exec = cp.exec;

let timer;
let intervalMS = 10000;

const find = (name) => {
  return new Observable((observer) => {
    findProcess('name', name, true)
    .then(function (list) {
      console.log('there are now %s node process(es)', list.length);
      // console.log(list)
      if(!list.find(exist)) {
        clearInterval(timer);
        console.log('restarting serverless')
        let child = exec('serverless offline start --allowCache --host "0.0.0.0"', {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        });
        child.stdout.pipe(process.stdout);
        child.on('data', (data) => {
          console.log(data)
        })
        observer.complete();
    } else {
        observer.complete();
      } 
    });  
  })
}

const exist = (instance) => {
  return instance.cmd.indexOf('serverless offline') > 0;
}

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const setCheckInterval = (ms) => {
  clearInterval(timer);
  timer = null;
  timer = setInterval(() => {
    checking();
  }, ms);
};

const checkIncoming = () => {
  return new Observable((observer) => {
    let mmsFiles = util.checkMMS();
    if(mmsFiles && mmsFiles.length > 0) {
      clearInterval(timer);
      util.unzipMMS(mmsFiles)
      .subscribe(() => {
        observer.complete();
      }) 
    } else {
      observer.complete();
    }  
  })
}

const checking = () => {
  checkIncoming()
  .subscribe({
    complete: () => {
      find('node')
      .subscribe({
        complete: () => {
          console.log('sleep a bit')
          sleep(5000).then(() => {
            setCheckInterval(intervalMS);
          })
        }  
      })      
    }
  })
}

checking();