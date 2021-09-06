import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition, MatSnackBarConfig } from '@angular/material/snack-bar';
import {WebcamImage, WebcamInitError, WebcamUtil} from 'ngx-webcam';
import { Subject, Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from './dialog/dialog.component';

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
  scores: string[] = ['0.95', '0.90', '0.85', '0.80', '0.75', '0.70', '0.65', '0.60', '0.55', '0.50', '0.45', '0.40', '0.35', '0.30', '0.25', '0.20', '0.15', '0.10'];
  cutoff: string;
  assetTypes: string[] = ['Image', 'Video'];
  cameras: any[] = [
    {name: 'cam1'},
    {name: 'cam2'},
    {name: 'cam3'}
  ];
  selectedCam = '';
  previousSelectedCam = '';
  assetType = 'Image';
  images: any[] = [];
  platform: string = '';
  isCameraDisabled: boolean;
  isServerCameraDisabled: boolean = true;
  dialogRef: any;
  host: string;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private elementRef: ElementRef
  ){}
  ngOnInit(): void {
    this.isCameraDisabled = location.hostname.indexOf('localhost') < 0 && location.protocol !== 'https';
    this.previousSelectedCam = this.selectedCam = this.host = location.href.replace(/\/$/, "");
    this.cameras.forEach((cam:any, i:number) => {
      cam.url = i == 0 ? this.host : 'https://intrench1.fyre.ibm.com';
    })
    // WebcamUtil.getAvailableVideoInputs()
    //   .then((mediaDevices: MediaDeviceInfo[]) => {
    //     // this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
    //   });
  }
  ngAfterViewInit(): void {
    this.getMatCardSize();
    // this.ctx = this.canvas.nativeElement.getContext('2d');
    this.setInterval(this.intervalMS);
  }
  @HostListener('window:resize', ['$event'])
  onResize(event?:any) {
    this.getMatCardSize();
    this.drawComponent();
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
  onScoreChange(evt: any) {
    if(evt.isUserInput) {
      console.log(evt)
      this.http.get(`${this.host}/score?score=${evt.source.value}&assetType=${this.assetType}`)
      .subscribe((data) => {
        console.log('json', data)
      });
    }
  }
  onAssetTypeChange(evt: any) {
    if(evt.isUserInput) {
      console.log(evt)
      this.assetType = evt.source.value;
      this.loadJson(`${this.host}/static/js/${this.assetType.toLowerCase()}.json`);
      this.resetTimer();
    }
  }
  loadJson(file: any) {
    this.http.get(file)
    .subscribe((data) => {
      console.log('json', data)
      if(JSON.stringify(data) !== JSON.stringify(this.prevJson)) {
        console.log(data)
        this.prevJson = data;
        this.cutoff = ''+this.prevJson.confidentCutoff;
        this.isServerCameraDisabled = this.prevJson.cameraDisabled;
        this.drawComponent();
      }
    });
  }
  drawComponent() {
    let vobj = this.prevJson.version || undefined;
    let version = vobj ? `Model: ${vobj.name} v${vobj.version}` : 'version missing';
    this.platform = `${this.prevJson.platform} | ${version}`;
    let keys = Object.keys(this.prevJson.images);
    this.images = [];
    keys.forEach((key) => {
      this.images.push({name: key, class: key.replace(/\/|\./g, '-')});
    })
    let cnt = 0;
    while(cnt < 5 && keys.length > 0 && !document.querySelector(`.${keys[keys.length-1].replace(/\/|\./g, '-')}`)) {
      this.sleep(1000);
      cnt++;
    }
    setTimeout(() => this.preDraw(), 2000);
  }
  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  preDraw() {
    this.images.forEach((image) => this.drawImage(image));
  }
  drawImage(image: any) {
    let objDetected:any = {};
    let el = <HTMLCanvasElement> document.querySelector(`.${image.class}`);
    let ctx = el.getContext('2d');
    let canvas = ctx.canvas;
    let img = new Image();
    let currentImage = this.prevJson.images[image.name];
    image.infoText = ` | Inference time: ${parseFloat(currentImage.elapsedTime).toFixed(2)}`;

    img.addEventListener('load', () => {
      let { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      let aRatio = width/height;
      this.cameraWidth = canvas.width = this.matCardWidth;
      this.cameraHeight = canvas.height = canvas.width / aRatio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      height = canvas.height;
      width = canvas.width;
      aRatio = width/height;
      let dataSource: any[] = [];
      currentImage.bbox.forEach((box: any) => {
        let bbox = box.detectedBox;
        if(objDetected[box.detectedClass]) {
          objDetected[box.detectedClass]++;
        } else {
          objDetected[box.detectedClass] = 1;
        }
        dataSource.push({
          label: box.detectedClass,
          score: parseFloat(box.detectedScore).toFixed(2),
          min: `(${(bbox[0]/aRatio).toFixed(2)},${(bbox[1]/aRatio).toFixed(2)})`,
          max: `(${(bbox[2]/aRatio).toFixed(2)},${(bbox[3]/aRatio).toFixed(2)})`
        })

        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeStyle = 'yellow';
        ctx.fillRect(bbox[1] * (width / aRatio), bbox[0] * (height / aRatio), width / aRatio * (bbox[3] - bbox[1]),
        height / aRatio * (bbox[2] - bbox[0]));
        ctx.font = '20px Arial';
        ctx.fillStyle = 'black';
        ctx.fillText(`${box.detectedClass}: ${box.detectedScore}`, +parseFloat((bbox[1] * width).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2));
        ctx.lineWidth = 2;
        ctx.strokeRect(+parseFloat((bbox[1] * width).toString()).toFixed(2), +parseFloat((bbox[0] * height).toString()).toFixed(2), +parseFloat((width * (bbox[3] - bbox[1])).toString()).toFixed(2), +parseFloat((height * (bbox[2] - bbox[0])).toString()).toFixed(2));
      })
      image.dataSource = dataSource;
    });
    img.src = `${this.host}${image.name}?${new Date().getTime()}`;

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
    this.http.get(`${this.host}/camera?on=${state}`)
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
    const allowedFiles = [".png", ".jpg", ".gif", ".mp4", ".avi", ".webm"];
    const regex = new RegExp("([a-zA-Z0-9\s_\\.\-:])+(" + allowedFiles.join('|') + ")$");
    if(this.selectedFile && this.selectedFile.name && regex.test(this.selectedFile.name.toLowerCase())) {
      this.uploadPhoto(this.selectedFile);
    } else {
      this.showMessage('Supported files are: jpg, png, gif, mp4, avi try again.');
    }
  }
  uploadPhoto(imageFile: any) {
    clearInterval(this.timer);
    let formData = new FormData();
    formData.append('imageFile', imageFile);
    this.http.post<any>('/upload', formData)
    .subscribe((res) => {
      console.log(res)
      this.showMessage(`${imageFile.name} uploaded successfully.`)
      // this.uploaded = " - Uploaded!";
      this.resetTimer();
    }, (err) => {
      console.log(err);
      this.uploaded = " - Upload failed!";
    });

  }
  setInterval(ms: number) {
    this.timer = setInterval(async () => {
      this.loadJson(`${this.host}/static/js/${this.assetType.toLowerCase()}.json`);
    }, ms);
  }
  resetTimer() {
    clearInterval(this.timer);
    this.setInterval(this.intervalMS);
  }
  chooseFile() {
    console.log('choose a file')
  }
  openDialog(payload:any, cb:any): void {
    this.dialogRef = this.dialog.open(DialogComponent, {
      hasBackdrop: true,
      width: '300px',
      height: '200px',
      panelClass: 'custom-modalbox',
      data: payload
    });

    this.dialogRef.afterClosed().subscribe((result: any) => {
      this.dialog.closeAll();
      cb(result);
    });
  }
  jumpTo(evt: any) {
    if(evt.isUserInput) {
      console.log(evt)
      this.showDialog(evt);
    } else {
      this.previousSelectedCam = evt.source.value;
    }
  }
  showDialog(evt: any) {
    let path = evt.source.value;
    this.openDialog({title: `Specify absolute device url`, type: 'input', placeholder: 'Device url', path: path}, (resp: any) => {
      if (resp) {
        resp.path = resp.path.replace(/\/$/, "");
        console.log(resp);
        this.http.get(`${resp.path}/static/js/${this.assetType.toLowerCase()}.json`)
        .subscribe({
          next: (res) => {
            console.log(res)
          },
          error: (err) => {
            console.log(err)
            this.showMessage(`${resp.path} is not a valid url`);
            this.showDialog(evt);
          },
          complete: () => {
            this.cameras.forEach((cam) => {
              if(cam.name == evt.source._mostRecentViewValue) {
                cam.url = resp.path;
                this.host = cam.url;
                this.selectedCam = cam.url;
                this.loadJson(`${this.host}/static/js/${this.assetType.toLowerCase()}.json`);
                this.resetTimer();
              }
            })
          }
        });
      } else {
        this.selectedCam = this.previousSelectedCam;
      }
    });

  }
  ngOnDestroy() {
    delete this.dialogRef;
  }
}
