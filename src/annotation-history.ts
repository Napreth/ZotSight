import type {Annotation} from './model';

export class AnnotationHistory {
  private past:Annotation[][]=[];private future:Annotation[][]=[];
  private current:Annotation[]=[];private key?:string;private time=0;
  sync(value:Annotation[]):void{if(JSON.stringify(value)===JSON.stringify(this.current))return;this.current=structuredClone(value);this.past=[];this.future=[];this.key=undefined;}
  record(value:Annotation[],key?:string,now=Date.now()):void{
    if(JSON.stringify(value)===JSON.stringify(this.current))return;
    if(!key||key!==this.key||now-this.time>1000){this.past.push(this.current);if(this.past.length>100)this.past.shift();}
    this.current=structuredClone(value);this.future=[];this.key=key;this.time=now;
  }
  undo():Annotation[]|undefined{const value=this.past.pop();if(!value)return;this.future.push(this.current);this.current=value;this.key=undefined;return structuredClone(value);}
  redo():Annotation[]|undefined{const value=this.future.pop();if(!value)return;this.past.push(this.current);this.current=value;this.key=undefined;return structuredClone(value);}
}
