import { Component, ViewChild, ElementRef, OnInit, AfterViewInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', {static: false, read: ElementRef})
  canvas: ElementRef;

  ctx: CanvasRenderingContext2D;
  title = 'web-ui';
  prevJson!: any;
  timer!: number;
  intervalMS = 5000;
  selectedFile: any = {};
  uploaded = '';

  constructor(private http: HttpClient) {

  }
  ngOnInit(): void {

  }
  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    this.drawImage();
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
      console.log(data)
      this.prevJson = data;
    });
    // fetch(file).then(async (res) => {
    //   let json = await res.json();
    //   if(JSON.stringify(json) !== JSON.stringify(this.prevJson)) {
    //     this.prevJson = json;
    //     this.drawBBox();
    //     console.log(this.prevJson)
    //   }
    // })
  }
  drawImage() {
    let img = new Image();
    img.addEventListener('load', () => {
      let canvas = this.ctx.canvas;
      const { naturalWidth: width, naturalHeight: height } = img;
      console.log('loaded', width, height)
      canvas.width = width;
      canvas.height = height;
      this.ctx.drawImage(img, 0, 0, width, height);
    });
    img.src = `/static/images/image-old.png?${new Date().getTime()}`;
  }
  toggleCamera() {

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
        this.loadJson('/static/js/image.json');
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
  drawBBox() {
    console.log('choose a file')
  }
  chooseFile() {
    console.log('choose a file')
  }
}
