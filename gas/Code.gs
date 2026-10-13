/**
 * 2026/10/23 神韻公益茶席講座 — 自有 Google 表單 + 報名網頁 v3.3（醫師親切邀約版＋UTM 修復）
 * 全新專案由使用者本人登入 Google 帳號，執行 setupSystem() 建立。
 * 不使用任何第三方的表單；原表單、原回覆完全不變。
 * 不要把 Google 試算表的「編輯權限」分享給報名民眾。
 */
const CONFIG = Object.freeze({
  TITLE: '2026/10/23 神韻公益茶席講座｜免費報名',
  SHEET_TITLE: '2026-10-23 神韻公益茶席｜報名管理',
  META_PIXEL_ID: '770057572700869', // 沿用本次已測試的 Meta Pixel，請勿清空。
  MAX_ATTENDEES: 2
});

/** 管理功能只允許在專案擁有者本人登入狀態操作。 */
function assertOwner_() {
  const active = Session.getActiveUser().getEmail();
  const owner = Session.getEffectiveUser().getEmail();
  if (!active || !owner || active.toLowerCase() !== owner.toLowerCase()) {
    throw new Error('本功能只能由 Apps Script 專案擁有者在編輯器中操作。');
  }
}

/** 第一次執行建立表單與管理表。重跑不會重建、不會清除報名資料。 */
function setupSystem() {
  assertOwner_();
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let form;
    if (props.getProperty('FORM_ID')) {
      form = FormApp.openById(props.getProperty('FORM_ID'));
    } else {
      form = FormApp.create(CONFIG.TITLE, true);
      props.setProperty('FORM_ID', form.getId());
      form.setDescription('10/23（五）下午 2:30～4:30｜台南永康・府城滿福婚宴會館三樓。\n活動免費，預約報名。資料僅供本次活動聯繫及報名管理。\n報名洽詢：郭小姐 0953-056201。');
      form.setCollectEmail(false).setLimitOneResponsePerUser(false)
        .setAcceptingResponses(true)
        .setConfirmationMessage('報名成功！期待 10/23 與您相見。');
      form.addTextItem().setTitle('姓名').setRequired(true);
      form.addTextItem().setTitle('聯絡手機').setHelpText('供活動聯繫使用').setRequired(true);
      form.addListItem().setTitle('參加人數').setChoiceValues(['1','2']).setRequired(true);
      form.addTextItem().setTitle('職業（選填）').setRequired(false);
      form.addParagraphTextItem().setTitle('備註（選填）').setRequired(false);
    }
    let ss;
    if (props.getProperty('SHEET_ID')) {
      ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
    } else {
      ss = SpreadsheetApp.create(CONFIG.SHEET_TITLE);
      props.setProperty('SHEET_ID', ss.getId());
    }
    ss.setSpreadsheetTimeZone('Asia/Taipei');
    initSheets_(ss);
    // Google Forms 自動在這張活頁簿建立「表單回應」工作表；不能手動修改它的欄名。
    // 初次建立表單時尚無回覆目的地，直接呼叫 getDestinationId() 會拋出例外。
    let destinationId = null;
    try {
      destinationId = form.getDestinationId();
    } catch (err) {
      // 新表單尚未連結試算表時是正常情況；其他錯誤不可靜默忽略。
      const message = String(err && err.message || err);
      if (!/no response destination/i.test(message)) throw err;
    }
    if (destinationId !== ss.getId()) {
      form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    }
    const info = {
      formEditor: form.getEditUrl(),
      googleForm: form.getPublishedUrl(),
      spreadsheet: ss.getUrl(),
      reminder: '請再把 GAS 部署為網頁應用程式並做一次測試報名。'
    };
    Logger.log('=== 建立完成，請複製下面網址 ===');
    Logger.log(JSON.stringify(info, null, 2));
    return info;
  } finally {
    lock.releaseLock();
  }
}

