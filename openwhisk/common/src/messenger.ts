import { Params } from './params';

export class ResponseMessage {
  constructor (
    public body: any, 
    public headers: Object, 
    public statusCode: number = 200) {
  }
}

export class Messenger {

  constructor (private params: Params) {
  }

  send(body: any, statusCode: number = 200, headers = {'Content-Type': 'application/json'}): ResponseMessage {
    return new ResponseMessage(body, headers, statusCode);
  }

  error(msg: any, status: number = 400, headers = {'Content-Type': 'application/json'}) {
    return new ResponseMessage(msg, headers, status);
  }
}