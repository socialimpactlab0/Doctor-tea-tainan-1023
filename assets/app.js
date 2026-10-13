(function(){
"use strict";
const cfg=window.TEA_EVENT_CONFIG||{}, url=String(cfg.GAS_WEB_APP_URL||"").trim();
const loading=document.getElementById("loadingState"),fallback=document.getElementById("formFallback"),
  fallbackText=document.getElementById("fallbackReason"),form=document.getElementById("registrationForm"),
  fields=document.getElementById("formFields"),success=document.getElementById("successState"),
  status=document.getElementById("formStatus"),send=document.getElementById("submitButton"),
  oldLink=document.getElementById("oldRegistrationLink");
if(!form)return;
const key="1023-github-v1-";
function uuid(){return crypto?.randomUUID?.()||"v-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}
function store(storage,k){try{let v=storage.getItem(key+k);if(!v){v=uuid();storage.setItem(key+k,v)}return v}catch(e){return uuid()}}
const visitor=store(localStorage,"visitor"),session=store(sessionStorage,"session");
const p=new URLSearchParams(location.search);
let stored={};try{stored=JSON.parse(localStorage.getItem(key+"attribution")||"{}")}catch(e){}
const trackKeys=["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid"];
for(const k of trackKeys){if(p.has(k))stored[k]=(p.get(k)||"").slice(0,250)}
try{localStorage.setItem(key+"attribution",JSON.stringify(stored))}catch(e){}
const tracking=()=>({visitor_id:visitor,session_id:session,page_url:location.href.slice(0,1000),referrer:document.referrer.slice(0,1000),device:/Mobi|Android|iPhone/i.test(navigator.userAgent)?"mobile":"desktop",...stored});
function pixel(name,extra){try{if(typeof fbq==="function")fbq("track",name,extra||{})}catch(e){}}
(function initPixel(){const id=String(cfg.META_PIXEL_ID||"");if(!/^\d{5,25}$/.test(id))return;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
fbq("init",id);fbq("track","PageView");})();
function post(kind,payload){return fetch(url,{method:"POST",mode:"no-cors",redirect:"follow",body:new URLSearchParams({requestType:kind,payload:JSON.stringify(payload)})});}
function track(name){if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url))return;post("track_event",{...tracking(),event_name:name}).catch(()=>{});}
function jsonp(action,data,timeout=10000){
 return new Promise((resolve,reject)=>{
  const callback="__tea1023_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2);
  const script=document.createElement("script");let done=false;
  const finish=(err,res)=>{if(done)return;done=true;clearTimeout(timer);script.remove();try{delete window[callback]}catch(e){};err?reject(err):resolve(res)};
  const timer=setTimeout(()=>finish(Error("連線逾時")),timeout);
  window[callback]=payload=>finish(null,payload);
  script.onerror=()=>finish(Error("連線失敗"));
  const qs=new URLSearchParams({requestType:action,callback,...data,_:String(Date.now())});
  script.src=url+"?"+qs.toString();document.head.appendChild(script);
 });
}
function setError(msg){status.textContent=msg;status.scrollIntoView({behavior:"smooth",block:"center"})}
function showFallback(msg){loading.hidden=true;form.hidden=true;fallback.hidden=false;fallbackText.textContent=msg||"目前改用原報名網頁。"; oldLink.href=String(cfg.ORIGINAL_REGISTRATION_URL||url)}
document.querySelectorAll('a[href="#registration"]').forEach(a=>a.addEventListener("click",()=>track("registration_click")));
track("page_view");
let schema=null,lead=false;
function node(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x}
function startForm(){if(lead)return;lead=true;track("form_start");pixel("Lead",{content_name:"2026-10-23-tea"})}
function render(items){
 loading.hidden=true;form.hidden=false;fields.replaceChildren();
 for(const item of items){
 if(item.type==="SECTION_HEADER"){fields.appendChild(node("h4","",item.title));continue}
 const wrap=node("div","form-field"),label=node("label","form-label",item.title),required=item.required;
 if(required)label.appendChild(node("span","required"," *"));
 let ctl;
 if(["TEXT","PARAGRAPH_TEXT","DATE","TIME"].includes(item.type)){
 ctl=node(item.type==="PARAGRAPH_TEXT"?"textarea":"input");
 if(item.type!=="PARAGRAPH_TEXT")ctl.type=item.type==="DATE"?"date":item.type==="TIME"?"time":(/手機|電話/.test(item.title)?"tel":"text");
 ctl.name=item.id;ctl.id="f"+item.id;ctl.required=!!required;label.htmlFor=ctl.id;
 if(/手機|電話/.test(item.title)){ctl.inputMode="tel";ctl.autocomplete="tel";ctl.placeholder="例如：0912-345-678"}
 if(/姓名/.test(item.title))ctl.autocomplete="name";
 }else if(item.type==="LIST"||item.type==="SCALE"){
 ctl=node("select");ctl.name=item.id;ctl.id="f"+item.id;ctl.required=!!required;label.htmlFor=ctl.id;
 const first=node("option","","請選擇");first.value="";ctl.appendChild(first);
 const choices=item.type==="LIST"?item.choices:Array.from({length:item.high-item.low+1},(_,i)=>String(i+item.low));
 for(const choice of choices){const opt=node("option","",choice);opt.value=choice;ctl.appendChild(opt)}
 }else if(item.type==="MULTIPLE_CHOICE"||item.type==="CHECKBOX"){
 ctl=node("div","choices");const type=item.type==="CHECKBOX"?"checkbox":"radio";
 for(const val of item.choices){const itemLabel=node("label","choice");const input=node("input");input.type=type;input.name=item.id;input.value=val;itemLabel.append(input,node("span","",val));ctl.appendChild(itemLabel)}
 }else continue;
 wrap.appendChild(label);if(item.help)wrap.appendChild(node("div","helper",item.help));wrap.appendChild(ctl);fields.appendChild(wrap);
 }
 form.addEventListener("input",startForm,{once:true});form.addEventListener("change",startForm,{once:true});
}
function getAnswers(){
 const answers={};
 for(const item of schema.items){
 if(item.type==="SECTION_HEADER")continue;
 const controls=[...form.querySelectorAll('[name="'+item.id+'"]')];
 let value=item.type==="CHECKBOX"?controls.filter(x=>x.checked).map(x=>x.value):
  item.type==="MULTIPLE_CHOICE"?(controls.find(x=>x.checked)?.value||""):(controls[0]?.value||"");
 if(typeof value==="string")value=value.trim();
 if(item.required && (Array.isArray(value)?!value.length:!value))throw Error("請填寫「"+item.title+"」");
 answers[item.id]=value;
 }
 return answers;
}
async function checkSuccess(id){
 for(const delay of [1200,1800,2500,4000,5500,7000]){
  await new Promise(r=>setTimeout(r,delay));
  try{const result=await jsonp("check_registration",{requestId:id},8000);if(result&&result.found)return true}catch(e){}
 }
 return false;
}
form.addEventListener("submit",async e=>{
 e.preventDefault();status.textContent="";
 if(!schema)return;
 if(!form.reportValidity()){setError("請確認必填欄位和個資使用同意。");return}
 let answers;try{answers=getAnswers()}catch(e){setError(e.message);return}
 const signature=JSON.stringify(answers),pendingKey=key+"pending";
 let pending={};try{pending=JSON.parse(sessionStorage.getItem(pendingKey)||"{}")}catch(e){}
 const rid=pending.signature===signature&&pending.id?pending.id:uuid();
 try{sessionStorage.setItem(pendingKey,JSON.stringify({id:rid,signature}))}catch(e){}
 send.disabled=true;send.textContent="正在確認資料是否送達，請稍候…";
 try{
  await post("registration",{requestId:rid,answers,tracking:tracking()});
  if(!(await checkSuccess(rid)))throw Error("已送出資料，但目前無法確認結果。請先不要重複報名，請聯絡郭小姐 0953-056201 查詢。");
  try{sessionStorage.removeItem(pendingKey)}catch(e){}
  pixel("CompleteRegistration",{content_name:"2026-10-23-tea",event_id:rid});
  form.hidden=true;success.hidden=false;success.scrollIntoView({behavior:"smooth",block:"center"});
 }catch(e){setError(e.message||"無法確認報名結果，請先聯絡主辦單位。")}
 finally{send.disabled=false;send.textContent="確認報名 →"}
});
if(!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)){showFallback("報名系統設定尚未完成。");return}
jsonp("schema",{},12000).then(data=>{
 if(!data||!data.supported||!Array.isArray(data.items))throw Error(data?.reason||"新的報名表尚未完成啟用");
 schema=data;render(data.items);
}).catch(err=>showFallback("目前仍使用原本報名網頁："+err.message));
})();