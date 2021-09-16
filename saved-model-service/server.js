const fileUpload = require('express-fileupload');
const express = require("express");
const path = require('path');
const $score = require('./index').$score;
const cors = require('cors');

module.exports = () => {
  const app = express();

  app.use(cors({
    origin: '*'
  }));
  app.use(fileUpload());

  app.use('/static', express.static('public'));

  app.get('/',(req,res,next) => { //here just add next parameter
    setInteractive();
    res.sendFile(
      path.resolve( __dirname, "index.html" )
    )
    // next();
  })

  app.get("/ieam", (req, res) => {
    res.json(["Rob", "Glen","Sanjeev","Joe","Jeff"]);
  });

  process.env.npm_config_cameraOn = false;
  app.get("/camera", (req, res) => {
    setInteractive();
    console.log(req.query.on)
    process.env.npm_config_cameraOn = req.query.on === 'true';
    res.send({status: true, message: `Camera ${process.env.npm_config_cameraOn ? 'On' : 'Off'}`});
  });

  app.get("/remote-cameras-on", (req, res) => {
    setInteractive();
    console.log(req.query.on)
    process.env.npm_config_remoteCamerasOn = req.query.on === 'true';
    res.send({status: true, message: `Remote Cameras ${process.env.npm_config_remoteCamerasOn ? 'On' : 'Off'}`});
  });

  app.get("/score", (req, res) => {
    setInteractive();
    $score.next({name: 'score', score: req.query.score, assetType: req.query.assetType});
    res.send({status: true, message: `Score: ${req.query.score}`});
  });

  app.post('/upload', function(req, res) {
    try {
      setInteractive();
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
      } else {
        let imageFile = req.files.imageFile;
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
          imageFile.mv(uploadPath, function(err) {
            if (err)
              return res.status(500).send(err);
      
            res.send({status: true, message: 'File uploaded!'});
          });
        } else {
          res.send({status: true, message: 'Only image and video files are accepted.'});
        }
      }  
    } catch(err) {
      res.status(500).send(err);
    }
  });

  app.get("*",  (req, res) => {
    res.sendFile(
        path.resolve( __dirname, "index.html" )
    )
  });

  setInteractive = () => {
    process.env.npm_config_lastinteractive = Date.now();
  }
  return app;
}