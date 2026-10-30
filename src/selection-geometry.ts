export type TextRect=[number,number,number,number];

export function mergeTextRects(rects:readonly number[][]):TextRect[]{
  const lines:TextRect[][]=[];
  for(const r of rects.filter(r=>r.length===4&&r.every(Number.isFinite)&&r[2]>.1&&r[3]>.5).map(r=>[...r] as TextRect).sort((a,b)=>a[1]-b[1]||a[0]-b[0])){
    const line=lines.find(line=>{const a=line[0];const overlap=Math.min(a[1]+a[3],r[1]+r[3])-Math.max(a[1],r[1]);return overlap/Math.min(a[3],r[3])>.7&&Math.abs(a[1]+a[3]/2-r[1]-r[3]/2)<Math.max(a[3],r[3])*.4;});
    if(line)line.push(r);else lines.push([r]);
  }
  return lines.flatMap(line=>{
    const out:TextRect[]=[];
    for(const r of line.sort((a,b)=>a[0]-b[0])){const last=out.at(-1);if(last&&r[0]-(last[0]+last[2])<=Math.max(2,Math.min(last[3],r[3])*.8)){const right=Math.max(last[0]+last[2],r[0]+r[2]),bottom=Math.max(last[1]+last[3],r[1]+r[3]);last[1]=Math.min(last[1],r[1]);last[2]=right-last[0];last[3]=bottom-last[1];}else out.push([...r]);}
    return out;
  });
}

export function selectedTextRects(range:Range,layer:HTMLElement,bounds:DOMRect):TextRect[]{
  const rects:TextRect[]=[];const walker=layer.ownerDocument.createTreeWalker(layer,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    if(!node.textContent?.length||!range.intersectsNode(node))continue;
    const piece=layer.ownerDocument.createRange();piece.setStart(node,node===range.startContainer?range.startOffset:0);piece.setEnd(node,node===range.endContainer?range.endOffset:node.textContent.length);
    for(const r of piece.getClientRects()){const x=Math.max(bounds.left,r.left),y=Math.max(bounds.top,r.top),right=Math.min(bounds.right,r.right),bottom=Math.min(bounds.bottom,r.bottom);if(right>x&&bottom>y)rects.push([x-bounds.left,y-bounds.top,right-x,bottom-y]);}
  }
  return mergeTextRects(rects);
}
