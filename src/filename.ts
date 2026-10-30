export function fitFilename(value:string,maxWidth:number,measure:(text:string)=>number):string{
  if(measure(value)<=maxWidth)return value;
  const extension=/\.[\p{L}\p{N}]{1,12}$/u.exec(value)?.[0]||'';
  const suffix=extension?`... ${extension}`:'...';
  const stem=Array.from(extension?value.slice(0,-extension.length):value);let low=0,high=stem.length;
  while(low<high){const middle=Math.ceil((low+high)/2);if(measure(stem.slice(0,middle).join('')+suffix)<=maxWidth)low=middle;else high=middle-1;}
  return stem.slice(0,low).join('')+suffix;
}
