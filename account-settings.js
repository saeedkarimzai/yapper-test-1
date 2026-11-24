/* YAPPER account settings: email, password, session info. */
(()=>{
 const $=id=>document.getElementById(id);
 const open=$("open-account-settings"),dialog=$("account-settings-modal");
 if(!open||!dialog)return;
 const status=$("account-settings-status");
 const say=(message,bad=false)=>{status.textContent=message;status.classList.toggle("error",bad)};
 function fill(){
  if(typeof S==="undefined"||!S.user)return;
  $("account-current-email").textContent=S.user.email||"No email on file";
  $("account-user-id").textContent=S.user.id;
  $("account-new-email").value="";
  $("account-password").value="";
  $("account-password-confirm").value="";
  say("");
 }
 open.addEventListener("click",()=>{fill();dialog.showModal()});
 $("account-settings-close").addEventListener("click",()=>dialog.close());
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
 S.db.auth.onAuthStateChange((event,session)=>{if(session?.user&&dialog.open)fill()});
})();