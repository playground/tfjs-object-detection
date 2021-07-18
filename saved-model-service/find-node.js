const findProcess = require('find-process');
const cp = require('child_process'),
exec = cp.exec;

const find = (name) => {
  findProcess('name', name, true)
  .then(function (list) {
    if(!list.find(exist)) {
      exec('node index.js', {maxBuffer: 1024 * 2000}, (err, stdout, stderr) => {
        console.log('restarting node index.js')
        console.log('there are %s node process(es)', list.length);
      });
    } 
  });
}

const exist = (instance) => {
  return instance.cmd === 'node index.js';
}

setInterval(() => {
  find('node');
}, 3000);