function initSheets_(ss) {
  const trafficHeaders = ['event_time','event_name','visitor_id','session_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid','page_url','referrer','device','record_id'];
  const registrationHeaders = ['送出時間','報名識別碼','表單回應 ID','姓名','手機','參加人數','職業（選填）','備註（選填）','visitor_id','session_id','utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
  let traffic = ss.getSheetByName('流量紀錄');
  if (!traffic) {
    const empty = ss.getSheets().find(s => s.getLastRow() === 0 && s.getLastColumn() === 0);
    traffic = empty || ss.insertSheet('流量紀錄');
    if (empty) empty.setName('流量紀錄');
  }
  let registrations = ss.getSheetByName('報名管理');
  if (!registrations) registrations = ss.insertSheet('報名管理');
  let dashboard = ss.getSheetByName('流量分析');
  if (!dashboard) dashboard = ss.insertSheet('流量分析');
  [ [traffic, trafficHeaders], [registrations, registrationHeaders] ].forEach(pair => {
    const sh = pair[0], heads = pair[1];
    if (sh.getLastRow() === 0) {
      sh.getRange(1,1,1,heads.length).setValues([heads]);
      sh.setFrozenRows(1);
      sh.getRange(1,1,1,heads.length).setBackground('#174735').setFontColor('white').setFontWeight('bold');
    }
  });
  if (!dashboard.getRange('A1').getValue()) {
    dashboard.getRange('A1').setValue('10/23 公益茶席｜報名與廣告成效');
    dashboard.getRange('A1').setFontSize(17).setFontWeight('bold').setFontColor('#174735');
    dashboard.getRange('A3:A11').setValues([
      ['Google 表單總報名筆數'],['預計參加總人數'],['已記錄網站報名筆數'],
      ['不重複進站'],['點擊報名'],['開始填表'],['完成報名'],
      ['網站報名轉換率'],['最後更新']
    ]);
    dashboard.getRange('A13:C13').setValues([['來源','進站(Session)','完成報名(Session)']]);
    dashboard.getRange('A13:C13').setBackground('#174735').setFontColor('white').setFontWeight('bold');
    dashboard.setColumnWidth(1, 230); dashboard.setColumnWidth(2, 180); dashboard.setColumnWidth(3, 205);
  }
}

function form_() {
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!id) throw new Error('管理者尚未執行 setupSystem，請先建立自己的 Google 表單。');
  return FormApp.openById(id);
}
function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('管理者尚未執行 setupSystem。');
  return SpreadsheetApp.openById(id);
}

function doGet(e) {
  // GitHub Pages 的外部讀取介面；沒有 requestType 時仍使用原本的 GAS 網頁。
  const extQuery = e && e.parameter ? e.parameter : {};
  const extAction = String(extQuery.requestType || '');
  if (extAction === 'schema' || extAction === 'check_registration') {
    const cb = String(extQuery.callback || '').slice(0, 90);
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) {
      return ContentService.createTextOutput('invalid callback').setMimeType(ContentService.MimeType.TEXT);
    }
    let output;
    try {
      if (extAction === 'schema') {
        output = getFormSchema();
      } else {
        const rid = String(extQuery.requestId || '');
        let found = false;
        if (/^[a-zA-Z0-9-]{20,100}$/.test(rid)) {
          const saved = CacheService.getScriptCache().get('reg_' + rid);
          found = !!saved;
          if (!found) {
            const sh = spreadsheet_().getSheetByName('報名管理');
            const last = sh.getLastRow();
            if (last >= 2) found = sh.getRange(2,2,last-1,1).getDisplayValues().some(row => row[0] === rid);
          }
        }
        output = { ok:true, found:found };
      }
    } catch (err) { output = {ok:false,supported:false,found:false,reason:String(err.message||err)}; }
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(output).replace(/</g, '\\u003c') + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  const tpl = HtmlService.createTemplateFromFile('Index');
  const id = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  tpl.publicFormUrl = id ? FormApp.openById(id).getPublishedUrl() : 'https://forms.google.com';
  tpl.pixelId = CONFIG.META_PIXEL_ID;

  // V3.3: 直接從正式 /exec 網址的請求取得 UTM。
  // GAS HTML 會在 script.googleusercontent.com 的 iframe 內執行，
  // 因此不能只靠瀏覽器內的 location.search 取得原始網址參數。
  const query = e && e.parameter ? e.parameter : {};
  const tracking = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(key => {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      tracking[key] = String(query[key] == null ? '' : query[key]).slice(0, 250);
    }
  });
  tpl.initialUtmJson = JSON.stringify(tracking);

  return tpl.evaluate().setTitle('10/23 神韻公益茶席講座｜免費報名')
    .addMetaTag('viewport','width=device-width, initial-scale=1.0');
}

