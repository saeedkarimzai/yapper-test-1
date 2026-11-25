/* YAPPER account settings, customization, accessibility and notifications. */
(()=>{
 const $=id=>document.getElementById(id);
 const open=$("open-account-settings"),dialog=$("account-settings-modal");
 if(!open||!dialog)return;

 // Build a Discord-inspired settings workspace with a real category sidebar.
 const settingsSections=[...dialog.querySelectorAll(".account-settings-section,.account-settings-danger")];
 const closeForm=dialog.querySelector(".close");
 const originalTitle=dialog.querySelector(":scope > h2");
 const status=$("account-settings-status");
 const settingsFooter=dialog.querySelector(".modal-actions");
 const sectionFor=section=>(section.querySelector("h3")?.textContent||"").replace(/^[^A-Za-z0-9]+/,"").trim();
 const entries=[
  {id:"account",label:"My Account",group:"USER SETTINGS",description:"Your account details, login methods and session controls.",match:["Account information","Change email","Change password","Session"]},
  {id:"profile",label:"Profile",group:"USER SETTINGS",description:"Your Echo identity, username and profile picture.",keywords:"profile profiles avatar pfp picture photo username"},
  {id:"privacy",label:"Privacy & Safety",group:"USER SETTINGS",description:"Control your privacy and account session.",match:["Privacy & session"]},
  {id:"appearance",label:"Appearance",group:"APP SETTINGS",description:"Make Echo look and feel the way you like.",match:["Appearance"]},
  {id:"chat",label:"Chat",group:"APP SETTINGS",description:"Adjust the layout and behaviour of your conversations.",match:["Chat layout"]},
  {id:"notifications",label:"Notifications",group:"APP SETTINGS",description:"Choose how Echo lets you know about new messages.",match:["Notifications"]},
  {id:"accessibility",label:"Accessibility",group:"APP SETTINGS",description:"Change motion and contrast options to make Echo easier to use.",match:["Accessibility"]}
 ];
 const views={},navButtons={},navGroups={};
 const layout=document.createElement("div");layout.className="account-settings-layout";
 const sidebar=document.createElement("aside");sidebar.className="settings-sidebar";
 const sidebarTitle=document.createElement("div");sidebarTitle.className="settings-sidebar-title";sidebarTitle.textContent="USER SETTINGS";sidebar.append(sidebarTitle);
 const search=document.createElement("input");search.type="search";search.className="settings-search";search.placeholder="Search settings";search.setAttribute("aria-label","Search settings");search.autocomplete="off";sidebar.append(search);
 const nav=document.createElement("nav");nav.className="settings-nav";nav.setAttribute("aria-label","Settings categories");sidebar.append(nav);
 const main=document.createElement("main");main.className="settings-main";
 const mainHeader=document.createElement("header");mainHeader.className="settings-main-header";
 const mainTitle=document.createElement("h2");mainTitle.className="settings-page-title";
 const mainDescription=document.createElement("p");mainDescription.className="settings-page-description";
 const topRight=document.createElement("div");topRight.className="settings-close-area";
 const closeLabel=document.createElement("span");closeLabel.textContent="ESC";
 topRight.append(closeLabel,closeForm);
 mainHeader.append(mainTitle,mainDescription,topRight);
 const scroll=document.createElement("div");scroll.className="settings-main-scroll";
 const statusArea=document.createElement("div");statusArea.className="settings-status-area";statusArea.append(status);
 const hint=document.createElement("p");hint.className="settings-hint";hint.textContent="Changes to appearance and chat preferences save automatically on this device.";
 scroll.append(statusArea);
 let activeSettingsTab="account";
 for(const entry of entries){
  if(!navGroups[entry.group]){
   const group=document.createElement("section");group.className="settings-nav-group";
   const heading=document.createElement("h3");heading.textContent=entry.group;group.append(heading);nav.append(group);navGroups[entry.group]=group;
  }
  const button=document.createElement("button");button.type="button";button.textContent=entry.label;button.dataset.settingsTab=entry.id;
  button.addEventListener("click",()=>activateSettingsTab(entry.id));
  navGroups[entry.group].append(button);navButtons[entry.id]=button;

  const panel=document.createElement("section");panel.className="settings-view";panel.hidden=true;panel.id="settings-panel-"+entry.id;
  const title=document.createElement("h3");title.textContent=entry.label;
  const description=document.createElement("p");description.className="settings-view-description";description.textContent=entry.description;
  panel.append(title,description);

  if(entry.id==="profile"){
   const card=document.createElement("section");card.className="account-settings-section settings-profile-card";
   const avatar=document.createElement("div");avatar.className="settings-profile-avatar";avatar.id="settings-profile-avatar";
   const info=document.createElement("div");info.className="settings-profile-info";
   const username=document.createElement("h4");username.id="settings-profile-username";username.textContent="Loading profile…";
   const detail=document.createElement("p");detail.id="settings-profile-detail";detail.textContent="Your picture and username appear beside your messages and in your communities.";
   const edit=document.createElement("button");edit.type="button";edit.id="account-profile-edit";edit.className="primary";edit.textContent="Edit profile";
   edit.addEventListener("click",()=>window.echoOpenProfileEditorFromSettings?.());
   info.append(username,detail,edit);card.append(avatar,info);panel.append(card);
   const note=document.createElement("p");note.className="settings-profile-note";note.textContent="Profile pictures support PNG, JPG, WEBP and GIF files up to 2 MB.";panel.append(note);
  } else {
   const selected=settingsSections.filter(section=>entry.match.some(name=>sectionFor(section).includes(name)));
   selected.forEach(section=>panel.append(section));
  }
  views[entry.id]=panel;scroll.append(panel);
 }
 const footer=document.createElement("footer");footer.className="settings-main-footer";footer.append(settingsFooter);
 main.append(mainHeader,scroll,footer);
 layout.append(sidebar,main);
 dialog.replaceChildren(layout);
 if(originalTitle)originalTitle.remove();
 function refreshSettingsProfile(profile){
  const avatar=$("settings-profile-avatar");
  const username=$("settings-profile-username");
  const detail=$("settings-profile-detail");
  if(!avatar||!username||!detail)return;
  avatar.replaceChildren();
  const name=profile?.username||"Your profile";
  if(profile?.avatar_url){
   const image=document.createElement("img");image.src=profile.avatar_url;image.alt="Your profile picture";image.loading="lazy";
   image.onerror=()=>{avatar.textContent=name.charAt(0).toUpperCase();};
   avatar.append(image);
  }else avatar.textContent=name.charAt(0).toUpperCase()||"E";
  username.textContent=profile?.username?"@"+profile.username:"Profile is still loading";
  detail.textContent=profile?.avatar_url?"Your profile picture is visible beside your messages, in member lists, friends and private messages.":"Add a profile picture so people can recognize you around Echo.";
  const edit=$("account-profile-edit");if(edit)edit.disabled=!profile;
 }
 window.echoRefreshSettingsProfile=refreshSettingsProfile;
 window.echoOpenProfileEditorFromSettings=()=>{
  if(typeof S==="undefined"||!S.profile){say("Your profile is still loading.",true);return;}
  window.echoReturnToSettingsAfterProfile=true;
  dialog.close();
  $("edit-profile").click();
 };
 window.echoReopenSettingsAfterProfile=()=>{
  fill();
  activateSettingsTab("profile");
  if(!dialog.open)dialog.showModal();
 };
 function activateSettingsTab(id){
  const entry=entries.find(item=>item.id===id);if(!entry)return;
  activeSettingsTab=id;
  for(const item of entries){
   navButtons[item.id].classList.toggle("active",item.id===id);
   navButtons[item.id].setAttribute("aria-current",item.id===id?"page":"false");
   views[item.id].hidden=item.id!==id;
  }
  mainTitle.textContent=entry.label;
  mainDescription.textContent=entry.description;
  search.placeholder="Search "+entry.label.toLowerCase()+"…";
 }
 function filterSettings(){
  const query=search.value.trim().toLowerCase();
  let first=null;
  for(const entry of entries){
   const sections=entry.match?settingsSections.filter(section=>entry.match.some(name=>sectionFor(section).includes(name))):[];
   const labelMatch=entry.label.toLowerCase().includes(query);
   const keywordMatch=String(entry.keywords||"").toLowerCase().includes(query);
   const sectionMatches=query?sections.filter(section=>section.textContent.toLowerCase().includes(query)):sections;
   const matches=!query||labelMatch||keywordMatch||sectionMatches.length>0;
   navButtons[entry.id].hidden=!matches;
   if(entry.match)sections.forEach(section=>{section.hidden=!!query&&!labelMatch&&!sectionMatches.includes(section)});
   if(matches&&!first)first=entry.id;
  }
  Object.values(navGroups).forEach(group=>{group.hidden=!Array.from(group.querySelectorAll("button")).some(button=>!button.hidden)});
  if(!query){activateSettingsTab(activeSettingsTab);return;}
  if(first){activateSettingsTab(first);return;}
  for(const entry of entries){
   navButtons[entry.id].classList.remove("active");
   navButtons[entry.id].setAttribute("aria-current","false");
   views[entry.id].hidden=true;
  }
  mainTitle.textContent="No results";
  mainDescription.textContent="No settings match “"+search.value.trim()+"”.";
 }
 search.addEventListener("input",filterSettings);
 search.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();search.value="";filterSettings();}});
 activateSettingsTab("account");

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
  // One consistent Echo logo is used for the browser tab.
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
   try{new Notification("New Echo message",{body,tag:"yapper-"+(message?.id||Date.now())})}catch{}
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
  refreshSettingsProfile(typeof S!=="undefined"?S.profile:null);
  search.value="";Object.values(navGroups).forEach(group=>group.hidden=false);activateSettingsTab("account");
  loadPrefs();say("");
 }
 $("account-settings-close").addEventListener("click",()=>dialog.close());
 const settingIds=["setting-theme","setting-accent","setting-font-family","setting-font-size","setting-line-height","setting-message-width","setting-compact","setting-compact-sidebar","setting-hide-members","setting-show-avatars","setting-show-timestamps","setting-show-typing","setting-show-gifs","setting-enter-send","setting-sound","setting-desktop-notifications","setting-reduced-motion","setting-high-contrast","setting-confirm-signout"];
 settingIds.forEach(id=>{const el=$(id);el.addEventListener("input",savePrefs);el.addEventListener("change",savePrefs)});
 $("account-reset-preferences").addEventListener("click",()=>{try{localStorage.removeItem(PREF_KEY)}catch{}loadPrefs();say("All app preferences reset.")});
 $("account-export-preferences").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(readPrefs(),null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="echo-settings.json";a.click();URL.revokeObjectURL(url);say("Settings export downloaded.");
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
  if(readPrefs().confirmSignout&&!confirm("Sign out of Echo on this device?"))return;
  const {error}=await S.db.auth.signOut();if(error)say(error.message,true);else dialog.close();
 });
 $("message-input").addEventListener("keydown",event=>{
  if(event.key!=="Enter"||event.shiftKey)return;
  if(!readPrefs().enterSend){event.preventDefault();if(event.ctrlKey||event.metaKey) $("message-form").requestSubmit();}
 });
 applyPrefs();
 if(typeof S!=="undefined"&&S.db)S.db.auth.onAuthStateChange((event,session)=>{if(session?.user&&dialog.open)fill()});
})();
