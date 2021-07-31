import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  camera: Element;

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

  constructor(private http: HttpClient) {

  }
  ngOnInit(): void {

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
        this.drawImage();
      }
    });
  }
  drawImage() {
    let objDetected:any = {};
    let vobj = this.prevJson.version;

    let img = new Image();
    img.addEventListener('load', () => {
      let canvas = this.ctx.canvas;
      let { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      let aRatio = width/height;
      canvas.width = this.matCardWidth - 2;
      canvas.height = canvas.width / aRatio;
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
  toggleCamera() {
    const state = this.camera.nativeElement.innerHTML === 'camera_alt';
    console.log('camera')
    // clearInterval(this.timer);
    // const state = e.currentTarget.defaultValue === 'Camera Off';
    // e.currentTarget.defaultValue = state ? 'Camera On' : 'Camera Off';
    // fetch(`/camera?on=${state}`)
    //   .then((res) => {
    //     ieam.resetTimer();
    //     console.log(res);
    //   });
    // state ? document.querySelector('.submit').disabled = true : document.querySelector('.submit').disabled = false

  }
  onSubmit(f: NgForm) {
    console.log(this.prevJson);
    clearInterval(this.timer);
    console.log(f);
    if(this.selectedFile.name.length > 0) {
      let formData = new FormData();
      formData.append('imageFile', this.selectedFile);
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