/** 讓新網頁依照「自己」表單內的欄位動態顯示。 */
function getFormSchema() {
  const form = form_();
  if (!form.isAcceptingResponses()) return {supported:false, reason:'報名暫停受理。', items:[]};
  const supportedTypes = ['TEXT','PARAGRAPH_TEXT','MULTIPLE_CHOICE','LIST','CHECKBOX','SCALE','DATE','TIME','SECTION_HEADER'];
  const fields = [], unsupported = [];
  for (const item of form.getItems()) {
    const type = String(item.getType());
    if (supportedTypes.indexOf(type) < 0) { unsupported.push(type); continue; }
    // form.getItems() 回傳的是通用 Item；先依題型轉成實際題目類別，才能讀取 isRequired()。
    // 標題（SECTION_HEADER）不是問答題，不需填寫，也沒有 isRequired()。
    const typedItem = type === 'TEXT' ? item.asTextItem() :
      type === 'PARAGRAPH_TEXT' ? item.asParagraphTextItem() :
      type === 'MULTIPLE_CHOICE' ? item.asMultipleChoiceItem() :
      type === 'LIST' ? item.asListItem() :
      type === 'CHECKBOX' ? item.asCheckboxItem() :
      type === 'SCALE' ? item.asScaleItem() :
      type === 'DATE' ? item.asDateItem() :
      type === 'TIME' ? item.asTimeItem() : null;
    const field = {
      id: String(item.getId()), type: type, title: item.getTitle(),
      help: item.getHelpText() || '', required: typedItem ? typedItem.isRequired() : false
    };
    if (['MULTIPLE_CHOICE','LIST','CHECKBOX'].indexOf(type)>=0) {
      const q = type==='MULTIPLE_CHOICE'?item.asMultipleChoiceItem():type==='LIST'?item.asListItem():item.asCheckboxItem();
      if (typeof q.hasOtherOption === 'function' && q.hasOtherOption()) unsupported.push(type+'（其他選項）');
      field.choices = q.getChoices().map(c=>c.getValue());
      if (q.getChoices().some(c=>{try{return c.getPageNavigationType()!=null || c.getGotoPage()!=null;}catch(e){return false;}})) unsupported.push(type+'（跳題）');
    }
    if (['TEXT','PARAGRAPH_TEXT','CHECKBOX'].indexOf(type)>=0) {
      const q = type==='TEXT'?item.asTextItem():type==='PARAGRAPH_TEXT'?item.asParagraphTextItem():item.asCheckboxItem();
      if (typeof q.getValidation === 'function' && q.getValidation()!=null) unsupported.push(type+'（進階驗證）');
    }
    if (type==='SCALE') {field.low=item.asScaleItem().getLowerBound();field.high=item.asScaleItem().getUpperBound();}
    fields.push(field);
  }
  if (unsupported.length || form.collectsEmail() || form.hasLimitOneResponsePerUser()) {
    return {supported:false, reason:'你修改的表單含特殊題型或登入限制，請暫時改用 Google 表單直接報名。',items:[]};
  }
  return {supported:true, items:fields};
}

/** 記錄第一方流量。不要將姓名／手機傳到此函式。 */
function logEvent(data) {
  if (!data || ['page_view','registration_click','form_start'].indexOf(String(data.event_name)) < 0) return false;
  const session = String(data.session_id||'');
  if (!/^[a-zA-Z0-9-]{10,100}$/.test(session)) return false;
  const ss = spreadsheet_();
  return appendEvent_(ss, data);
}
function textCell_(v, max) {
  let s = String(v == null ? '' : v).slice(0,max||200);
  // 避免 UTM 外部輸入變成 Google Sheets 公式。
  if (/^[=+\-@]/.test(s)) s = "'"+s;
  return s;
}
function appendEvent_(ss,d) {
  ss.getSheetByName('流量紀錄').appendRow([
    new Date(),textCell_(d.event_name,50),textCell_(d.visitor_id,100),textCell_(d.session_id,100),
    textCell_(d.utm_source,150),textCell_(d.utm_medium,150),textCell_(d.utm_campaign,150),
    textCell_(d.utm_content,150),textCell_(d.utm_term,150),textCell_(d.fbclid,250),
    textCell_(d.page_url,1000),textCell_(d.referrer,1000),textCell_(d.device,50),textCell_(d.record_id,100)
  ]);
  return true;
}

