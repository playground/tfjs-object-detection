import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition, MatSnackBarConfig } from '@angular/material/snack-bar';
import {WebcamImage, WebcamInitError, WebcamUtil} from 'ngx-webcam';
import {Subject, Observable} from 'rxjs';

export interface BboxElement {
  label: string;
  score: number;
  min: string;
  max: string;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', {static: false, read: ElementRef})
  canvas: ElementRef;
  @ViewChild('mat_card_header', {static: false, read: ElementRef})
  matCard: ElementRef;
  @ViewChild('camera', {static: false, read: ElementRef})
  camera: ElementRef;
  @ViewChild('front_camera', {static: false, read: ElementRef})
  frontCamera: ElementRef;

  columns: string[] = ['label', 'score', 'min', 'max'];
  dataSource: any[] = [];
  ctx: CanvasRenderingContext2D;
  title = 'web-ui';
  prevJson!: any;
  timer!: any;
  intervalMS = 5000;
  selectedFile: any = {};
  uploaded = '';
  matCardHeight: number;
  matCardWidth: number;
  infoText: string;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  webcamImage: WebcamImage = null;
  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();
  allowCameraSwitch = true;
  deviceId: string;
  showCanvas = true;
  showWebcam = false;
  cameraHeight: number = 261;
  cameraWidth: number = 466;
  scores: string[] = ['0.95', '0.90', '0.85', '0.80', '0.75', '0.70', '0.65', '0.60'];
  cutoff: string;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ){}
  ngOnInit(): void {
    // WebcamUtil.getAvailableVideoInputs()
    //   .then((mediaDevices: MediaDeviceInfo[]) => {
    //     // this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
    //   });
  }
  ngAfterViewInit(): void {
    this.getMatCardSize();
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.setInterval(this.intervalMS);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event?:any) {
    this.getMatCardSize();
    this.drawImage();
  }
  getMatCardSize() {
    this.matCardHeight = this.matCard.nativeElement.offsetHeight;
    this.matCardWidth = this.matCard.nativeElement.offsetWidth;
  }
  showMessage(msg: string, action: string = 'OK') {
    let config = new MatSnackBarConfig();
    config.verticalPosition = this.verticalPosition;
    config.horizontalPosition = this.horizontalPosition;
    config.duration = 3000;
    this.snackBar.open(msg, action, config);
  }
  onInputChange(evt: any) {
    let files = evt.currentTarget.files;
    if(files) {
      this.selectedFile = files[0];
      this.uploaded = '';
    }
  }
  loadJson(file: any) {
    this.http.get(file)
    .subscribe((data) => {
      console.log('json', data)
      if(JSON.stringify(data) !== JSON.stringify(this.prevJson)) {
        console.log(data)
        this.prevJson = data;
        this.cutoff = this.prevJson.confidentCutoff;
        this.drawImage();
      }
    });
  }
  drawImage() {
    let objDetected:any = {};
    let vobj = this.prevJson.version || undefined;
    let version = vobj ? `Model: ${vobj.name} v${vobj.version}` : 'version missing';
    version += ` | Inference time: ${parseFloat(this.prevJson.elapsedTime).toFixed(2)}`;
    this.infoText = version;

    let img = new Image();
    img.addEventListener('load', () => {
      let canvas = this.ctx.canvas;
      let { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      let aRatio = width/height;
      this.cameraWidth = canvas.width = this.matCardWidth;
      this.cameraHeight = canvas.height = canvas.width / aRatio;
      this.ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      height = canvas.height;
      width = canvas.width;
      aRatio = width/height;
      this.dataSource = [];
      this.prevJson.bbox.forEach((box: any) => {
        let bbox = box.detectedBox;
        if(objDetected[box.detectedClass]) {
          objDetected[box.detectedClass]++;
        } else {
          objDetected[box.detectedClass] = 1;
        }
        this.dataSource.push({
          label: box.detectedClass,
          score: parseFloat(box.detectedScore).toFixed(2),
          min: `(${(bbox[0]/aRatio).toFixed(2)},${(bbox[1]/aRatio).toFixed(2)})`,
          max: `(${(bbox[2]/aRatio).toFixed(2)},${(bbox[3]/aRatio).toFixed(2)})`
        })

        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.strokeStyle = 'yellow';
        this.ctx.fillRect(bbox[1] * (width / aRatio), bbox[0] * (height / aRatio), width / aRatio * (bbox[3] - bbox[1]),
        height / aRatio * (bbox[2] - bbox[0]));
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.fillText(`${box.detectedClass}: ${box.detectedScore}`, +parseFloat((bbox[1] * width).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2));
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(+parseFloat((bbox[1] * width).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2), +parseFloat((width * (bbox[3] - bbox[1])).toString()).toFixed(2), +parseFloat((height * (bbox[2] - bbox[0])).toString()).toFixed(2));
      })
    });
    img.src = `/static/images/image-old.png?${new Date().getTime()}`;
  }
  drawBBox() {
    console.log('choose a file')

  }
  hideCamera() {
    this.frontCamera.nativeElement.innerHTML = 'camera_front';
    this.showWebcam = false;
  }
  toggleCamera(evt: Event) {
    evt.preventDefault();
    // if(this.frontCamera.nativeElement.innerHTML !== 'camera_front') {
    //   this.showMessage('Please turn of your camera before turning on server camera');
    // }
    this.hideCamera();
    const state = this.camera.nativeElement.innerHTML === 'camera_alt';
    console.log('camera')
    clearInterval(this.timer);
    this.camera.nativeElement.innerHTML = state ? 'camera' : 'camera_alt';
    this.http.get(`/camera?on=${state}`)
    .subscribe((data) => {
      this.resetTimer();
      console.log('json', data)
    });
  }
  dataURItoBlob(dataURI: any, type: string) {
    const byteString = window.atob(dataURI);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
     }
    const blob = new Blob([int8Array], { type: type });
   return blob;
  }
  handleImage(webcamImage: WebcamImage): void {
    this.webcamImage = webcamImage;
    let data = webcamImage.imageAsDataUrl.split(',');
    let dataType = data[0].split(';');
    let type = dataType[0].split(':')[1];
    const imageBlob = this.dataURItoBlob(data[1], type);
    let imageFile = new File([imageBlob], 'snapshot.jpg', {type: type});
    this.uploadPhoto(imageFile);
  }
  public triggerSnapshot(): void {
    this.trigger.next();
  }
  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }
  toggleClientCamera(evt: Event) {
    evt.preventDefault();
    if(this.camera.nativeElement.innerHTML !== 'camera_alt') {
      this.showMessage('Please turn of server camera before turning on client camera');
    }
    this.showWebcam = true;
    this.frontCamera.nativeElement.innerHTML = 'camera';
    console.log('client camera')
    this.triggerSnapshot();
  }
  showNextWebcam(directionOrDeviceId: boolean|string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }
  cameraWasSwitched(deviceId: string): void {
    console.log('active device: ' + deviceId);
    this.deviceId = deviceId;
  }
  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }
  onSubmit(f: NgForm) {
    const allowedFiles = [".png", ".jpg", ".gif"];
    const regex = new RegExp("([a-zA-Z0-9\s_\\.\-:])+(" + allowedFiles.join('|') + ")$");
    if(this.selectedFile && this.selectedFile.name && regex.test(this.selectedFile.name.toLowerCase())) {
      this.uploadPhoto(this.selectedFile);
    } else {
      this.showMessage('Supported files are: jpg, png, gif, try again.');
    }
  }
  uploadPhoto(imageFile: any) {
    clearInterval(this.timer);
    let formData = new FormData();
    formData.append('imageFile', imageFile);
    this.http.post<any>('/upload', formData)
    .subscribe((res) => {
      console.log(res)
      this.uploaded = " - Uploaded!";
      this.resetTimer();
    }, (err) => {
      console.log(err);
      this.uploaded = " - Upload failed!";
    });

  }
  setInterval(ms: number) {
    this.timer = setInterval(async () => {
      this.loadJson('/static/js/image.json');
    }, ms);
  }
  resetTimer() {
    clearInterval(this.timer);
    this.setInterval(this.intervalMS);
  }
  chooseFile() {
    console.log('choose a file')
  }
}
