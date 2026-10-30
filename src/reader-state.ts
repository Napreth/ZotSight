export function normalizePDFText(text:string):string {
  return text.normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u00ad]/g,'').replace(/\s+/g,'').toLocaleLowerCase();
}
export function matchOffsets(text:string,query:string):number[] {
  const source=normalizePDFText(text),needle=normalizePDFText(query);if(!needle)return [];
  const positions:number[]=[];for(let start=0;start<=source.length-needle.length;){const index=source.indexOf(needle,start);if(index<0)break;positions.push(index);start=index+needle.length;}return positions;
}
export function pageAtOffset(tops:number[],scrollTop:number,height:number):number {
  if(!tops.length)return 1;const target=Math.max(0,scrollTop)+Math.max(0,height)*.2;
  let low=0,high=tops.length-1;while(low<high){const middle=Math.ceil((low+high)/2);if(tops[middle]<=target)low=middle;else high=middle-1;}return low+1;
}
