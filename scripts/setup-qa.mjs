import { mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
const root=process.cwd();const vault=resolve('qa-vault');const profile=resolve('qa-profile');
await mkdir(`${vault}/.obsidian/plugins/zotsight`,{recursive:true});await mkdir(profile,{recursive:true});await mkdir(`${vault}/文献`,{recursive:true});
for(const file of ['main.js','manifest.json','styles.css'])await copyFile(file,`${vault}/.obsidian/plugins/zotsight/${file}`);
const installed=join(homedir(),'AppData','Roaming','obsidian');const asar=(await readdir(installed)).filter(f=>/^obsidian-.*\.asar$/.test(f)).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))[0];if(!asar)throw new Error('No installed Obsidian app archive found');
await copyFile(join(installed,asar),`${profile}/${asar}`);
await writeFile(`${profile}/obsidian.json`,JSON.stringify({vaults:{zotsightqa:{path:vault,open:true,ts:Date.now()}},lastVersion:asar.slice(9,-5)}));
await writeFile(`${vault}/.obsidian/community-plugins.json`,'["zotsight"]');
await writeFile(`${vault}/.obsidian/app.json`,JSON.stringify({safeMode:false,showUnsupportedFiles:true}));
await writeFile(`${vault}/.obsidian/appearance.json`,JSON.stringify({theme:'moonstone',accentColor:'#4b847d'}));
const objects=[];const obj=v=>{objects.push(v);return objects.length;};
obj('<< /Type /Catalog /Pages 2 0 R /Outlines 10 0 R /PageMode /UseOutlines >>');
obj('<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R] /Count 3 >>');obj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
for(let i=0;i<3;i++){
  const content=`BT /F1 10 Tf 0.25 0.45 0.42 rg 54 736 Td (ZOTSIGHT  /  READER VERIFICATION) Tj ET\nBT /F1 25 Tf 0.12 0.15 0.18 rg 54 678 Td (${['A Reading Workflow','Connected Knowledge','Notes That Stay With You'][i]}) Tj ET\nBT /F1 12 Tf 0.35 0.38 0.4 rg 54 646 Td (for connected knowledge) Tj ET\n0.8 0.85 0.84 RG 54 615 m 558 615 l S\nBT /F1 12 Tf 0.2 0.22 0.25 rg 54 574 Td (This is a local test document for ZotSight.) Tj 0 -27 Td (Select this sentence to highlight an important idea.) Tj 0 -27 Td (A literature object holds its identity, attachments and notes.) Tj 0 -27 Td (Reading and thinking can happen in the same workspace.) Tj 0 -54 Td (The PDF stays on the left. Your Markdown notes stay on the right.) Tj 0 -27 Td (Annotations travel with the seed file without modifying the PDF.) Tj 0 -54 Td (Page ${i+1} of 3) Tj ET`;
  obj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+i*2} 0 R >>`);obj(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
}
obj('<< /Type /Outlines /First 11 0 R /Last 12 0 R /Count 2 >>');obj('<< /Title (Reading workflow) /Parent 10 0 R /Next 12 0 R /Dest [4 0 R /Fit] >>');obj('<< /Title (Connected knowledge) /Parent 10 0 R /Prev 11 0 R /Dest [6 0 R /Fit] >>');
let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await writeFile(`${vault}/reader-test.pdf`,pdf);
const now=new Date().toISOString();
await writeFile(`${vault}/文献/ZotSight 阅读演示.zsseed`,JSON.stringify({schemaVersion:1,source:null,metadata:{title:'A Reading Workflow for Connected Knowledge',authors:'ZotSight · 演示文献',year:'2026',abstract:'用于验证本地 PDF 阅读、批注与 Markdown 笔记的演示文献。',doi:'',publication:'Local reader verification',url:'',tags:['演示','阅读工作流']},attachments:[{id:'demo-pdf',kind:'vault',path:'reader-test.pdf',title:'Preprint PDF'}],note:'# 从阅读，到理解\n\n把论文、重点和自己的思考放在同一个地方。\n\n## 核心想法\n\n- 文献拥有独立的 `.zsseed` 文件\n- 左侧阅读，右侧记录\n- 使用 [[知识关联]] 连接研究\n\n## 继续探索\n\n在 PDF 中选中文字，添加高亮或引用到笔记。\n',annotations:[],reader:{attachmentId:'demo-pdf',page:1,zoom:1,split:57},createdAt:now,updatedAt:now},null,2));
await writeFile(`${vault}/知识关联.md`,'# 知识关联\n\n[[文献/ZotSight 阅读演示.zsseed]]\n');
console.log(JSON.stringify({vault,profile}));
