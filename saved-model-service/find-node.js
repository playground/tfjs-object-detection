const findProcess = require('find-process');
const { networkInterfaces } = require('os');
const cp = require('child_process'),
exec = cp.exec;

let timer;
const nets = networkInterfaces();
const netObj = {};
Object.keys(nets).forEach((name) => {
  nets[name].forEach((net) => {
    if(net.family === 'IPv4' && !net.internal) {
      if(!netObj[name]) {
        netObj[name] = [];
      }
      if(!netObj[name].find((ip) => ip === net.address)) {
        netObj[name].push(net.address); 
      }
    }  
  })
})
const hostIP = netObj['en0'] && netObj['en0'].length > 0 ? netObj['en0'][0] : undefined;
const port = 3000;

const find = (name) => {
  findProcess('name', name, true)
  .then(function (list) {
    if(name === 'node') {
      if(!list.find(exist)) {
        clearInterval(timer);
        let child = exec('node index.js', {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
          console.log('restarting node index.js')
          console.log('there are %s node process(es)', list.length);
          sleep(5000).then(() => {
            setCheckInterval(10000);
          })
        });
        child.stdout.pipe(process.stdout);
        child.on('data', (data) => {
          console.log(data)
        })
      }
    } else if(name === 'ngrok') {
      console.log('find ngrok')
      if(!list.find(ngrok)) {
        console.log('no ngrok', hostIP, port)
        clearInterval(timer);
        let ngrokChild = exec(`ngrok http ${port}`, {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
          console.log('starting ngrok')
          sleep(5000).then(() => {
            setCheckInterval(10000);
          })
        });
        ngrokChild.stdout.pipe(process.stdout);
        ngrokChild.on('data', (data) => {
          console.log(data)
        })
      }
    }
    // let ngrok = exec('lsof -PiTCP -sTCP:LISTEN | grep ngrok', {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
    // });
    // ngrok.stdout.pipe(process.stdout);
    // ngrok.on('data', (data) => {
    //   console.log(data)
    // })
  });
}

const exist = (instance) => {  
  console.log(instance.cmd)
  return instance.cmd === 'node index.js';
}

const ngrok = (instance) => {  
  console.log('ngrok', instance)
  return instance.cmd === 'ngrok';
}

const setCheckInterval = (ms) => {
  timer = setInterval(() => {
    find('node');
    find('ngrok');
  }, ms);
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

find('node');
find('ngrok');

