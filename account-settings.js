/* YAPPER account settings and local app preferences. */
(()=>{
 const $=id=>document.getElementById(id);
 const open=$("open-account-settings"),dialog=$("account-settings-modal");
 if(!open||!dialog)return;
 const status=$("account-settings-status");
 const PREF_KEY="yapper-app-preferences-v1";
 const defaults={theme:"dark",compact:false,hideMembers:false,reducedMotion:false,fontSize:13};
 const say=(message,bad=false)=>{status.textContent=message;status.classList.toggle("error",bad)};
 function readPrefs(){
  try{return {...defaults,...JSON.parse(localStorage.getItem(PREF_KEY)||"{}")}}
  catch{return {...defaults}}
 }
 function applyPrefs(p=readPrefs()){
  document.documentElement.dataset.theme=p.theme;
  document.documentElement.classList.toggle("yapper-compact",!!p.compact);
  document.documentElement.classList.toggle("yapper-hide-members",!!p.hideMembers);
  document.documentElement.classList.toggle("yapper-reduced-motion",!!p.reducedMotion);
  document.documentElement.style.setProperty("--yapper-message-size",(Number(p.fontSize)||13)+"px");
 }
 function savePrefs(){
  const p={
   theme:$("setting-theme").value,
   compact:$("setting-compact").checked,
   hideMembers:$("setting-hide-members").checked,
   reducedMotion:$("setting-reduced-motion").checked,
   fontSize:Number($("setting-font-size").value)
  };
  try{localStorage.setItem(PREF_KEY,JSON.stringify(p));applyPrefs(p);$("setting-font-value").textContent=p.fontSize+"px";say("App preferences saved on this device.");}
  catch{say("Could not save preferences in this browser.",true)}
 }
 function loadPrefs(){
  const p=readPrefs();
  $("setting-theme").value=p.theme;
  $("setting-compact").checked=!!p.compact;
  $("setting-hide-members").checked=!!p.hideMembers;
  $("setting-reduced-motion").checked=!!p.reducedMotion;
  $("setting-font-size").value=p.fontSize;
  $("setting-font-value").textContent=p.fontSize+"px";
  applyPrefs(p);
 }
 function fill(){
  if(typeof S==="undefined"||!S.user)return;
  $("account-current-email").textContent=S.user.email||"No email on file";
  $("account-user-id").textContent=S.user.id;
  $("account-new-email").value="";
  $("account-password").value="";
  $("account-password-confirm").value="";
  loadPrefs();
  say("");
 }
 open.addEventListener("click",()=>{fill();dialog.showModal()});
 $("account-settings-close").addEventListener("click",()=>dialog.close());
 ["setting-theme","setting-compact","setting-hide-members","setting-reduced-motion","setting-font-size"].forEach(id=>{
  $(id).addEventListener("input",savePrefs);
  $(id).addEventListener("change",savePrefs);
 });
 $("account-reset-preferences").addEventListener("click",()=>{
  try{localStorage.removeItem(PREF_KEY)}catch{}
  loadPrefs();say("App preferences reset.");
 });
 $("account-email-form").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("account-email-save"),email=$("account-new-email").value.trim();
  if(!email.includes("@"))return say("Enter a valid email address.",true);
  button.disabled=true;
  try{
   const {error}=await S.db.auth.updateUser({email});
   if(error)throw error;
   say("Email change requested. Check the new email inbox for a confirmation link.");
   $("account-current-email").textContent=S.user.email||"Confirmation pending";
   $("account-new-email").value="";
  }catch(error){say(error.message||String(error),true)}
  finally{button.disabled=false}
 });
 $("account-password-form").addEventListener("submit",async e=>{
  e.preventDefault();const button=$("account-password-save"),password=$("account-password").value,confirm=$("account-password-confirm").value;
  if(password.length<8)return say("Use at least 8 characters for your new password.",true);
  if(password!==confirm)return say("The passwords do not match.",true);
  button.disabled=true;
  try{
   const {error}=await S.db.auth.updateUser({password});
   if(error)throw error;
   $("account-password").value="";$("account-password-confirm").value="";
   say("Password updated successfully.");
  }catch(error){say(error.message||String(error),true)}
  finally{button.disabled=false}
 });
 $("account-copy-id").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(S.user.id);say("Account ID copied.");}
  catch{say("Clipboard access is unavailable in this browser.",true)}
 });
 $("account-signout").addEventListener("click",async()=>{
  if(!confirm("Sign out of YAPPER on this device?"))return;
  const {error}=await S.db.auth.signOut();
  if(error)say(error.message,true);else{dialog.close();if(typeof showAuth==="function")showAuth()}
 });
 applyPrefs();
 S.db.auth.onAuthStateChange((event,session)=>{if(session?.user&&dialog.open)fill()});
})();
