/* YAPPER account settings, customization, accessibility and notifications. */
(()=>{
 const $=id=>document.getElementById(id);
 const open=$("open-account-settings"),dialog=$("account-settings-modal");
 if(!open||!dialog)return;

 // Turn the long settings page into a simple tabbed control panel.
 const settingsSections=[...dialog.querySelectorAll(".account-settings-section,.account-settings-danger")];
 const tabDefinitions=[
  {id:"display",label:"🎨 Display",match:["Account information","Appearance","Chat layout"]},
  {id:"alerts",label:"🔔 Notifications",match:["Notifications"]},
  {id:"access",label:"♿ Accessibility",match:["Accessibility"]},
  {id:"security",label:"🔒 Account & privacy",match:["Privacy & session","Change email","Change password","Session"]}
 ];
 const tabbar=document.createElement("nav");
 tabbar.className="settings-tabs";tabbar.setAttribute("aria-label","Settings sections");
 const tabContent=document.createElement("div");tabContent.className="settings-tab-content";
 const tabPanels={};
 for(const def of tabDefinitions){
  const button=document.createElement("button");button.type="button";button.textContent=def.label;
  button.dataset.settingsTab=def.id;button.setAttribute("aria-controls","settings-panel-"+def.id);
  button.addEventListener("click",()=>activateSettingsTab(def.id));
  tabbar.append(button);
  const panel=document.createElement("div");panel.className="settings-tab-panel";panel.id="settings-panel-"+def.id;
  panel.hidden=true;tabContent.append(panel);tabPanels[def.id]=panel;
 }
 function activateSettingsTab(id){
  for(const def of tabDefinitions){
   const active=def.id===id,button=tabbar.querySelector('[data-settings-tab="'+def.id+'"]');
   button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));
   tabPanels[def.id].hidden=!active;
  }
 }
 for(const section of settingsSections){
  const heading=section.querySelector("h3")?.textContent||"";
  const def=tabDefinitions.find(t=>t.match.some(m=>heading.includes(m)))||tabDefinitions[0];
  tabPanels[def.id].append(section);
 }
 const intro=document.createElement("p");intro.className="settings-hint";
 intro.textContent="Choose a section below. Changes save automatically on this device."; 
 const search=document.createElement("input");search.type="search";search.className="settings-search";
 search.placeholder="Search settings…";search.setAttribute("aria-label","Search settings");search.autocomplete="off";
 const sectionTabs=new Map();
 for(const section of settingsSections){const heading=section.querySelector("h3")?.textContent||"";const def=tabDefinitions.find(t=>t.match.some(m=>heading.includes(m)))||tabDefinitions[0];sectionTabs.set(section,def.id);}
 search.addEventListener("input",()=>{
  const query=search.value.trim().toLowerCase(),matchingTabs=new Set();let firstMatch=null;
  for(const section of settingsSections){const match=!query||section.textContent.toLowerCase().includes(query);section.hidden=!match;if(match){const tab=sectionTabs.get(section);matchingTabs.add(tab);if(!firstMatch)firstMatch=tab;}}
  for(const def of tabDefinitions){const button=tabbar.querySelector('[data-settings-tab="'+def.id+'"]');button.hidden=!!query&&!matchingTabs.has(def.id);}
  if(query&&firstMatch)activateSettingsTab(firstMatch);
  else if(!query){for(const section of settingsSections)section.hidden=false;tabbar.querySelectorAll("button").forEach(b=>b.hidden=false);activateSettingsTab("display");}
 });
 search.addEventListener("keydown",event=>{if(event.key==="Escape"){search.value="";search.dispatchEvent(new Event("input"));}});
 const settingsFooter=dialog.querySelector(".modal-actions");
 dialog.insertBefore(intro,settingsFooter);
 dialog.insertBefore(search,settingsFooter);
 dialog.insertBefore(tabbar,settingsFooter);
 dialog.insertBefore(tabContent,settingsFooter);
 dialog.insertBefore(tabbar,settingsSections[0]);
 dialog.insertBefore(tabContent,settingsSections[0]);
 activateSettingsTab("display");

 const status=$("account-settings-status");
 const PREF_KEY="yapper-app-preferences-v1";
 const defaults={
  theme:"dark",accent:"#9676ff",fontFamily:"DM Sans",fontSize:13,lineHeight:1.6,messageWidth:100,
  compact:false,compactSidebar:false,hideMembers:false,showAvatars:true,showTimestamps:true,
  showTyping:true,showGifs:true,enterSend:true,sound:false,desktopNotifications:false,
  reducedMotion:false,highContrast:false,confirmSignout:true
 };
 const $status=$("setting-notification-status");
 const say=(message,bad=false)=>{status.textContent=message;status.classList.toggle("error",bad)};
 function readPrefs(){try{return {...defaults,...JSON.parse(localStorage.getItem(PREF_KEY)||"{}")}}catch{return {...defaults}}}
 function writePrefs(p){localStorage.setItem(PREF_KEY,JSON.stringify(p))}
 function applyPrefs(p=readPrefs()){
  const root=document.documentElement;
  root.dataset.theme=p.theme;
  root.style.setProperty("--purple",p.accent);
  root.style.setProperty("--yapper-message-size",p.fontSize+"px");
  root.style.setProperty("--yapper-font-family",JSON.stringify(p.fontFamily));
  root.style.setProperty("--yapper-line-height",String(p.lineHeight));
  root.style.setProperty("--yapper-message-width",p.messageWidth+"%");
  root.classList.toggle("yapper-compact",!!p.compact);
  root.classList.toggle("yapper-compact-sidebar",!!p.compactSidebar);
  root.classList.toggle("yapper-hide-members",!!p.hideMembers);
  root.classList.toggle("yapper-hide-avatars",!p.showAvatars);
  root.classList.toggle("yapper-hide-timestamps",!p.showTimestamps);
  root.classList.toggle("yapper-hide-typing",!p.showTyping);
  root.classList.toggle("yapper-hide-gifs",!p.showGifs);
  root.classList.toggle("yapper-reduced-motion",!!p.reducedMotion);
  root.classList.toggle("yapper-high-contrast",!!p.highContrast);
 }
 function collect(){
  return {
   theme:$("setting-theme").value,accent:$("setting-accent").value,fontFamily:$("setting-font-family").value,
   fontSize:Number($("setting-font-size").value),lineHeight:Number($("setting-line-height").value)/10,
   messageWidth:Number($("setting-message-width").value),
   compact:$("setting-compact").checked,compactSidebar:$("setting-compact-sidebar").checked,
   hideMembers:$("setting-hide-members").checked,showAvatars:$("setting-show-avatars").checked,
   showTimestamps:$("setting-show-timestamps").checked,showTyping:$("setting-show-typing").checked,
   showGifs:$("setting-show-gifs").checked,enterSend:$("setting-enter-send").checked,
   sound:$("setting-sound").checked,desktopNotifications:$("setting-desktop-notifications").checked,
   reducedMotion:$("setting-reduced-motion").checked,highContrast:$("setting-high-contrast").checked,
   confirmSignout:$("setting-confirm-signout").checked
  };
 }
 function updateLabels(p){
  $("setting-font-value").textContent=p.fontSize+"px";
  $("setting-line-value").textContent=p.lineHeight.toFixed(1);
  $("setting-width-value").textContent=p.messageWidth+"%";
 }
 function savePrefs(){
  const p=collect();
  try{writePrefs(p);applyPrefs(p);updateLabels(p);say("Settings saved on this device.");}
  catch{say("Could not save settings in this browser.",true)}
 }
 function loadPrefs(){
  const p=readPrefs();
  const map={
   "setting-theme":"theme","setting-accent":"accent","setting-font-family":"fontFamily",
   "setting-font-size":"fontSize","setting-line-height":"lineHeight","setting-message-width":"messageWidth",
   "setting-compact":"compact","setting-compact-sidebar":"compactSidebar","setting-hide-members":"hideMembers",
   "setting-show-avatars":"showAvatars","setting-show-timestamps":"showTimestamps","setting-show-typing":"showTyping",
   "setting-show-gifs":"showGifs","setting-enter-send":"enterSend","setting-sound":"sound",
   "setting-desktop-notifications":"desktopNotifications","setting-reduced-motion":"reducedMotion",
   "setting-high-contrast":"highContrast","setting-confirm-signout":"confirmSignout"
  };
  for(const [id,key] of Object.entries(map)){const el=$(id);if(el){if(el.type==="checkbox")el.checked=!!p[key];else el.value=String(key==="lineHeight"?Math.round(p[key]*10):p[key]);}}
  updateLabels(p);applyPrefs(p);
  if($status)$status.textContent="Browser notification permission: "+(("Notification" in window)?Notification.permission:"not supported");
 }
 function playMessageSound(){
  try{
   const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
   const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="sine";osc.frequency.value=740;gain.gain.setValueAtTime(.045,ctx.currentTime);
   gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.16);
   osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.17);
   osc.onended=()=>ctx.close();
  }catch{}
 }
 window.yapperNotifyIncoming=(message)=>{
  const p=readPrefs();if(message?.user_id===S.user?.id)return;
  if(p.sound)playMessageSound();
  if(p.desktopNotifications&&document.hidden&&"Notification" in window&&Notification.permission==="granted"){
   const body=String(message?.content||"New message").slice(0,120);
   try{new Notification("New YAPPER message",{body,tag:"yapper-"+(message?.id||Date.now())})}catch{}
  }
 };
 $("setting-notification-permission").addEventListener("click",async()=>{
  if(!("Notification" in window)){$status.textContent="This browser does not support desktop notifications.";return}
  try{const result=await Notification.requestPermission();$status.textContent="Browser notification permission: "+result;if(result==="granted")say("Browser notifications enabled.");else say("Notifications were not enabled.",true)}
  catch(error){say(error.message||String(error),true)}
 });
 open.addEventListener("click",()=>{fill();dialog.showModal()});
 function fill(){
  if(typeof S!=="undefined"&&S.user){
   $("account-current-email").textContent=S.user.email||"No email on file";
   $("account-user-id").textContent=S.user.id;
  }
  $("account-new-email").value="";$("account-password").value="";$("account-password-confirm").value="";
  loadPrefs();say("");
 }
 $("account-settings-close").addEventListener("click",()=>dialog.close());
 const settingIds=["setting-theme","setting-accent","setting-font-family","setting-font-size","setting-line-height","setting-message-width","setting-compact","setting-compact-sidebar","setting-hide-members","setting-show-avatars","setting-show-timestamps","setting-show-typing","setting-show-gifs","setting-enter-send","setting-sound","setting-desktop-notifications","setting-reduced-motion","setting-high-contrast","setting-confirm-signout"];
 settingIds.forEach(id=>{const el=$(id);el.addEventListener("input",savePrefs);el.addEventListener("change",savePrefs)});
 $("account-reset-preferences").addEventListener("click",()=>{try{localStorage.removeItem(PREF_KEY)}catch{}loadPrefs();say("All app preferences reset.")});
 $("account-export-preferences").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(readPrefs(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="yapper-settings.json";a.click();URL.revokeObjectURL(url);say("Settings export downloaded.");
 });
 $("account-email-form").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("account-email-save"),email=$("account-new-email").value.trim();
  if(!email.includes("@"))return say("Enter a valid email address.",true);
  button.disabled=true;
  try{const {error}=await S.db.auth.updateUser({email});if(error)throw error;say("Email change requested. Check the new email inbox for a confirmation link.");$("account-new-email").value=""}
  catch(error){say(error.message||String(error),true)}finally{button.disabled=false}
 });
 $("account-password-form").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("account-password-save"),password=$("account-password").value,confirm=$("account-password-confirm").value;
  if(password.length<8)return say("Use at least 8 characters for your new password.",true);
  if(password!==confirm)return say("The passwords do not match.",true);
  button.disabled=true;
  try{const {error}=await S.db.auth.updateUser({password});if(error)throw error;$("account-password").value="";$("account-password-confirm").value="";say("Password updated successfully.")}
  catch(error){say(error.message||String(error),true)}finally{button.disabled=false}
 });
 $("account-copy-id").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(S.user.id);say("Account ID copied.")}catch{say("Clipboard access is unavailable in this browser.",true)}});
 $("account-signout").addEventListener("click",async()=>{
  if(readPrefs().confirmSignout&&!confirm("Sign out of YAPPER on this device?"))return;
  const {error}=await S.db.auth.signOut();if(error)say(error.message,true);else dialog.close();
 });
 $("message-input").addEventListener("keydown",event=>{
  if(event.key!=="Enter"||event.shiftKey)return;
  if(!readPrefs().enterSend){event.preventDefault();if(event.ctrlKey||event.metaKey) $("message-form").requestSubmit();}
 });
 applyPrefs();
 if(typeof S!=="undefined"&&S.db)S.db.auth.onAuthStateChange((event,session)=>{if(session?.user&&dialog.open)fill()});
})();
