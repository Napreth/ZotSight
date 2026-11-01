const names=new Intl.DisplayNames(['zh-CN'],{type:'language',fallback:'none'});
export function speechLanguageName(language:string,nativeName?:string):string{
  if(nativeName?.trim())return nativeName;
  try{return names.of(language.replaceAll('_','-'))||'其他语言';}catch{return '其他语言';}
}
