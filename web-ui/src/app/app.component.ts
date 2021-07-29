import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('canvas', {static: true})
  canvas: ElementRef<HTMLCanvasElement>;

  ctx: CanvasRenderingContext2D;
  title = 'web-ui';
  prevJson!: any;
  timer!: number;
  intervalMS = 5000;
  selectedFile: any = {};

  constructor(private http: HttpClient) {

  }
  ngOnInit(): void {
  }
  onInputChange(evt: any) {
    let files = evt.currentTarget.files;
    if(files) {
      this.selectedFile = files[0];
    }
  }
  loadJson(file: any) {
    this.http.get(file)
    .subscribe((data) => {
      console.log(data)
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
      }, (err) => console.log(err))
    }

    // let $form = document.forms.namedItem('uploadForm');
    // $form.addEventListener('submit', (evt) => {
    //   evt.preventDefault();
    //   let output = document.querySelector('div.output')
    //   const files = document.querySelector('[name=imageFile]').files;
    //   if(files[0]) {
    //     let formData = new FormData();
    //     formData.append('imageFile', files[0]);
    //     let xhr = new XMLHttpRequest();
    //     xhr.onload = function(oEvent) {
    //       if (xhr.status == 200) {
    //         output.innerHTML = "Uploaded!";
    //         this.loadJson('/static/js/image.json');
    //       } else {
    //         output.innerHTML = "Error " + xhr.status + " occurred when trying to upload your file.<br \/>";
    //       }
    //       this.resetTimer();
    //     };

    //     xhr.open("POST", "/upload");
    //     xhr.send(formData);
    //   }
    // });
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
