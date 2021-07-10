let ieam = {
  prevJson: '',
  timer: null,
  intervalMS: 5000,
  loadJson: (file) => {
    fetch(file).then(async (res) => {
      let json = await res.json();
      if(JSON.stringify(json) !== JSON.stringify(ieam.prevJson)) {
        ieam.prevJson = json;
        ieam.drawBBox();
        console.log(ieam.prevJson)
      }
    })
  },
  setInterval: (ms) => {
    ieam.timer = setInterval(async () => {
      ieam.loadJson('/static/js/image.json');
    }, ms);
  },    
  resetTimer: () => {
    clearInterval(ieam.timer);
    ieam.timer = null;
    ieam.setInterval(ieam.intervalMS);  
  },
  toggleCam: (e) => {
    clearInterval(ieam.timer);
    ieam.timer = null;
    const state = e.currentTarget.defaultValue === 'Camera Off';
    e.currentTarget.defaultValue = state ? 'Camera On' : 'Camera Off';
    fetch(`/camera?on=${state}`)
      .then((res) => {
        ieam.resetTimer();
        console.log(res);
      });
    state ? document.querySelector('.submit').disabled = true : document.querySelector('.submit').disabled = false 
  },
  captureCam: () => {
    const webcamElement = document.getElementById('webcam');
    const snapSoundElement = document.getElementById('snapSound');
    const webcam = new Webcam(webcamElement, 'user', canvasElement, snapSoundElement);
    webcam.start().then((res) => {
      let picture = web.snap();
    }).catch((e) => {
      console.log(e);
    })
  },
  onSubmit: () => {
    console.log(ieam.prevJson);
    clearInterval(ieam.timer);
    let $form = document.forms.namedItem('uploadForm');
    $form.addEventListener('submit', (evt) => {
      evt.preventDefault();
      // console.log(ieam.prevJson)
      let output = document.querySelector('div.output')
      const files = document.querySelector('[name=imageFile]').files;
      if(files[0]) {
        let formData = new FormData();
        formData.append('imageFile', files[0]);
        let xhr = new XMLHttpRequest();
        xhr.onload = function(oEvent) {
          if (xhr.status == 200) {
            output.innerHTML = "Uploaded!";
            ieam.loadJson('/static/js/image.json');
          } else {
            oOutput.innerHTML = "Error " + xhr.status + " occurred when trying to upload your file.<br \/>";
          }
          ieam.resetTimer();
        };
  
        xhr.open("POST", "/upload");
        xhr.send(formData);
      }
    });
  },
  drawBBox: () => {
    let output = document.querySelector('div.output');
    let objDetected = {};
    let version = document.querySelector('div.version');
    let vobj = ieam.prevJson.version;
    version.innerHTML = vobj ? `Model: ${vobj.name}, Version: ${vobj.version}` : 'version missing'

    const context = document.getElementById('canvas').getContext('2d');
    const canvas = document.getElementById('canvas');
    const timeDiv = document.getElementById('time');
    let table = document.getElementById('table');
    timeDiv.innerHTML = `Inference time: ${parseFloat(ieam.prevJson.elapsedTime).toFixed(2)}`;

    let rowCount = table.rows.length;
    for(let i = 0; i < rowCount; i++) {
      table.deleteRow(0);
    }

    let row = document.createElement('tr');
    let cell = document.createElement('th');
    let cellText = document.createTextNode('Label');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Confidence');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Min Pos');
    cell.appendChild(cellText);
    row.appendChild(cell)
    cell = document.createElement('th');
    cellText = document.createTextNode('Max Pos');
    cell.appendChild(cellText);
    row.appendChild(cell)
    table.appendChild(row);

    let img = new Image();
    img.addEventListener('load', () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      canvas.width = width;
      canvas.height = height;
      canvas.width = width;
      canvas.height = height;
      context.drawImage(img, 0, 0, width, height);      

      ieam.prevJson.bbox.forEach((box) => {
        let bbox = box.detectedBox;
        if(objDetected[box.detectedClass]) {
          objDetected[box.detectedClass]++;
        } else {
          objDetected[box.detectedClass] = 1; 
        }  
        row = document.createElement('tr');
        cell = document.createElement('td');
        cellText = document.createTextNode(box.detectedClass);
        cell.appendChild(cellText);
        row.appendChild(cell)
        cell = document.createElement('td');
        cellText = document.createTextNode(box.detectedScore);
        cell.appendChild(cellText);
        row.appendChild(cell);
        cell = document.createElement('td');
        cellText = document.createTextNode(`(${bbox[0]},${bbox[1]})`);
        cell.appendChild(cellText);
        row.appendChild(cell);
        cell = document.createElement('td');
        cellText = document.createTextNode(`(${bbox[2]},${bbox[3]})`);
        cell.appendChild(cellText);
        row.appendChild(cell);
        table.appendChild(row);

        context.fillStyle = 'rgba(255,255,255,0.2)';
        context.strokeStyle = 'yellow';
        context.fillRect(bbox[1] * width, bbox[0] * height, width * (bbox[3] - bbox[1]),
        height * (bbox[2] - bbox[0]));
        context.font = '15px Arial';
        context.fillStyle = 'black';
        context.fillText(`${box.detectedClass}: ${box.detectedScore}`, parseFloat(bbox[1] * width).toFixed(2), parseFloat(bbox[0] * height).toFixed(2), parseFloat(bbox[0] * height).toFixed(2));
        context.lineWidth = 2;
        context.strokeRect(parseFloat(bbox[1] * width).toFixed(2), parseFloat(bbox[0] * height).toFixed(2), parseFloat(width * (bbox[3] - bbox[1])).toFixed(2), parseFloat(height * (bbox[2] - bbox[0])).toFixed(2));      
      })
      let objStr = 'Objects detected: ';
      Object.keys(objDetected).map((key) => {
        objStr += `${key}=${objDetected[key]} `
      })
      output.innerHTML = objStr;
    });
    img.src = `/static/input/image-old.png?${new Date().getTime()}`;
  }  
}