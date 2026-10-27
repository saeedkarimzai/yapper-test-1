// Add your Supabase Project URL and publishable (or legacy anon) key here. Never use a service_role/secret key.
const SUPABASE_URL = "https://grtvubvopumjnflhlzrz.supabase.co";
const SUPABASE_KEY = "sb_publishable_86c_reVLgXmgR2xtG96gxw_jN3javI2";
const $=id=>document.getElementById(id);const S={db:null,user:null,servers:[],server:null,channels:[],channel:null,messages:[],sub:null,mode:"signin",dialogMode:null};
function setLiveStatus(status){const el=$("live-status");if(!el)return;const states={connecting:["◌ CONNECTING…",true],online:["● LIVE CHAT",false],offline:["● CONNECTION ISSUE",true],idle:["● NOT CONNECTED",true]};const v=states[status]||states.idle;el.textContent=v[0];el.classList.toggle("offline",v[1]);el.title=status==="online"?"Live updates connected":status==="connecting"?"Connecting to live updates":"Live updates may be unavailable"}
function toast(s){let e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.classList.remove("show"),4200)}
function err(e){return e?.message||String(e)}function initial(s){return (s||"Y").trim().charAt(0).toUpperCase()||"Y"}function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function showAuth(){if(S.sub)S.db.removeChannel(S.sub);S.sub=null;setLiveStatus("idle");S.user=null;$("auth").classList.remove("hidden");$("app").classList.add("hidden")}
function showApp(){ $("auth").classList.add("hidden");$("app").classList.remove("hidden");$("user-email").textContent=S.user.email||"Yapper";loadServers().catch(e=>toast(err(e)))}
function setupAuth(){$("switch").onclick=()=>{S.mode=S.mode==="signin"?"signup":"signin";$("auth-title").textContent=S.mode==="signin"?"Welcome back.":"Join YAPPER."; $("auth-submit").textContent=S.mode==="signin"?"Sign in":"Create account";$("switch-text").textContent=S.mode==="signin"?"New to YAPPER?":"Already have an account?";$("switch").textContent=S.mode==="signin"?"Create an account":"Sign in"};$("auth-form").onsubmit=async e=>{e.preventDefault();let email=$("email").value.trim(),password=$("password").value;$("auth-submit").disabled=true;try{let r=S.mode==="signup"?await S.db.auth.signUp({email,password}):await S.db.auth.signInWithPassword({email,password});if(r.error)throw r.error;if(S.mode==="signup"&&!r.data.session)toast("Account created. Check your email to confirm, then sign in.");else if(r.data.user)startUser(r.data.user)}catch(e){toast(err(e))}finally{$("auth-submit").disabled=false}}}
async function startUser(u){if(S.user?.id===u.id&&!$("app").classList.contains("hidden"))return;S.user=u;showApp()}
async function loadServers(){let {data,error}=await S.db.from("server_members").select("server_id,servers(id,name,owner_id,created_at)").eq("user_id",S.user.id);if(error)throw error;S.servers=(data||[]).map(x=>x.servers).filter(Boolean);renderServers();if(S.servers.length){await selectServer(S.server&&S.servers.some(x=>x.id===S.server.id)?S.server.id:S.servers[0].id)}else{S.server=null;S.channels=[];S.channel=null;renderChannels();$("server-name").textContent="Pick a server";$("messages").innerHTML="";$("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="Welcome to YAPPER."; $("empty").querySelector("p").textContent="Create a server or join one to start chatting."; $("message-input").disabled=true;$("send").disabled=true}}
function renderServers(){let root=$("servers");root.innerHTML="";S.servers.forEach(s=>{let b=document.createElement("button");b.className="server-pill"+(S.server?.id===s.id?" active":"");b.textContent=initial(s.name);b.title=s.name;b.onclick=()=>selectServer(s.id).catch(e=>toast(err(e)));root.append(b)})}
async function selectServer(id){S.server=S.servers.find(s=>s.id===id)||null;S.channel=null;renderServers();$("server-name").textContent=S.server?.name||"Pick a server";if(!S.server)return;let {data,error}=await S.db.from("channels").select("id,server_id,name,created_at").eq("server_id",id).order("created_at");if(error)throw error;S.channels=data||[];renderChannels();if(S.channels.length)await selectChannel(S.channels[0].id);else{S.messages=[];renderMessages();$("channel-name").textContent="No channels";$("channel-desc").textContent="Create a channel to start talking.";$("message-input").disabled=true;$("send").disabled=true;$("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="No channels yet.";$("empty").querySelector("p").textContent="Create a text channel to start talking."}}
function renderChannels(){let n=$("channels");n.innerHTML="";S.channels.forEach(c=>{let b=document.createElement("button");b.className="channel"+(S.channel?.id===c.id?" active":"");b.innerHTML="<span>#</span>"+esc(c.name);b.onclick=()=>selectChannel(c.id).catch(e=>toast(err(e)));n.append(b)})}
let channelRequestToken=0;
async function selectChannel(id){
 const token=++channelRequestToken;
 S.channel=S.channels.find(c=>c.id===id)||null;
 renderChannels();
 if(!S.channel){setLiveStatus("idle");return}
 const channel=S.channel;
 setLiveStatus("connecting");
 $("channel-name").textContent=channel.name;
 $("channel-desc").textContent="Messages in #"+channel.name;
 $("message-input").placeholder="Message #"+channel.name;
 $("message-input").disabled=false;
 $("send").disabled=false;
 if(S.sub){const previous=S.sub;S.sub=null;await S.db.removeChannel(previous)}
 if(token!==channelRequestToken||S.channel?.id!==id)return;
 let {data,error}=await S.db.from("messages").select("id,channel_id,user_id,content,created_at").eq("channel_id",id).order("created_at").limit(150);
 if(error)throw error;
 if(token!==channelRequestToken||S.channel?.id!==id)return;
 S.messages=data||[];
 renderMessages();
 // Give every subscription attempt a unique topic. Supabase can otherwise return a
 // channel object that was already subscribed while a previous channel is being removed.
 const topic="yapper-messages-"+id+"-"+token;
 const channelSub=S.db.channel(topic)
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"channel_id=eq."+id},p=>{
   if(S.channel?.id!==id)return;
   if(!S.messages.some(m=>m.id===p.new.id)){S.messages.push(p.new);if(S.messages.length>150)S.messages.shift();renderMessages()}
  })
  .subscribe(status=>{
   if(token!==channelRequestToken)return;
   if(status==="SUBSCRIBED")setLiveStatus("online");
   else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setLiveStatus("offline");
   else if(status==="CLOSED")setLiveStatus("idle")
  });
 S.sub=channelSub;
}
function renderMessages(){let root=$("messages");root.innerHTML="";$("empty").classList.toggle("hidden",!!(S.channel&&S.messages.length));if(S.channel&&!S.messages.length){$("empty").classList.remove("hidden");$("empty").querySelector("h2").textContent="Welcome to #"+S.channel.name+".";$("empty").querySelector("p").textContent="Be the first to send a message."}S.messages.forEach(m=>{let own=m.user_id===S.user?.id,name=own?(S.user.email||"You"):"Yapper "+String(m.user_id).slice(0,7),d=new Date(m.created_at),el=document.createElement("article");el.className="message";el.innerHTML='<div class="avatar">'+esc(initial(name))+'</div><div class="message-body"><div class="meta"><b>'+esc(name)+'</b><time>'+esc(d.toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}))+'</time></div><div class="message-text">'+esc(m.content)+'</div></div>';root.append(el)});root.scrollTop=root.scrollHeight}
$("message-form").onsubmit=async e=>{e.preventDefault();let content=$("message-input").value.trim();if(!content||!S.channel)return;$("send").disabled=true;try{let channelId=S.channel.id;let {data:sent,error}=await S.db.from("messages").insert({channel_id:channelId,user_id:S.user.id,content}).select("id,channel_id,user_id,content,created_at").single();if(error)throw error;if(S.channel?.id===channelId&&!S.messages.some(m=>m.id===sent.id)){S.messages.push(sent);if(S.messages.length>150)S.messages.shift();renderMessages()}$("message-input").value=""}catch(e){toast(err(e))}finally{$("send").disabled=!S.channel;$("message-input").focus()}};
function openModal(mode){S.dialogMode=mode;let c={server:["Create a server","Give your space a name.","Server name","My server","Share the server ID with friends.","Create server"],channel:["Create a channel","Use a short channel name.","Channel name","general","Letters, numbers, hyphens and underscores work best.","Create channel"],join:["Join a server","Paste the server ID a friend shared.","Server ID","Paste server UUID","You must be signed in. Share server IDs only with people you trust.","Join server"]}[mode];$("modal-title").textContent=c[0];$("modal-desc").textContent=c[1];$("modal-label").textContent=c[2];$("modal-input").placeholder=c[3];$("modal-help").textContent=c[4];$("modal-submit").textContent=c[5];$("modal-input").value="";$("modal").showModal();$("modal-input").focus()}
$("new-server").onclick=$("new-server-rail").onclick=()=>openModal("server");$("join").onclick=$("join-rail").onclick=()=>openModal("join");$("new-channel").onclick=()=>S.server?openModal("channel"):toast("Create or select a server first.");
$("copy-id").onclick=async()=>{if(!S.server)return toast("Select a server first.");try{await navigator.clipboard.writeText(S.server.id);toast("Server ID copied. Share it only with people you want to invite.")}catch{toast("Server ID: "+S.server.id)}};
$("cancel").onclick=()=>$("modal").close();$("modal-form").onsubmit=async e=>{e.preventDefault();let v=$("modal-input").value.trim(),mode=S.dialogMode;if(!v)return;$("modal-submit").disabled=true;try{if(mode==="server"){let {data:s,error}=await S.db.from("servers").insert({name:v.slice(0,60),owner_id:S.user.id}).select("id,name,owner_id,created_at").single();if(error)throw error;let {error:me}=await S.db.from("server_members").insert({server_id:s.id,user_id:S.user.id});if(me)throw me;let {error:ce}=await S.db.from("channels").insert({server_id:s.id,name:"general"});if(ce)throw ce;await loadServers();await selectServer(s.id);toast("Server created! Copy its ID to invite a friend.")}else if(mode==="channel"){if(!S.server)throw Error("Select a server first.");let name=v.toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);if(!name)throw Error("Use at least one letter or number.");let {error}=await S.db.from("channels").insert({server_id:S.server.id,name});if(error)throw error;await selectServer(S.server.id);toast("Channel created.")}else{let {error}=await S.db.from("server_members").insert({server_id:v,user_id:S.user.id});if(error)throw error;await loadServers();await selectServer(v);toast("Joined server!")}$("modal").close()}catch(e){toast(err(e))}finally{$("modal-submit").disabled=false}};
$("signout").onclick=async()=>{let {error}=await S.db.auth.signOut();if(error)toast(err(error));showAuth()};
function init(){if(SUPABASE_URL.includes("PASTE_YOUR")||SUPABASE_KEY.includes("PASTE_YOUR")){toast("Setup needed: add your Supabase URL and publishable key in app.js.");$("auth-submit").disabled=true;return}if(!window.supabase?.createClient){toast("Supabase library did not load. Check your connection.");return}S.db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);S.db.auth.getSession().then(({data,error})=>{if(error)toast(err(error));if(data?.session?.user)startUser(data.session.user)});S.db.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_IN"&&session?.user)startUser(session.user);if(event==="SIGNED_OUT")showAuth()});setupAuth()}init();
