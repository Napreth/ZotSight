import test from 'node:test';
import assert from 'node:assert/strict';
import {translateBatch,presets,parseLLMOutput} from '../src/modules/document-translation/providers';
import {defaults,type Profile,type HttpRequest} from '../src/modules/document-translation/types';
const context={source:'en',target:'zh-CN',title:'Test',glossary:'method=方法',prompt:''};
const jsonText=JSON.stringify({translations:[{id:'0',text:'你好'}]});
const fixtures:Record<string,unknown>={
 'google-web':[[['你好','Hello']]],'edge-web':[{translations:[{text:'你好'}]}],'tencent-web':{auto_translation:['你好']},
 deepl:{translations:[{text:'你好'}]},'google-cloud':{data:{translations:[{translatedText:'你好'}]}},azure:[{translations:[{text:'你好'}]}],
 baidu:{trans_result:[{dst:'你好'}]},tencent:{Response:{TargetText:'你好'}},youdao:{errorCode:'0',translation:['你好']},libre:{translatedText:['你好']},
 openai:{choices:[{message:{content:jsonText}}]},responses:{output:[{type:'message',content:[{type:'output_text',text:jsonText}]}]},anthropic:{content:[{type:'text',text:jsonText}]},gemini:{candidates:[{content:{parts:[{text:jsonText}]}}]},ollama:{message:{content:jsonText}}
};
for(const preset of presets){test(preset.name+' uses its native request and response protocol',async()=>{
 const profile:Profile={...defaults.profiles[0],...preset,model:preset.model||'test-model',appId:'app-id',region:'test-region'};let request!:HttpRequest;
 const result=await translateBatch(profile,{key:'private-key',secret:'private-secret'},['Hello'],context,async r=>{request=r;return {status:200,json:fixtures[profile.protocol],headers:{},text:JSON.stringify(fixtures[profile.protocol])};},new AbortController().signal);
 assert.deepEqual(result,['你好']);assert.ok(!request.url.includes('private-key'));assert.ok(!request.url.includes('private-secret'));
 const body=request.body?JSON.parse(request.headers?.['Content-Type']==='application/x-www-form-urlencoded'?JSON.stringify(Object.fromEntries(new URLSearchParams(request.body))):request.body):undefined;
 if(profile.protocol==='google-web'){assert.equal(request.method,'GET');assert.equal(new URL(request.url).searchParams.get('q'),'Hello');}
 if(profile.protocol==='azure'){assert.equal(request.headers?.['Ocp-Apim-Subscription-Region'],'test-region');assert.equal(new URL(request.url).searchParams.get('to'),'zh-Hans');assert.deepEqual(body,[{Text:'Hello'}]);}
 if(profile.protocol==='deepl'){assert.equal(request.headers?.Authorization,'DeepL-Auth-Key private-key');assert.equal(body.target_lang,'ZH');}
 if(profile.protocol==='baidu'){assert.equal(body.from,'en');assert.equal(body.to,'zh');assert.equal(body.appid,'app-id');assert.equal(body.sign.length,32);}
 if(profile.protocol==='youdao'){assert.equal(body.signType,'v3');assert.equal(body.sign.length,64);assert.equal(body.to,'zh-CHS');}
 if(profile.protocol==='tencent'){assert.match(request.headers!.Authorization,/^TC3-HMAC-SHA256 Credential=private-key\/\d{4}-\d{2}-\d{2}\/tmt\/tc3_request/);assert.equal(request.headers?.['X-TC-Action'],'TextTranslate');assert.equal(body.Target,'zh');}
 if(profile.protocol==='responses'){assert.equal(body.store,false);assert.equal(body.model,'test-model');assert.ok(Array.isArray(JSON.parse(body.input)));}
 if(profile.protocol==='anthropic'){assert.equal(request.headers?.['x-api-key'],'private-key');assert.equal(request.headers?.['anthropic-version'],'2023-06-01');}
 if(profile.protocol==='gemini'){assert.equal(request.headers?.['x-goog-api-key'],'private-key');assert.ok(body.systemInstruction.parts[0].text.includes('document translator'));}
 if(profile.protocol==='ollama'){assert.equal(body.stream,false);assert.equal(body.format,'json');}
 if(profile.protocol==='openai'){assert.equal(body.messages[1].role,'user');assert.equal(JSON.parse(body.messages[1].content)[0].text,'Hello');if(new URL(profile.endpoint).hostname==='api.openai.com')assert.equal(body.max_completion_tokens,8192);else assert.equal(body.max_tokens,8192);}
});}
test('LLM result validates IDs and refuses missing items or non-JSON text',()=>{assert.deepEqual(parseLLMOutput('```json\n'+jsonText+'\n```',1),['你好']);assert.throws(()=>parseLLMOutput('{"translations":[{"id":"0","text":"A"},{"id":"0","text":"B"}]}',2));assert.throws(()=>parseLLMOutput('not JSON',1));});
