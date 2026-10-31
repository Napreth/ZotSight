import { readFile, mkdir, writeFile, copyFile, readdir, access } from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import { zipSync } from 'fflate';
const manifest = JSON.parse(await readFile('manifest.json', 'utf8'));
const pkg=JSON.parse(await readFile('package.json','utf8')),lock=JSON.parse(await readFile('package-lock.json','utf8')),versions=JSON.parse(await readFile('versions.json','utf8'));
if(manifest.version!==pkg.version||lock.version!==pkg.version||lock.packages[''].version!==pkg.version||versions[pkg.version]!==manifest.minAppVersion)throw Error('Version metadata differs');
const files = ['main.js', 'manifest.json', 'styles.css', 'README.md', 'LICENSE', 'THIRD-PARTY-NOTICES.md', 'BUILDING.md', 'vendor/sources.json', 'vendor/runtime-sha256.json'];
async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
files.push(...(await walk('modules')).filter(p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')&&!p.split('/').pop().startsWith('test_')),...await walk('vendor/zotero-document-worker'),...await walk('licenses'));
await access('vendor/upstream-sources/document-worker/src');
await mkdir('dist/zotsight', {recursive: true});
const archive = {};
for (const file of files) {
  const data = new Uint8Array(await readFile(file));
  archive[`zotsight/${file}`] = data;
  await mkdir(dirname(`dist/zotsight/${file}`),{recursive:true});
  await copyFile(file, `dist/zotsight/${file}`);
}
await writeFile(`dist/ZotSight-${manifest.version}.zip`, zipSync(archive, {level: 6}));
const source={};
const sourceFiles=['AGENTS.md','package.json','package-lock.json','tsconfig.json','versions.json','.gitignore','manifest.json','styles.css','LICENSE','README.md','BUILDING.md','THIRD-PARTY-NOTICES.md','scripts/build.mjs','scripts/package.mjs','scripts/prepare-zotero-sources.py',...await walk('src'),...await walk('tests'),...(await walk('modules')).filter(p=>!p.includes('__pycache__')&&!p.endsWith('.pyc')),...await walk('vendor'),...await walk('licenses')];
for(const file of sourceFiles)source[`ZotSight-source/${file}`]=new Uint8Array(await readFile(file));
await writeFile(`dist/ZotSight-${manifest.version}-source.zip`,zipSync(source,{level:6}));
const checksums=[];for(const suffix of ['.zip','-source.zip']){const file=`ZotSight-${manifest.version}${suffix}`;checksums.push(`${createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex')}  ${file}`);}
await writeFile(`dist/ZotSight-${manifest.version}-SHA256.txt`,checksums.join('\n')+'\n');
console.log(`Packaged dist/ZotSight-${manifest.version}.zip`);
console.log(`Packaged dist/ZotSight-${manifest.version}-source.zip`);
