// Original SVG geometry, drawn to match the reader's compact monochrome tools.
export function annotationIcon(el:HTMLElement,type:string):void{
  const ns='http://www.w3.org/2000/svg';const svg=el.ownerDocument.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
  const paths:Record<string,string[]>={highlight:['M3 3h18v18H3z','M7 18l5-12 5 12M9 13h6'],underline:['M7 17l5-12 5 12M9 12h6','M4 21h16'],note:['M3 3h18v18H9l-6-6z','M3 15h6v6'],text:['M4 4h16M12 4v17'],area:['M4 2H2v4m7-4h6m5 0h2v4M2 10v5m20-5v5M2 20v2h4m4 0h5m5 0h2v-2','M6 6h12v12H6z'],ink:['M9 3C4 3 2 8 3 12m1 5c3 5 9 6 13 2','M6 15c-2-3 3-7 5-5s-2 6-3 4 6-7 7-4','M14 18l2-5 5-7 2 2-5 7-4 3z']};
  for(const d of paths[type]||[]){const p=el.ownerDocument.createElementNS(ns,'path');p.setAttribute('d',d);svg.appendChild(p);}el.replaceChildren(svg);
}
