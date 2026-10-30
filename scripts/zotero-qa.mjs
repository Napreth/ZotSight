import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');const page=browser.contexts()[0].pages()[0];
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const result=await page.evaluate(async()=>{
  const plugin=app.plugins.plugins.zotsight;
  const items=await plugin.client.search('');
  for(const item of items){
    if(['attachment','note','annotation'].includes(item.data.itemType))continue;
    const source={provider:'zotero',libraryType:'user',libraryId:'0',itemKey:item.key};
    const children=await plugin.client.children(source);const pdf=children.find(c=>c.data.contentType==='application/pdf');
    if(!pdf)continue;
    const url=await plugin.client.attachmentURL(source,pdf.key);
    await plugin.createFromItem(item,source);
    return {key:item.key,attachmentKey:pdf.key,title:item.data.title,urlProtocol:new URL(url).protocol};
  }
  throw new Error('No PDF attachment in the first 50 items');
});
assert.equal(result.urlProtocol,'file:');console.log('REAL_ZOTERO_IMPORT',JSON.stringify(result));
await page.waitForSelector('.workspace-leaf.mod-active .zs-pdf-page canvas',{timeout:20000});await page.waitForSelector('.workspace-leaf.mod-active .zs-pdf-page .textLayer span',{timeout:20000});
console.log('REAL_ZOTERO_PDF_RENDERED',await page.locator('.workspace-leaf.mod-active .zs-page-controls').innerText());
await page.getByRole('textbox',{name:'Markdown 阅读笔记'}).fill('# 阅读笔记\n\n已从 Zotero 读取文献信息与本地 PDF。\n');
await page.waitForTimeout(2500);
const note=await page.evaluate(()=>app.plugins.plugins.zotsight.activeView().seed.note);
await page.getByRole('button',{name:'刷新 Zotero 文献信息'}).click();await page.waitForSelector('.workspace-leaf.mod-active .zs-pdf-page .textLayer span');
assert.equal(await page.getByRole('textbox',{name:'Markdown 阅读笔记'}).inputValue(),note);
console.log('REFRESH_PRESERVES_NOTES');
await page.locator('.workspace-leaf.mod-active .zs-source-select').selectOption('__info');await page.waitForSelector('.workspace-leaf.mod-active .zs-info h1');
console.log('REAL_METADATA',await page.locator('.workspace-leaf.mod-active .zs-info h1').innerText());
await page.screenshot({path:'test-results/ZotSight-zotero-info.png'});
assert.deepEqual(errors,[]);console.log('REAL_ZOTERO_SMOKE_PASSED');await browser.close();
