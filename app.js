// Add your Supabase Project URL and publishable (or legacy anon) key here. Never use a service_role/secret key.
const SUPABASE_URL = "https://grtvubvopumjnflhlzrz.supabase.co";
const SUPABASE_KEY = "sb_publishable_86c_reVLgXmgR2xtG96gxw_jN3javI2";
const $=id=>document.getElementById(id);const S={db:null,user:null,servers:[],server:null,channels:[],channel:null,messages:[],sub:null,mode:"signin",dialogMode:null};
function setLiveStatus(status){const el=$("live-status");if(!el)return;const states={connecting:["◌ CONNECTING…",true],online:["● LIVE CHAT",false],offline:["● CONNECTION ISSUE",true],idle:["● NOT CONNECTED",true]};const v=states[status]||states.idle;el.textContent=v[0];el.classList.toggle("offline",v[1]);el.title=status==="online"?"Live updates connected":status==="connecting"?"Connecting to live updates":"Live updates may be unavailable"}
function toast(s){let e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.classList.remove("show"),4200)}
function err(e){return e?.message||String(e)}function initial(s){return (s||"Y").trim().charAt(0).toUpperCase()||"Y"}function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dismissPreloader(){const loader=$("echo-preloader");if(!loader||loader.classList.contains("is-hidden"))return;loader.classList.add("is-hidden");setTimeout(()=>loader.remove(),500)}
setTimeout(dismissPreloader,10000);
function showAuth(){dismissPreloader();if(S.sub)S.db.removeChannel(S.sub);S.sub=null;setLiveStatus("idle");S.user=null;$("auth").classList.remove("hidden");$("app").classList.add("hidden")}
function showApp(){dismissPreloader(); $("auth").classList.add("hidden");$("app").classList.remove("hidden");$("user-email").textContent=S.user.email||"Echo";loadServers().catch(e=>toast(err(e)));const invite=new URLSearchParams(location.search).get("invite");if(invite){openJoinServerPage();$("join-invite-input").value=invite;history.replaceState(null,"",location.pathname)}}
function setupPasswordRecovery(){
 S.db.auth.onAuthStateChange(async(event)=>{
  if(event!=="PASSWORD_RECOVERY")return;
  $("auth").classList.remove("hidden");$("app").classList.add("hidden");
  $("auth-form").classList.add("hidden");$("forgot-form").classList.add("hidden");$("confirm-panel").classList.add("hidden");$("auth-switch-row").classList.add("hidden");
  $("recovery-form").classList.remove("hidden");
  $("auth-title").textContent="Reset your password.";
  $("auth-subtitle").textContent="Create a new password for your Echo account.";
  $("auth-feedback").classList.add("hidden");
 });
 $("recovery-form").onsubmit=async event=>{
  event.preventDefault();
  const password=$("new-password").value,confirmPassword=$("new-password-confirm").value,button=$("save-new-password");
  if(password.length<6){setAuthFeedback("Use at least 6 characters.","error");return}
  if(password!==confirmPassword){setAuthFeedback("Those passwords don’t match. Try again.","error");return}
  button.disabled=true;button.textContent="Updating…";
  try{
   const {error}=await S.db.auth.updateUser({password});
   if(error)throw error;
   await S.db.auth.signOut();
   $("recovery-form").classList.add("hidden");$("auth-form").classList.remove("hidden");$("auth-switch-row").classList.remove("hidden");
   $("auth-title").textContent="Password updated.";
   $("auth-subtitle").textContent="Your password has been changed. Sign in with your new password.";
   setAuthFeedback("Password changed successfully. You can sign in now.","success");
   $("password").value="";$("new-password").value="";$("new-password-confirm").value="";
  }catch(error){setAuthFeedback(err(error),"error")}
  finally{button.disabled=false;button.textContent="Update password"}
 };
}
function setAuthFeedback(message,type="info"){
 const box=$("auth-feedback");if(!box)return;
 box.textContent=message;box.className="auth-feedback "+type;
}
function setupAuth(){
 let pendingConfirmationEmail="";
 const muted=$("auth-subtitle");
 const clearFeedback=()=>{$("auth-feedback").classList.add("hidden")};
 const setMode=()=>{
  S.mode=S.mode==="signin"?"signup":"signin";
  const signup=S.mode==="signup";
  $("auth-title").textContent=signup?"Create your Echo account.":"Welcome back.";
  muted.textContent=signup?"Join Echo with your email and a password.":"Sign in to pick up where you left off.";
  $("email").type=signup?"email":"text";
  $("email").placeholder=signup?"you@example.com":"Email or Echo username";
  $("email").autocomplete=signup?"email":"username";
  $("confirm-password-wrap").classList.toggle("hidden",!signup);
  $("confirm-password").required=signup;
  $("password").autocomplete=signup?"new-password":"current-password";
  $("auth-submit").textContent=signup?"Create account":"Sign in";
  $("switch-text").textContent=signup?"Already have an account?":"New to Echo?";
  $("switch").textContent=signup?"Sign in":"Create an account";
  $("forgot-password").classList.toggle("hidden",signup);
  $("auth-form").classList.remove("hidden");$("forgot-form").classList.add("hidden");$("confirm-panel").classList.add("hidden");
  $("auth-switch-row").classList.remove("hidden");clearFeedback();
 };
 $("switch").onclick=setMode;
 document.querySelectorAll("[data-password-toggle]").forEach(button=>button.addEventListener("click",()=>{
  const input=$(button.dataset.passwordToggle);const visible=input.type==="password";
  input.type=visible?"text":"password";button.textContent=visible?"Hide":"Show";
  button.setAttribute("aria-label",visible?"Hide password":"Show password");
 }));
 $("forgot-password").onclick=()=>{
  if(S.mode!=="signin")return;
  $("reset-email").value=$("email").value.includes("@")?$("email").value.trim():"";
  $("auth-form").classList.add("hidden");$("forgot-form").classList.remove("hidden");$("auth-switch-row").classList.add("hidden");
  $("auth-title").textContent="Reset your password.";
  muted.textContent="We’ll email you a secure link to get back into your account.";
  clearFeedback();$("reset-email").focus();
 };
 $("back-to-login").onclick=()=>{
  $("forgot-form").classList.add("hidden");$("auth-form").classList.remove("hidden");$("auth-switch-row").classList.remove("hidden");
  $("auth-title").textContent="Welcome back.";muted.textContent="Sign in to pick up where you left off.";clearFeedback();
 };
 $("forgot-form").onsubmit=async event=>{
  event.preventDefault();const email=$("reset-email").value.trim(),button=$("send-reset");
  button.disabled=true;button.textContent="Sending…";
  try{
   const {error}=await S.db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
   if(error)throw error;
   setAuthFeedback("If an account exists for that email, a password-reset link is on its way. Check your inbox and spam folder.","success");
  }catch(error){setAuthFeedback(err(error),"error")}
  finally{button.disabled=false;button.textContent="Send reset link"}
 };
 $("resend-confirmation").onclick=async()=>{
  const button=$("resend-confirmation");if(!pendingConfirmationEmail)return;
  button.disabled=true;button.textContent="Sending…";
  try{
   const {error}=await S.db.auth.resend({type:"signup",email:pendingConfirmationEmail,options:{emailRedirectTo:location.origin+location.pathname}});
   if(error)throw error;
   $("confirm-copy").textContent="A fresh confirmation link has been sent to "+pendingConfirmationEmail+". Check your inbox and spam folder.";
  }catch(error){$("confirm-copy").textContent=err(error)}
  finally{button.disabled=false;button.textContent="Resend confirmation email"}
 };
 $("confirm-back").onclick=()=>{
  $("confirm-panel").classList.add("hidden");$("auth-form").classList.remove("hidden");$("auth-switch-row").classList.remove("hidden");
  $("auth-title").textContent="Welcome back.";muted.textContent="Sign in to pick up where you left off.";
 };
 $("auth-form").onsubmit=async event=>{
  event.preventDefault();
  const login=$("email").value.trim(),password=$("password").value,signup=S.mode==="signup";
  if(signup&&password!==$("confirm-password").value){setAuthFeedback("Those passwords don’t match.","error");return}
  if(signup&&password.length<6){setAuthFeedback("Your password must be at least 6 characters.","error");return}
  const button=$("auth-submit");button.disabled=true;button.textContent=signup?"Creating account…":"Signing in…";clearFeedback();
  try{
   let result;
   if(signup){
    if(!login.includes("@"))throw new Error("Enter a valid email address to create your account.");
    result=await S.db.auth.signUp({email:login,password,options:{emailRedirectTo:location.origin+location.pathname}});
    if(result.error)throw result.error;
    if(result.data.session&&result.data.user){toast("Your Echo account is ready!");startUser(result.data.user)}
    else if(result.data.user){
     pendingConfirmationEmail=login;
     $("confirm-copy").textContent="We sent a confirmation link to "+login+". Open it to verify your email, then come back and sign in.";
     $("auth-form").classList.add("hidden");$("confirm-panel").classList.remove("hidden");$("auth-switch-row").classList.add("hidden");
     $("auth-title").textContent="One last step.";muted.textContent="Verify your email to activate your Echo account.";
     setAuthFeedback("Account created. Email confirmation is required before you can sign in.","success");
    }else throw new Error("Echo did not return an account. Check whether new sign-ups are enabled.");
   }else if(login.includes("@")){
    result=await S.db.auth.signInWithPassword({email:login,password});
    if(result.error)throw result.error;
    if(result.data.user)startUser(result.data.user);
   }else{
    const response=await fetch(SUPABASE_URL+"/functions/v1/username-login",{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY},body:JSON.stringify({username:login,password})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||"Username or password is incorrect.");
    if(!payload.access_token||!payload.refresh_token)throw new Error("Username or password is incorrect.");
    const session=await S.db.auth.setSession({access_token:payload.access_token,refresh_token:payload.refresh_token});
    if(session.error)throw session.error;
    if(session.data.user)startUser(session.data.user);
   }
  }catch(error){
   const message=err(error);
   if(/signups? not allowed|signup is disabled|new user registration is disabled/i.test(message))setAuthFeedback("New accounts are disabled right now. The Echo administrator needs to enable sign-ups in Supabase Authentication settings.","error");
   else if(/redirect.*not allowed|not whitelisted/i.test(message))setAuthFeedback("This site’s redirect URL must be added in Supabase Authentication → URL Configuration: "+location.origin+location.pathname,"error");
   else if(/invalid login credentials/i.test(message))setAuthFeedback("That email/username or password doesn’t match. Check it and try again.","error");
   else setAuthFeedback(message,"error");
  }finally{button.disabled=false;button.textContent=S.mode==="signup"?"Create account":"Sign in"}
 };
}
async function startUser(u){if(S.user?.id===u.id&&!$("app").classList.contains("hidden"))return;S.user=u;showApp()}
async function loadServers(){let {data,error}=await S.db.from("server_members").select("server_id,servers(id,name,owner_id,created_at,discoverable,description,category)").eq("user_id",S.user.id);if(error)throw error;S.servers=(data||[]).map(x=>x.servers).filter(Boolean);renderServers();if(S.servers.length){await selectServer(S.server&&S.servers.some(x=>x.id===S.server.id)?S.server.id:S.servers[0].id)}else{S.server=null;S.channels=[];S.channel=null;renderChannels();$("server-name").textContent="Pick a server";$("messages").innerHTML="";$("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="Welcome to YAPPER."; $("empty").querySelector("p").textContent="Create a server or join one to start chatting."; $("message-input").disabled=true;$("send").disabled=true;if($("emoji-toggle"))$("emoji-toggle").disabled=true}}
function renderServers(){let root=$("servers");root.innerHTML="";S.servers.forEach(s=>{let b=document.createElement("button");b.className="server-pill"+(S.server?.id===s.id?" active":"");b.textContent=initial(s.name);b.title=s.name;b.onclick=()=>selectServer(s.id).catch(e=>toast(err(e)));root.append(b)})}
async function selectServer(id){
 S.server=S.servers.find(s=>s.id===id)||null;
 S.channel=null;renderServers();applyServerPreferenceUI();
 $("server-name").textContent=S.server?.name||"Pick a server";
 if(!S.server)return;
 const subtitle=$("server-subtitle");
 if(subtitle)subtitle.textContent=currentServerPrefs(id).showServerDescriptions&&S.server.description?S.server.description:"YOUR COMMUNITY";
 let {data,error}=await S.db.from("channels").select("id,server_id,name,created_at").eq("server_id",id).order("created_at");
 if(error)throw error;
 S.channels=data||[];renderChannels();applyServerPreferenceUI();
 if(S.channels.length){
  const prefs=currentServerPrefs(id);
  let selectedChannel=null;
  if(prefs.rememberChannel){
   try{const last=localStorage.getItem("echo-last-channel:"+id);if(last&&S.channels.some(channel=>channel.id===last))selectedChannel=last;}catch{}
  }
  await selectChannel(selectedChannel||S.channels[0].id);
  if(prefs.showWelcomeTips){
   const tipKey="echo-welcome-tip-seen:"+id;
   try{if(!localStorage.getItem(tipKey)){toast("Tip: Use the + beside TEXT CHANNELS to add a channel.");localStorage.setItem(tipKey,"1");}}catch{}
  }
 }else{
  S.messages=[];renderMessages();
  $("channel-name").textContent="No channels";$("channel-desc").textContent="Create a channel to start talking.";
  $("message-input").disabled=true;$("send").disabled=true;
  $("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="No channels yet.";
  $("empty").querySelector("p").textContent="Create a text channel to start talking.";
 }
}
$("channels").addEventListener("contextmenu",event=>{
 const button=event.target.closest(".channel");
 if(!button||!S.server)return;
 event.preventDefault();
 const key="mutedChannels";
 const prefs=readServerPrefs(S.server.id);
 const muted=new Set(prefs[key]||[]);
 const id=button.dataset.channelId;
 const wasMuted=muted.has(id);
 if(wasMuted)muted.delete(id);else muted.add(id);
 prefs[key]=[...muted];
 try{localStorage.setItem(serverPrefsKey(S.server.id),JSON.stringify(prefs));renderChannels();toast(wasMuted?"Channel unmuted.":"Channel muted.")}
 catch(error){toast("Could not save channel mute: "+err(error))}
});
function renderChannels(){
 let n=$("channels");n.innerHTML="";
 const heading=$("channel-section-title");
 const prefs=currentServerPrefs(S.server?.id);
 if(heading)heading.textContent=prefs.showChannelCounts?"TEXT CHANNELS · "+S.channels.length:"TEXT CHANNELS";
 const muted=new Set(readServerPrefs(S.server?.id).mutedChannels||[]);
 S.channels.forEach(c=>{
  let b=document.createElement("button");b.className="channel"+(S.channel?.id===c.id?" active":"");
  b.dataset.channelId=c.id;
  const isMuted=muted.has(c.id);
  b.classList.toggle("muted",prefs.dimMutedChannels&&isMuted);
  b.title=isMuted?"Muted channel · right-click to unmute":"Right-click to mute or unmute";
  b.innerHTML="<span>#</span>"+esc(c.name);
  b.onclick=()=>selectChannel(c.id).catch(e=>toast(err(e)));
  n.append(b);
 });
}
let channelRequestToken=0;
async function selectChannel(id){
 const token=++channelRequestToken;
 S.channel=S.channels.find(c=>c.id===id)||null;
 renderChannels();
 if(!S.channel){setLiveStatus("idle");return}
 const channel=S.channel;
 const serverPreferences=currentServerPrefs(S.server?.id);
 $("message-input").spellcheck=serverPreferences.spellcheck!==false;
 if(serverPreferences.rememberChannel){try{localStorage.setItem("echo-last-channel:"+S.server.id,id)}catch{}}
 applyServerPreferenceUI();
 setLiveStatus("connecting");
 $("channel-name").textContent=channel.name;
 $("channel-desc").textContent="Messages in #"+channel.name;
 $("message-input").placeholder="Message #"+channel.name;
 $("message-input").disabled=false;
 $("send").disabled=false;
 if(S.sub){const previous=S.sub;S.sub=null;await S.db.removeChannel(previous)}
 if(token!==channelRequestToken||S.channel?.id!==id)return;
 let {data,error}=await S.db.from("messages").select("id,channel_id,user_id,content,created_at,edited_at").eq("channel_id",id).order("created_at").limit(150);
 if(error)throw error;
 if(token!==channelRequestToken||S.channel?.id!==id)return;
 S.messages=data||[];
 renderMessages();
 // Give every subscription attempt a unique topic. Supabase can otherwise return a
 // channel object that was already subscribed while a previous channel is being removed.
 const topic="yapper-messages-"+id+"-"+token;
 const channelSub=S.db.channel(topic)
  .on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"channel_id=eq."+id},p=>{
   if(S.channel?.id!==id)return;
   if(p.eventType==="INSERT"){
    if(!S.messages.some(m=>m.id===p.new.id)){S.messages.push(p.new);if(S.messages.length>150)S.messages.shift();renderMessages();if(typeof window.yapperNotifyIncoming==="function")window.yapperNotifyIncoming(p.new);}
   }else if(p.eventType==="UPDATE"){
    const i=S.messages.findIndex(m=>m.id===p.new.id);if(i>=0){S.messages[i]=p.new;renderMessages();}
   }else if(p.eventType==="DELETE"){
    S.messages=S.messages.filter(m=>m.id!==p.old.id);renderMessages();
   }
  })
  .subscribe(status=>{
   if(token!==channelRequestToken)return;
   if(status==="SUBSCRIBED")setLiveStatus("online");
   else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setLiveStatus("offline");
   else if(status==="CLOSED")setLiveStatus("idle")
  });
 S.sub=channelSub;
}
function renderMessages(){let root=$("messages");root.innerHTML="";$("empty").classList.toggle("hidden",!!(S.channel&&S.messages.length));if(S.channel&&!S.messages.length){$("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="Welcome to #"+S.channel.name+".";$("empty").querySelector("p").textContent="Be the first to send a message."}S.messages.forEach(m=>{let own=m.user_id===S.user?.id,name=own?(S.user.email||"You"):"Yapper "+String(m.user_id).slice(0,7),d=new Date(m.created_at),el=document.createElement("article");el.className="message";el.innerHTML='<div class="avatar">'+esc(initial(name))+'</div><div class="message-body"><div class="meta"><b>'+esc(name)+'</b><time>'+esc(d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))+'</time></div></div>';let body=el.querySelector(".message-body"),content=document.createElement("div");content.className="message-text";if(window.yapperRenderContent)window.yapperRenderContent(content,m.content,"main");else content.textContent=m.content;body.append(content);root.append(el)});root.scrollTop=root.scrollHeight}
$("message-input").addEventListener("input",()=>{
 const input=$("message-input");
 input.style.height="28px";
 input.style.height=Math.min(input.scrollHeight,150)+"px";
});
$("message-form").onsubmit=async e=>{e.preventDefault();let content=$("message-input").value.trim();if(!content||!S.channel)return;$("send").disabled=true;try{let channelId=S.channel.id;let {data:sent,error}=await S.db.from("messages").insert({channel_id:channelId,user_id:S.user.id,content}).select("id,channel_id,user_id,content,created_at,edited_at").single();if(error)throw error;if(S.channel?.id===channelId&&!S.messages.some(m=>m.id===sent.id)){S.messages.push(sent);if(S.messages.length>150)S.messages.shift();renderMessages()}$("message-input").value="";$("message-input").style.height="28px"}catch(e){toast(err(e))}finally{$("send").disabled=!S.channel;$("message-input").focus()}};
function openModal(mode){S.dialogMode=mode;let c={server:["Create a server","Give your space a name.","Server name","My server","Share the server with an invite link after creating it.","Create server"],channel:["Create a channel","Use a short channel name.","Channel name","general","Letters, numbers, hyphens and underscores work best.","Create channel"]}[mode];if(!c)return;$("modal-title").textContent=c[0];$("modal-desc").textContent=c[1];$("modal-label").textContent=c[2];$("modal-input").placeholder=c[3];$("modal-help").textContent=c[4];$("modal-submit").textContent=c[5];$("modal-input").value="";$("modal").showModal();$("modal-input").focus()}
const createServerAction=()=>openModal("server");if($("new-server"))$("new-server").onclick=createServerAction;if($("new-server-rail"))$("new-server-rail").onclick=createServerAction;if($("join"))$("join").onclick=openJoinServerPage;if($("join-rail"))$("join-rail").onclick=openJoinServerPage;$("new-channel").onclick=()=>S.server?openModal("channel"):toast("Create or select a server first.");
$("copy-id").onclick=async()=>{if(!S.server)return toast("Select a server first.");const prefs=currentServerPrefs(S.server.id);if(prefs.confirmInvites&&!confirm("Create an invite link for "+S.server.name+"?"))return;$("copy-id").disabled=true;try{const {data:code,error}=await S.db.rpc("create_server_invite",{p_server_id:S.server.id,p_expires_at:null,p_max_uses:null});if(error)throw error;const link=new URL(location.href);link.searchParams.set("invite",code);if(prefs.copyInviteAutomatically){try{await navigator.clipboard.writeText(link.href);toast("Invite link copied!")}catch{toast("Invite link: "+link.href)}}else toast("Invite link: "+link.href)}catch(e){toast(err(e))}finally{$("copy-id").disabled=false}};
$("cancel").onclick=()=>$("modal").close();$("modal-form").onsubmit=async e=>{e.preventDefault();let v=$("modal-input").value.trim(),mode=S.dialogMode;if(!v)return;$("modal-submit").disabled=true;try{if(mode==="server"){let {data:s,error}=await S.db.from("servers").insert({name:v.slice(0,60),owner_id:S.user.id}).select("id,name,owner_id,created_at,discoverable,description,category").single();if(error)throw error;let {error:me}=await S.db.from("server_members").insert({server_id:s.id,user_id:S.user.id,role:"owner"});if(me)throw me;let {error:ce}=await S.db.from("channels").insert({server_id:s.id,name:"general"});if(ce)throw ce;await loadServers();await selectServer(s.id);toast("Server created! Use Invite to share it with friends.")}else if(mode==="channel"){if(!S.server)throw Error("Select a server first.");let name=v.toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);if(!name)throw Error("Use at least one letter or number.");let {error}=await S.db.from("channels").insert({server_id:S.server.id,name});if(error)throw error;await selectServer(S.server.id);toast("Channel created.")}$("modal").close()}catch(e){toast(err(e))}finally{$("modal-submit").disabled=false}};
$("signout").onclick=async()=>{let prefs={};try{prefs=JSON.parse(localStorage.getItem("yapper-app-preferences-v1")||"{}")}catch{}if(prefs.confirmSignout!==false&&!confirm("Sign out of YAPPER on this device?"))return;let {error}=await S.db.auth.signOut();if(error)toast(err(error));showAuth()};



let joinDirectoryServers=[];
let joinDirectoryCategory="All";
let joinDirectoryLoading=false;
function joinInviteCode(value){
 const raw=String(value||"").trim();
 if(!raw)return "";
 try{
  const parsed=new URL(raw);
  const queryCode=parsed.searchParams.get("invite");
  if(queryCode)return queryCode.trim();
  const path=parsed.pathname;
  const marker="/invite/";
  const index=path.toLowerCase().lastIndexOf(marker);
  if(index>=0)return decodeURIComponent(path.slice(index+marker.length));
 }catch{}
 return raw;
}
function openJoinServerPage(){
 const page=$("join-server-page");
 if(!page)return;
 page.classList.remove("hidden");
 page.setAttribute("aria-hidden","false");
 const rememberDirectorySearch=currentServerPrefs(S.server?.id).rememberSearch;
 try{$("join-server-search").value=rememberDirectorySearch?(localStorage.getItem("echo-server-directory-search")||""):"";}
 catch{$("join-server-search").value="";}
 $("join-invite-feedback").textContent="";
 document.body.classList.add("join-page-open");
 loadJoinDirectory().catch(error=>showJoinDirectoryMessage("Could not load public communities. "+err(error),"error"));
}
function closeJoinServerPage(){
 const page=$("join-server-page");
 if(!page)return;
 page.classList.add("hidden");
 page.setAttribute("aria-hidden","true");
 document.body.classList.remove("join-page-open");
}
function showJoinDirectoryMessage(message,type="empty"){
 const root=$("join-server-list");
 root.replaceChildren();
 const box=document.createElement("div");
 box.className="join-directory-message "+type;
 const icon=document.createElement("div");
 icon.className="join-directory-message-icon";
 icon.textContent=type==="error"?"!":type==="loading"?"◌":"✦";
 const title=document.createElement("h3");
 title.textContent=type==="error"?"Directory unavailable":type==="loading"?"Loading communities…":"No communities found";
 const detail=document.createElement("p");
 detail.textContent=message;
 box.append(icon,title,detail);
 if(type==="empty"){
  const create=document.createElement("button");
  create.type="button";
  create.textContent="Create a server";
  create.addEventListener("click",()=>{closeJoinServerPage();openModal("server")});
  box.append(create);
 }
 root.append(box);
}
async function loadJoinDirectory(){
 if(joinDirectoryLoading)return;
 joinDirectoryLoading=true;
 showJoinDirectoryMessage("Finding public Echo communities…","loading");
 try{
  const {data,error}=await S.db.rpc("discoverable_servers");
  if(error)throw error;
  joinDirectoryServers=data||[];
  renderJoinDirectory();
 }catch(error){
  showJoinDirectoryMessage("The directory could not be reached. "+err(error),"error");
 }finally{joinDirectoryLoading=false}
}
function renderJoinDirectory(){
 const root=$("join-server-list");
 const search=($("join-server-search").value||"").trim().toLowerCase();
 const filtered=joinDirectoryServers.filter(server=>{
  const categoryOk=joinDirectoryCategory==="All"||server.category===joinDirectoryCategory;
  const searchOk=!search||(server.name+" "+(server.description||"")+" "+(server.category||"")).toLowerCase().includes(search);
  return categoryOk&&searchOk;
 });
 root.replaceChildren();
 if(!filtered.length){
  showJoinDirectoryMessage(joinDirectoryServers.length?"Try another search or category.":"No public servers have been listed yet. Server owners can publish theirs from Server Settings → Public server discovery.");
  return;
 }
 filtered.forEach(server=>{
  const card=document.createElement("article");card.className="join-server-card";
  const top=document.createElement("div");top.className="join-server-card-top";
  const icon=document.createElement("div");icon.className="join-server-card-icon";icon.textContent=(server.name||"E").trim().charAt(0).toUpperCase();
  const details=document.createElement("div");details.className="join-server-card-details";
  const name=document.createElement("h3");name.textContent=server.name;
  const category=document.createElement("span");category.className="join-server-category";category.textContent=server.category||"Community";
  details.append(name,category);top.append(icon,details);
  const description=document.createElement("p");description.className="join-server-description";
  description.textContent=server.description||"A new Echo community. Join the conversation.";
  const footer=document.createElement("div");footer.className="join-server-card-footer";
  const members=document.createElement("span");members.className="join-server-member-count";
  const count=Number(server.member_count||0);members.textContent=count+" "+(count===1?"member":"members");
  const joined=S.servers.some(item=>item.id===server.id);
  const button=document.createElement("button");button.type="button";
  button.className=joined?"join-server-card-button joined":"join-server-card-button";
  button.textContent=joined?"✓ Joined":"Join";button.disabled=joined;
  button.addEventListener("click",()=>joinDiscoveredServer(server,button));
  footer.append(members,button);card.append(top,description,footer);root.append(card);
 });
}
async function joinDiscoveredServer(server,button){
 if(!S.user)return toast("Sign in to join a server.");
 button.disabled=true;button.textContent="Joining…";
 try{
  const {data:serverId,error}=await S.db.rpc("join_public_server",{p_server_id:server.id});
  if(error)throw error;
  await loadServers();await selectServer(serverId||server.id);
  closeJoinServerPage();toast("Joined "+server.name+"!");
 }catch(error){toast(err(error));button.disabled=false;button.textContent="Join";}
}
$("join-category-tabs").addEventListener("click",event=>{
 const button=event.target.closest("button[data-category]");if(!button)return;
 joinDirectoryCategory=button.dataset.category;
 $("join-category-tabs").querySelectorAll("button").forEach(item=>item.classList.toggle("active",item===button));
 renderJoinDirectory();
});
$("join-server-search").addEventListener("input",()=>{if(currentServerPrefs(S.server?.id).rememberSearch){try{localStorage.setItem("echo-server-directory-search",$("join-server-search").value)}catch{}}renderJoinDirectory();});
$("join-directory-refresh").addEventListener("click",()=>loadJoinDirectory());
$("join-page-back").addEventListener("click",closeJoinServerPage);
$("join-page-close").addEventListener("click",closeJoinServerPage);
$("join-page-create").addEventListener("click",()=>{closeJoinServerPage();openModal("server")});
$("join-invite-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const code=joinInviteCode($("join-invite-input").value);if(!code)return;
 const button=$("join-invite-submit");button.disabled=true;button.textContent="Joining…";
 $("join-invite-feedback").textContent="";
 try{
  const {data:serverId,error}=await S.db.rpc("join_server_by_invite",{p_code:code});
  if(error)throw error;
  await loadServers();await selectServer(serverId);
  closeJoinServerPage();toast("Server joined!");
 }catch(error){$("join-invite-feedback").textContent=err(error)}
 finally{button.disabled=false;button.innerHTML='Join server <span>→</span>'}
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!$("join-server-page").classList.contains("hidden"))closeJoinServerPage();
});
document.addEventListener("keydown",event=>{
 if(!event.altKey||!["ArrowUp","ArrowDown"].includes(event.key)||event.ctrlKey||event.metaKey)return;
 if(event.target.closest("input,textarea,select,[contenteditable=true]"))return;
 if(document.querySelector("dialog[open]")||!$("join-server-page").classList.contains("hidden"))return;
 if(!currentServerPrefs(S.server?.id).enableQuickSwitch||S.servers.length<2)return;
 const currentIndex=Math.max(0,S.servers.findIndex(server=>server.id===S.server?.id));
 const offset=event.key==="ArrowDown"?1:-1;
 const nextIndex=(currentIndex+offset+S.servers.length)%S.servers.length;
 event.preventDefault();
 selectServer(S.servers[nextIndex].id).catch(error=>toast(err(error)));
});


const SERVER_PREFS=[
 ["Display",[
 ["compactChannels","Compact channel list"],["showChannelCounts","Show channel count in heading"],["showServerDescriptions","Show server descriptions"],["highlightMentions","Highlight @mentions"],["dimMutedChannels","Dim muted channels"],["showMemberAvatars","Show member avatars"],["showTimestamps","Show message timestamps"],["showEditedLabels","Show edited labels"],["showLinkPreviews","Show link previews"],["reduceServerAnimations","Reduce server animations"]
 ]],
 ["Notifications",[
 ["notifyMessages","Notify for new messages"],["notifyMentions","Notify for mentions"],["notifyReplies","Notify about replies (not available yet)"],["notifyInvites","Notify about invite activity (not available yet)"],["notificationSound","Play notification sounds"],["desktopAlerts","Allow desktop alerts"],["quietMode","Quiet mode"],["muteWhenFocused","Mute alerts while this server is open"]
 ]],
 ["Privacy & safety",[
 ["hideOnlineStatus","Hide my online status in this server"],["hideActivity","Hide my profile activity (not available yet)"],["filterUnknownLinks","Warn about unfamiliar links"],["blurSensitiveMedia","Blur sensitive media"],["hideEmbeds","Hide link embeds"],["confirmExternalLinks","Confirm before opening external links"],["filterProfanity","Filter offensive words (not available yet)"],["limitDirectMessages","Keep private messages friends-only (required)"]
 ]],
 ["Chat experience",[
 ["enterToSend","Enter sends messages"],["ctrlEnterNewline","Ctrl + Enter inserts a line break"],["spellcheck","Spellcheck messages"],["autoScroll","Auto-scroll to newest messages"],["rememberChannel","Remember last opened channel"],["showTyping","Show typing indicators"],["showReactions","Show message reactions"],["showPinnedFirst","Show pinned messages first (not available yet)"]
 ]],
 ["Server tools",[
 ["confirmInvites","Confirm before creating invite links"],["copyInviteAutomatically","Copy invite links automatically"],["showServerId","Show server ID in settings"],["confirmLeave","Confirm before leaving"],["warnBeforeDelete","Warn before destructive actions"],["showServerCreationDate","Show server creation date"],["showRoleLabels","Show member role labels"],["enableQuickSwitch","Enable quick server switching"],["rememberSearch","Remember server search"],["showWelcomeTips","Show server tips"]
 ]]
];
const SERVER_PREF_DEFAULTS={
 compactChannels:false,showChannelCounts:true,showServerDescriptions:true,highlightMentions:true,dimMutedChannels:false,
 showMemberAvatars:true,showTimestamps:true,showEditedLabels:true,showLinkPreviews:true,reduceServerAnimations:false,
 notifyMessages:true,notifyMentions:true,notifyReplies:true,notifyInvites:true,notificationSound:false,desktopAlerts:false,quietMode:false,muteWhenFocused:false,
 hideOnlineStatus:false,hideActivity:false,filterUnknownLinks:true,blurSensitiveMedia:false,hideEmbeds:false,confirmExternalLinks:true,filterProfanity:false,limitDirectMessages:true,
 enterToSend:true,ctrlEnterNewline:false,spellcheck:true,autoScroll:true,rememberChannel:true,showTyping:true,showReactions:true,showPinnedFirst:true,
 confirmInvites:true,copyInviteAutomatically:true,showServerId:true,confirmLeave:true,warnBeforeDelete:true,showServerCreationDate:true,showRoleLabels:true,enableQuickSwitch:true,rememberSearch:true,showWelcomeTips:true
};
function serverPrefsKey(id){return "echo-server-preferences-v1:"+id}
function readServerPrefs(id){try{return JSON.parse(localStorage.getItem(serverPrefsKey(id))||"{}")}catch{return {}}}
function currentServerPrefs(id){
 const saved=id?readServerPrefs(id):{};
 const account=window.echoGetAppPrefs?.()||{};
 return {...SERVER_PREF_DEFAULTS,...saved,enterToSend:typeof saved.enterToSend==="boolean"?saved.enterToSend:account.enterSend!==false};
}
window.echoGetServerPrefs=currentServerPrefs;
window.echoGetServerPrefOverrides=readServerPrefs;
function applyServerPreferenceUI(){
 const prefs=currentServerPrefs(S.server?.id);
 const root=document.documentElement;
 root.classList.toggle("yapper-server-compact-channels",!!prefs.compactChannels);
 root.classList.toggle("yapper-server-hide-member-avatars",!prefs.showMemberAvatars);
 root.classList.toggle("yapper-server-hide-timestamps",!prefs.showTimestamps);
 root.classList.toggle("yapper-server-hide-edited-labels",!prefs.showEditedLabels);
 root.classList.toggle("yapper-server-hide-typing",!prefs.showTyping);
 root.classList.toggle("yapper-server-hide-previews",!prefs.showLinkPreviews||!!prefs.hideEmbeds);
 root.classList.toggle("yapper-server-blur-media",!!prefs.blurSensitiveMedia);
 root.classList.toggle("yapper-server-reduced-motion",!!prefs.reduceServerAnimations);
 root.classList.toggle("yapper-server-highlight-mentions",!!prefs.highlightMentions);
 root.classList.toggle("yapper-server-hide-reactions",!prefs.showReactions);
 const serverIdInfo=$("server-id-info");
 if(serverIdInfo){
  serverIdInfo.textContent=prefs.showServerId?"Server ID: "+(S.server?.id||""):"";
  serverIdInfo.classList.toggle("hidden",!prefs.showServerId);
 }
 const serverCreatedInfo=$("server-created-info");
 if(serverCreatedInfo){
  const date=S.server?.created_at?new Date(S.server.created_at).toLocaleDateString([],{year:"numeric",month:"long",day:"numeric"}):"Unknown";
  serverCreatedInfo.textContent=prefs.showServerCreationDate?"Created "+date:"";
  serverCreatedInfo.classList.toggle("hidden",!prefs.showServerCreationDate);
 }
 const subtitle=$("server-subtitle");
 if(subtitle)subtitle.textContent=prefs.showServerDescriptions&&S.server?.description?S.server.description:"YOUR COMMUNITY";
 const channelHeading=$("channel-section-title");
 if(channelHeading)channelHeading.textContent=prefs.showChannelCounts?"TEXT CHANNELS · "+S.channels.length:"TEXT CHANNELS";
 const input=$("message-input");
 if(input)input.spellcheck=prefs.spellcheck!==false;
}
function renderServerPrefs(){
 const root=$("server-settings-groups");if(!root||!S.server)return;
 const prefs=currentServerPrefs(S.server.id),query=($("server-settings-search").value||"").trim().toLowerCase();
 root.replaceChildren();
 SERVER_PREFS.forEach(([group,items])=>{
  const visible=items.filter(([key,label])=>(key+" "+label+" "+group).toLowerCase().includes(query));if(!visible.length)return;
  const section=document.createElement("div");section.className="server-pref-group";
  const title=document.createElement("h4");title.textContent=group;section.append(title);
  visible.forEach(([key,label])=>{
   const row=document.createElement("label");row.className="server-pref-row";
   const copy=document.createElement("span");copy.textContent=label;
   const input=document.createElement("input");input.type="checkbox";input.checked=!!prefs[key];input.dataset.pref=key;
   const unavailablePrefs=new Set(["hideActivity","notifyReplies","notifyInvites","filterProfanity","showPinnedFirst"]);
   const enforcedPrefs=new Set(["limitDirectMessages"]);
   if(unavailablePrefs.has(key)||enforcedPrefs.has(key)){
    input.disabled=true;
    row.title=enforcedPrefs.has(key)?"Echo keeps private messages limited to accepted friends.":"This setting will become available when Echo has the matching feature.";
    const status=document.createElement("small");
    status.className="server-pref-availability";
    status.textContent=enforcedPrefs.has(key)?"Required":"Not available yet";
    copy.append(status);
   }
   input.addEventListener("change",async()=>{
    if(key==="desktopAlerts"&&input.checked&&"Notification" in window&&Notification.permission!=="granted"){
     try{
      const permission=Notification.permission==="default"?await Notification.requestPermission():Notification.permission;
      if(permission!=="granted"){input.checked=false;toast("Allow notifications in Chrome site settings to use desktop alerts.");}
     }catch{input.checked=false;toast("Could not request browser notification permission.");}
    }
    const current=readServerPrefs(S.server.id);current[key]=input.checked;
    try{
     localStorage.setItem(serverPrefsKey(S.server.id),JSON.stringify(current));
     applyServerPreferenceUI();
     if(key==="hideOnlineStatus")window.echoUpdatePresencePreferences?.();
     if(key==="dimMutedChannels")renderChannels();
     if(["showTimestamps","showEditedLabels","showLinkPreviews","highlightMentions","showReactions","showMemberAvatars","showTyping","blurSensitiveMedia","hideEmbeds"].includes(key))window.renderMessages?.();
     const status=$("server-preferences-status");
     if(status)status.textContent="Saved automatically on this device · "+new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
    }catch(error){toast("Could not save this preference: "+(error.message||error));}
   });
   row.append(copy,input);section.append(row);
  });
  root.append(section);
 });
 if(!root.children.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="No matching settings.";root.append(empty)}
 applyServerPreferenceUI();
}
$("server-settings-search").addEventListener("input",renderServerPrefs);
$("server-settings-reset").onclick=()=>{
 if(!S.server)return;
 if(!confirm("Reset all 44 personal preferences for this server?"))return;
 localStorage.removeItem(serverPrefsKey(S.server.id));
 renderServerPrefs();
 const status=$("server-preferences-status");if(status)status.textContent="All 44 preferences reset to their defaults.";
 toast("Server preferences reset.");
};
function openServerSettings(){
 if(!S.server)return toast("Select a server first.");
 const owner=S.server.owner_id===S.user.id;
 $("server-settings-title").textContent=S.server.name;
 $("server-settings-name").value=S.server.name;
 $("server-settings-name").disabled=!owner;
 $("server-settings-save").classList.toggle("hidden",!owner);
 $("server-discovery-form").classList.toggle("hidden",!owner);
 $("server-discoverable").checked=!!S.server.discoverable;
 $("server-discoverable").disabled=!owner;
 $("server-description").value=S.server.description||"";
 $("server-description").disabled=!owner;
 $("server-category").value=S.server.category||"Community";
 $("server-category").disabled=!owner;
 $("server-discovery-feedback").textContent="";
 $("server-settings-role").textContent=owner?"You own this server. Manage its name and public discovery listing.":"You are a member of this server.";
 $("server-leave-button").disabled=owner;
 $("server-leave-help").textContent=owner?"The server owner cannot leave their own server yet.":"Leave this community. You can rejoin later with an invite.";
 $("server-settings-feedback").textContent="";
 $("server-settings-search").value="";
 const serverPrefs=currentServerPrefs(S.server.id);
 $("server-id-info").textContent=serverPrefs.showServerId?"Server ID: "+S.server.id:"";
 const serverCreated=$("server-created-info");
 if(serverCreated){
  const createdDate=S.server.created_at?new Date(S.server.created_at).toLocaleDateString([],{year:"numeric",month:"long",day:"numeric"}):"Unknown";
  serverCreated.textContent=serverPrefs.showServerCreationDate?"Created "+createdDate:"";
  serverCreated.classList.toggle("hidden",!serverPrefs.showServerCreationDate);
 }
 $("server-id-info").classList.toggle("hidden",!serverPrefs.showServerId);
 const preferenceStatus=$("server-preferences-status");
 if(preferenceStatus)preferenceStatus.textContent="Changes save automatically on this device.";
 renderServerPrefs();
 $("server-settings-modal").showModal();
}
$("server-settings-open").onclick=openServerSettings;
$("server-settings-done").onclick=()=>$("server-settings-modal").close();
$("server-discovery-form").onsubmit=async event=>{
 event.preventDefault();
 if(!S.server||S.server.owner_id!==S.user.id)return;
 const button=$("server-discovery-save"),feedback=$("server-discovery-feedback");
 button.disabled=true;feedback.textContent="Saving discovery settings…";
 try{
  const id=S.server.id;
  const updates={discoverable:$("server-discoverable").checked,description:$("server-description").value.trim().slice(0,180),category:$("server-category").value};
  const {data,error}=await S.db.from("servers").update(updates).eq("id",id).eq("owner_id",S.user.id)
   .select("id,name,owner_id,created_at,discoverable,description,category").single();
  if(error)throw error;
  if(!data)throw Error("You do not have permission to update discovery settings.");
  S.server=data;S.servers=S.servers.map(server=>server.id===id?data:server);
  feedback.textContent=data.discoverable?"This server is now listed in public discovery.":"This server is hidden from public discovery.";
  if(!$("join-server-page").classList.contains("hidden"))await loadJoinDirectory();
 }catch(error){feedback.textContent=err(error)}
 finally{button.disabled=false}
};
$("server-settings-form").onsubmit=async e=>{
 e.preventDefault();
 if(!S.server||S.server.owner_id!==S.user.id)return;
 const name=$("server-settings-name").value.trim().slice(0,60);
 if(!name)return;
 $("server-settings-save").disabled=true;
 try{
  const id=S.server.id;
  const {data,error}=await S.db.from("servers").update({name}).eq("id",id).eq("owner_id",S.user.id).select("id,name,owner_id,created_at,discoverable,description,category").single();
  if(error)throw error;
  if(!data)throw Error("You do not have permission to rename this server.");
  S.servers=S.servers.map(server=>server.id===id?data:server);S.server=data;
  $("server-name").textContent=data.name;$("server-settings-title").textContent=data.name;renderServers();
  $("server-settings-feedback").textContent="Server name updated.";toast("Server renamed.");
 }catch(error){$("server-settings-feedback").textContent=err(error)}
 finally{$("server-settings-save").disabled=false}
};
$("server-settings-invite").onclick=async()=>{
 if(!S.server)return;
 const serverPreferences=currentServerPrefs(S.server.id);
 if(serverPreferences.confirmInvites&&!confirm("Create an invite link for "+S.server.name+"?"))return;
 const button=$("server-settings-invite");button.disabled=true;
 try{
  const {data:code,error}=await S.db.rpc("create_server_invite",{p_server_id:S.server.id,p_expires_at:null,p_max_uses:null});
  if(error)throw error;
  const link=new URL(location.href);link.searchParams.set("invite",code);
  if(serverPreferences.copyInviteAutomatically){try{await navigator.clipboard.writeText(link.href);$("server-settings-feedback").textContent="Invite link copied to clipboard."}
  catch{$("server-settings-feedback").textContent="Invite link: "+link.href}}
 else $("server-settings-feedback").textContent="Invite link: "+link.href;
 }catch(error){$("server-settings-feedback").textContent=err(error)}
 finally{button.disabled=false}
};
$("server-leave-button").onclick=async()=>{
 if(!S.server||S.server.owner_id===S.user.id)return;
 const current=S.server;
 if(currentServerPrefs(current.id).confirmLeave&&!confirm("Leave "+current.name+"? You will need a new invite to rejoin."))return;
 const button=$("server-leave-button");button.disabled=true;
 try{
  const {error}=await S.db.from("server_members").delete().eq("server_id",current.id).eq("user_id",S.user.id);
  if(error)throw error;
  if(S.sub){const previous=S.sub;S.sub=null;await S.db.removeChannel(previous)}
  S.server=null;S.channel=null;S.channels=[];S.messages=[];
  $("server-settings-modal").close();await loadServers();toast("You left "+current.name+".");
 }catch(error){$("server-settings-feedback").textContent=err(error)}
 finally{button.disabled=false}
};

function loadSupabaseLibrary(){return new Promise((resolve,reject)=>{if(window.supabase?.createClient){resolve();return}const urls=["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js","https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js"];let index=0;const attempt=()=>{if(window.supabase?.createClient){resolve();return}if(index>=urls.length){reject(new Error("Could not load the Supabase library from either CDN."));return}const script=document.createElement("script");script.src=urls[index++];script.onload=()=>window.supabase?.createClient?resolve():attempt();script.onerror=attempt;document.head.appendChild(script)};attempt()})}
function init(){if(SUPABASE_URL.includes("PASTE_YOUR")||SUPABASE_KEY.includes("PASTE_YOUR")){toast("Setup needed: add your Supabase URL and publishable key in app.js.");$("auth-submit").disabled=true;return}if(!window.supabase?.createClient){$("auth-submit").disabled=true;loadSupabaseLibrary().then(()=>{$("auth-submit").disabled=false;init()}).catch(e=>{toast("Supabase library could not load. Check your connection or try refreshing.");console.error(e)});return}S.db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);setupPasswordRecovery();S.db.auth.getSession().then(({data,error})=>{if(error)toast(err(error));if(data?.session?.user)startUser(data.session.user)});S.db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session?.user)startUser(session.user);if(event==="SIGNED_OUT")showAuth()});setupAuth()}init();