/** 後端送出 Google 表單，真的成功才回傳 ok。 */
function submitRegistration(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('報名資料格式不正確。');
  const rid = String(payload.requestId||'');
  if (!/^[a-zA-Z0-9-]{20,100}$/.test(rid)) throw new Error('報名識別碼錯誤，請重整網頁。');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('目前報名處理較忙，請稍後再試。');
  try {
    const cache = CacheService.getScriptCache(), key='reg_'+rid;
    const saved = cache.get(key);
    if (saved) return JSON.parse(saved);
    const ss=spreadsheet_(), manage=ss.getSheetByName('報名管理');
    // 二次提交防護：即使快取過期，也檢查持久記錄。
    const last=manage.getLastRow();
    if (last>=2) {
      const keys=manage.getRange(2,2,last-1,1).getDisplayValues();
      if (keys.some(row=>row[0]===rid)) return {ok:true,message:'這筆報名已成功收到，請勿重複送出。'};
    }
    const schema = getFormSchema();
    if (!schema.supported) throw new Error(schema.reason);
    const answers=payload.answers||{}, items={}, display={};
    const form=form_(), response=form.createResponse();
    form.getItems().forEach(i=>items[String(i.getId())]=i);
    for (const field of schema.items) {
      if (field.type==='SECTION_HEADER') continue;
      const item=items[field.id];
      let value=answers[field.id];
      if (Array.isArray(value)) value=value.map(v=>String(v).trim()).filter(Boolean);
      else value=String(value==null?'':value).trim();
      const missing=Array.isArray(value)?value.length===0:!value;
      if (missing) {if(field.required)throw new Error('請填寫「'+field.title+'」。');continue;}
      let r;
      if (field.type==='TEXT') {if(value.length>500)throw new Error('文字過長。');r=item.asTextItem().createResponse(value);}
      else if (field.type==='PARAGRAPH_TEXT') {if(value.length>4000)throw new Error('備註過長。');r=item.asParagraphTextItem().createResponse(value);}
      else if (field.type==='LIST' || field.type==='MULTIPLE_CHOICE' || field.type==='CHECKBOX') {
        const vals=Array.isArray(value)?value:[value];
        if(vals.some(v=>field.choices.indexOf(v)<0))throw new Error('選項錯誤，請重新整理。');
        if (field.type==='LIST') r=item.asListItem().createResponse(vals[0]);
        else if (field.type==='MULTIPLE_CHOICE') r=item.asMultipleChoiceItem().createResponse(vals[0]);
        else r=item.asCheckboxItem().createResponse(vals);
      }
      else if (field.type==='SCALE')r=item.asScaleItem().createResponse(Number(value));
      else if (field.type==='DATE') {const t=value.split('-').map(Number);r=item.asDateItem().createResponse(new Date(t[0],t[1]-1,t[2],12));}
      else if (field.type==='TIME') {const t=value.split(':').map(Number);r=item.asTimeItem().createResponse(t[0],t[1]);}
      else throw new Error('不支援此欄位，請從 Google 表單報名。');
      display[field.title]=Array.isArray(value)?value.join('、'):value;
      response.withItemResponse(r);
    }
    const phone=String(display['聯絡手機']||'').replace(/[\s()-]/g,'');
    if (!/^09\d{8}$/.test(phone)) throw new Error('請填入正確的台灣手機號碼（09 開頭、共 10 碼）。');
    if (display['參加人數'] && !['1','2'].includes(display['參加人數'])) throw new Error('每筆報名最多 2 位。');
    const submitted=response.submit();
    const result={ok:true,responseId:submitted.getId()||'',message:'報名成功！期待 10/23 與您相見。'};
    const t=payload.tracking||{};
    // 成功後先寫入去重快取。管理表寫入失敗時也不能再重送表單，以免產生重複回覆。
    cache.put(key,JSON.stringify(result),21600);
    try {
      manage.appendRow([new Date(),rid,result.responseId,textCell_(display['姓名'],200),textCell_(phone,50),
        textCell_(display['參加人數'],20),textCell_(display['職業（選填）'],300),textCell_(display['備註（選填）'],2000),
        textCell_(t.visitor_id,100),textCell_(t.session_id,100),textCell_(t.utm_source,150),
        textCell_(t.utm_medium,150),textCell_(t.utm_campaign,150),textCell_(t.utm_content,150),
        textCell_(t.utm_term,150),textCell_(t.fbclid,250)]);
      appendEvent_(ss,Object.assign({},t,{event_name:'registration_success',record_id:rid}));
    } catch (logErr) {
      console.error('Google 表單已寫入，但管理資料附錄失敗：'+String(logErr));
    }
    return result;
  } finally {lock.releaseLock();}
}

