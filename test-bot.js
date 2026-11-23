/* YAPPER Test Bot client controls and command replies. */
(()=>{
 const $=id=>document.getElementById(id),button=$("add-test-bot"),form=$("message-form"),input=$("message-input");
 if(!button||!form||!input)return;
 let busy=false;
 const current=()=>typeof S!=="undefined"&&S.user&&S.server&&S.channel;
 async function invoke(action,content=""){
  if(!current())throw new Error("Sign in and select a channel first.");
  const {data,error}=await S.db.functions.invoke("yapper-test-bot",{body:{action,server_id:S.server.id,channel_id:S.channel.id,content}});
  if(error)throw error;if(data?.error)throw new Error(data.error);return data;
 }
 function sync(){button.disabled=!current()||busy}
 button.addEventListener("click",async()=>{
  if(busy)return;busy=true;button.textContent="Adding bot…";sync();
  try{await invoke("join");toast("🤖 YAPPER Test Bot joined this server!");}
  catch(e){toast("Test bot: "+(e.message||e));}
  finally{busy=false;button.textContent="🤖 Test bot";sync()}
 });
 form.addEventListener("submit",()=>{
  if(!current())return;
  const sent=input.value.trim(),sid=S.server.id,cid=S.channel.id;
  if(!/@yapper_test_bot\b|!testbot\b/i.test(sent))return;
  setTimeout(async()=>{
   const posted=S.messages?.some(m=>m.user_id===S.user?.id&&m.channel_id===cid&&m.content===sent);
   if(!posted||S.server?.id!==sid||S.channel?.id!==cid)return;
   try{await invoke("message",sent)}catch(e){toast("Test bot: "+(e.message||e))}
  },900);
 },true);
 const timer=setInterval(()=>{if(typeof S!=="undefined"&&S.db){clearInterval(timer);sync();S.db.auth.onAuthStateChange(()=>setTimeout(sync,0));}},250);
 const observer=new MutationObserver(sync);observer.observe(document.getElementById("app"),{attributes:true,attributeFilter:["class"]});
 const channelWatch=setInterval(()=>{if(typeof S!=="undefined"&&S.db){sync();}},1000);
})();