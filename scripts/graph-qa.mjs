import {chromium} from 'playwright';
import {copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
for(const f of ['main.js','styles.css','manifest.json'])await copyFile(f,`qa-vault/.obsidian/plugins/zotsight/${f}`);
const b=await chromium.connectOverCDP('http://127.0.0.1:9223');const p=b.contexts()[0].pages()[0];const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.reload();await p.waitForFunction(()=>window.app?.workspace?.layoutReady&&app.plugins.plugins.zotsight);
await p.evaluate(async()=>{
  if(app.vault.adapter.getBasePath().toLowerCase()!=='d:\\projects\\zotsight\\qa-vault')throw Error('Not the QA vault');
  const plugin=app.plugins.plugins.zotsight;await plugin.ensureFolder('Link validation');
  for(const name of ['A','B']){const renamed=app.vault.getFileByPath(`Link validation/${name} Renamed.zsseed`);if(renamed&&!app.vault.getFileByPath(`Link validation/${name}.zsseed`))await app.fileManager.renameFile(renamed,`Link validation/${name}.zsseed`);}
  const base=JSON.parse(await app.vault.read(app.vault.getFiles().find(f=>f.extension==='zsseed')));base.attachments=[];base.annotations=[];base.source=null;
  for(const [name,note] of [['A','[[B.zsseed|Paper B]]\n[Reference](Reference.md#section)\n[[Missing.zsseed]]\n`[[Ignored.zsseed]]`'],['B','']]){const path=`Link validation/${name}.zsseed`;const data=JSON.stringify({...base,note,metadata:{...base.metadata,title:name}});const file=app.vault.getFileByPath(path);if(file)await app.vault.modify(file,data);else await app.vault.create(path,data);}
  const path='Link validation/Reference.md',data='---\npapers:\n - "[[A.zsseed]]"\n---\n\n# section\n\nResearch note';const f=app.vault.getFileByPath(path);if(f)await app.vault.modify(f,data);else await app.vault.create(path,data);
  await app.internalPlugins.plugins.graph.enable();const leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'graph',active:true});
  window.testGraph=leaf.view;testGraph.dataEngine.setOptions({showAttachments:false,showOrphans:true,hideUnresolved:false});app.workspace.setActiveLeaf(testGraph.leaf,{focus:true});
});
await p.waitForFunction(()=>app.metadataCache.resolvedLinks['Link validation/A.zsseed']?.['Link validation/B.zsseed']===1&&app.metadataCache.resolvedLinks['Link validation/A.zsseed']?.['Link validation/Reference.md']===1);
await p.waitForFunction(()=>testGraph.renderer.nodeLookup['Link validation/A.zsseed']&&testGraph.renderer.nodeLookup['Link validation/B.zsseed']);
await p.waitForFunction(()=>testGraph.renderer.links.some(l=>l.source.id==='Link validation/Reference.md'&&l.target.id==='Link validation/A.zsseed'));
const inspect=()=>p.evaluate(()=>({links:app.metadataCache.resolvedLinks['Link validation/A.zsseed'],unresolved:app.metadataCache.unresolvedLinks['Link validation/A.zsseed'],nodes:testGraph.renderer.nodes.filter(n=>n.id.startsWith('Link validation/')).map(n=>({id:n.id,type:n.type})),edges:testGraph.renderer.links.filter(l=>l.source.id.startsWith('Link validation/')).map(l=>[l.source.id,l.target.id]),opts:testGraph.dataEngine.options.showAttachments}));
const initial=await inspect();assert.equal(initial.opts,false);assert.equal(initial.links['Link validation/Reference.md'],1);assert.equal(initial.unresolved['Ignored.zsseed'],undefined);assert.ok(initial.nodes.some(n=>n.id.endsWith('/A.zsseed')&&n.type===''));assert.ok(initial.edges.some(([s,t])=>s.endsWith('/Reference.md')&&t.endsWith('/A.zsseed')));assert.ok(initial.edges.some(([s,t])=>s.endsWith('/A.zsseed')&&t.endsWith('/B.zsseed')));console.log('NATIVE_GRAPH_SEEDS_AND_EDGES',JSON.stringify(initial));
await p.evaluate(async()=>{const a=app.vault.getFileByPath('Link validation/A.zsseed');await app.workspace.getLeaf('tab').openFile(a);await app.fileManager.renameFile(app.vault.getFileByPath('Link validation/B.zsseed'),'Link validation/B Renamed.zsseed');});
await p.waitForFunction(()=>app.metadataCache.resolvedLinks['Link validation/A.zsseed']?.['Link validation/B Renamed.zsseed']===1);
assert.match(await p.evaluate(async()=>JSON.parse(await app.vault.read(app.vault.getFileByPath('Link validation/A.zsseed'))).note),/\[\[B Renamed.zsseed\|Paper B\]\]/);console.log('NATIVE_RENAME_UPDATES_EMBEDDED_NOTE');
await p.evaluate(async()=>{const v=app.plugins.plugins.zotsight.activeView();v.setNote(v.editor.getValue()+'\n[[Reference#section]]');await v.save();await app.fileManager.renameFile(app.vault.getFileByPath('Link validation/A.zsseed'),'Link validation/A Renamed.zsseed');});
await p.waitForFunction(()=>app.metadataCache.resolvedLinks['Link validation/A Renamed.zsseed']?.['Link validation/Reference.md']===2);
assert.equal(await p.evaluate(()=>app.metadataCache.resolvedLinks['Link validation/A.zsseed']),undefined);
assert.match(await p.evaluate(async()=>app.vault.read(app.vault.getFileByPath('Link validation/Reference.md'))),/A Renamed.zsseed/);console.log('SOURCE_RENAME_AND_MARKDOWN_PROPERTY_REFERENCE');
await p.evaluate(async()=>{const leaf=app.workspace.getLeaf('tab');await leaf.setViewState({type:'localgraph',state:{file:'Link validation/A Renamed.zsseed'},active:true});window.testLocal=leaf.view;});
await p.waitForFunction(()=>window.testLocal?.renderer?.nodeLookup?.['Link validation/B Renamed.zsseed']);console.log('NATIVE_LOCAL_GRAPH_OK');
await p.reload();await p.waitForFunction(()=>window.app?.workspace?.layoutReady&&app.plugins.plugins.zotsight&&app.metadataCache.resolvedLinks['Link validation/A Renamed.zsseed']?.['Link validation/B Renamed.zsseed']===1);console.log('RELOAD_RESTORES_RELATIONS');
await p.evaluate(async()=>{const leaf=app.workspace.getLeavesOfType('graph')[0];await leaf.loadIfDeferred();const g=leaf.view;window.testGraph=g;g.dataEngine.setOptions({showAttachments:false,showOrphans:true,hideUnresolved:false});app.workspace.setActiveLeaf(g.leaf,{focus:true});g.dataEngine.filterOptions.search.setValue('path:"Link validation"');g.dataEngine.updateSearch();});
await p.waitForFunction(()=>testGraph.renderer.nodeLookup['Link validation/A Renamed.zsseed']);await p.screenshot({path:'test-results/ZotSight-0.4-graph.png'});
assert.equal(await p.evaluate(()=>app.vault.getFiles().filter(f=>f.parent?.path==='Link validation'&&f.extension==='md').length),1);
assert.deepEqual(errors,[]);console.log('GRAPH_INTEGRATION_PASSED');await b.close();