/** 管理者手動更新統計表，無須重複建立表單。 */
function refreshDashboard() {
  assertOwner_();
  const form=form_(),ss=spreadsheet_(),dash=ss.getSheetByName('流量分析');
  const rows=ss.getSheetByName('流量紀錄').getDataRange().getValues();
  const sessions=new Map(), group={};
  for (let i=1;i<rows.length;i++) {
    const r=rows[i], sid=String(r[3]||''); if(!sid)continue;
    if(!sessions.has(sid))sessions.set(sid,{flags:new Set(),source:'direct'});
    const s=sessions.get(sid);s.flags.add(String(r[1]));
    if(r[1]==='page_view')s.source=String(r[4]||'direct');
  }
  let page=0,click=0,start=0,success=0;
  sessions.forEach(s=>{
    if(!s.flags.has('page_view'))return;
    page++;if(s.flags.has('registration_click'))click++;
    if(s.flags.has('form_start'))start++;if(s.flags.has('registration_success'))success++;
    const source=s.source||'direct';if(!group[source])group[source]={visits:0,success:0};
    group[source].visits++;if(s.flags.has('registration_success'))group[source].success++;
  });
  const manageCount=Math.max(0,ss.getSheetByName('報名管理').getLastRow()-1);
  const formResponses=form.getResponses();
  let attendees=0;
  formResponses.forEach(fr => fr.getItemResponses().forEach(ir => {
    if(ir.getItem().getTitle()==='參加人數') attendees+=Number(ir.getResponse() || 0);
  }));
  dash.getRange('B3:B11').setValues([
    [formResponses.length],[attendees],[manageCount],[page],[click],[start],[success],
    [page?success/page:0],[new Date()]
  ]);
  dash.getRange('B10').setNumberFormat('0.0%');
  dash.getRange('B11').setNumberFormat('yyyy/mm/dd hh:mm');
  if(dash.getMaxRows()>=14)dash.getRange(14,1,dash.getMaxRows()-13,3).clearContent();
  const grouped=Object.keys(group).sort().map(k=>[k,group[k].visits,group[k].success]);
  if(grouped.length)dash.getRange(14,1,grouped.length,3).setValues(grouped);
  const data={googleFormCount:formResponses.length,attendees:attendees,pageViews:page,complete:success,spreadsheet:ss.getUrl()};
  Logger.log(JSON.stringify(data));return data;
}

/** 在 Apps Script 編輯器執行取得擁有者的表單、回覆表與統計表網址。 */
function showAdminLinks() {
  assertOwner_();
  const f=form_(),ss=spreadsheet_();
  const urls={formEditor:f.getEditUrl(),googleForm:f.getPublishedUrl(),spreadsheet:ss.getUrl()};
  Logger.log(JSON.stringify(urls,null,2));return urls;
}

/** 程式更新後先執行本函式，只讀取欄位、不送出報名、不建立新表單。 */
function checkFormSchema() {
  const schema = getFormSchema();
  Logger.log(JSON.stringify(schema, null, 2));
  if (!schema.supported) throw new Error(schema.reason || '此表單暫不支援嵌入式報名。');
  if (!schema.items.length) throw new Error('讀不到 Google 表單欄位。');
  Logger.log('欄位讀取成功：' + schema.items.length + ' 個。');
  return schema;
}

/**
 * GitHub Pages 的外部寫入端點：使用 form-urlencoded POST（不開放 GET 寫入）。
 * 由 GitHub 前端透過 no-cors 送出，再以隨機報名識別碼 JSONP 查詢結果。
 * 不傳送姓名或電話至追蹤事件，原 Google 表單及資料仍全部留在既有專案。
 */
function doPost(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = String(p.requestType || '');
    if (action !== 'track_event' && action !== 'registration') {
      return ContentService.createTextOutput(JSON.stringify({ok:false,message:'不支援的請求'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const raw = String(p.payload || '');
    if (raw.length > 12000) throw new Error('資料長度超過限制');
    const payload = JSON.parse(raw);
    let result;
    if (action === 'track_event') {
      const allow = ['page_view','registration_click','form_start'];
      if (allow.indexOf(String(payload.event_name)) < 0) throw new Error('事件名稱不正確');
      result = {ok:logEvent(payload)};
    } else {
      if (!payload || !payload.answers || !payload.tracking) throw new Error('報名格式不正確');
      result = submitRegistration(payload);
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('外部送出失敗：' + err);
    return ContentService.createTextOutput(JSON.stringify({ok:false,message:String(err.message||err)}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

