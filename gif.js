// YAPPER GIF picker. The GIPHY key stays server-side in Supabase.
(function(){
  const timers=new WeakMap();
  const $=id=>document.getElementById(id);
  function status(picker,message){const el=picker.querySelector("[data-gif-status]");if(el)el.textContent=message;}
  function renderContent(target,content,kind){
    const raw=String(content||"");
    if(!raw.startsWith("[[GIF:")||!raw.endsWith("]]")){target.textContent=raw;return;}
    let url;try{url=new URL(raw.slice(6,-2));}catch{target.textContent=raw;return;}
    if(!(url.hostname==="i.giphy.com"||(url.hostname.startsWith("media")&&url.hostname.endsWith(".giphy.com")))){target.textContent=raw;return;}
    const img=document.createElement("img");img.src=url.href;img.alt="GIF";img.loading="lazy";img.referrerPolicy="no-referrer";img.className=kind==="dm"?"dm-message-gif":"message-gif";
    img.onerror=()=>img.replaceWith(document.createTextNode("GIF could not be loaded."));
    target.append(img);
  }
  window.yapperRenderContent=renderContent;
  function makeCard(gif,picker,target){
    const image=gif?.images?.fixed_width_small?.url||gif?.images?.fixed_width?.url||gif?.images?.downsized?.url;
    const sendUrl=gif?.images?.fixed_width?.url||gif?.images?.original?.url;
    if(!image||!sendUrl)return;
    let parsed;try{parsed=new URL(sendUrl);}catch{return;}
    if(!/^(media\\d*|i)\\.giphy\\.com$/.test(parsed.hostname))return;
    const button=document.createElement("button");button.type="button";button.className="gif-result";button.title="Send this GIF";
    const img=document.createElement("img");img.src=image;img.alt=gif.title||"GIF";img.loading="lazy";img.referrerPolicy="no-referrer";button.append(img);
    button.addEventListener("click",async()=>{
      try{
        if(target==="dm"){
          if(typeof window.yapperDmSendGif!=="function")throw Error("Private GIF sending is not ready.");
          await window.yapperDmSendGif(sendUrl);
        }else{
          if(!S.user||!S.channel)throw Error("Open a server channel first.");
          const channelId=S.channel.id,content="[[GIF:"+sendUrl+"]]";
          const r=await S.db.from("messages").insert({channel_id:channelId,user_id:S.user.id,content}).select("id,channel_id,user_id,content,created_at,edited_at").single();
          if(r.error)throw r.error;
          if(S.channel?.id===channelId&&!S.messages.some(m=>m.id===r.data.id)){S.messages.push(r.data);if(S.messages.length>150)S.messages.shift();window.renderMessages();}
        }
        picker.classList.add("hidden");
      }catch(e){status(picker,e.message||String(e));}
    });
    picker.querySelector("[data-gif-results]").append(button);
  }
  async function load(picker,query,target){
    if(!S.user){status(picker,"Sign in to search GIFs.");return;}
    const seq=Number(picker.dataset.requestNo||0)+1;picker.dataset.requestNo=String(seq);
    status(picker,"Finding GIFs…");picker.querySelector("[data-gif-results]").replaceChildren();
    try{
      const {data,error}=await S.db.functions.invoke("giphy-proxy",{body:{q:query.trim().slice(0,100)}});
      if(error)throw error;
      if(seq!==Number(picker.dataset.requestNo))return;
      const rows=data?.data||[];
      if(!rows.length){status(picker,"No GIFs found. Try another search.");return;}
      status(picker,query.trim()?"Search results":"Trending GIFs");
      rows.forEach(g=>makeCard(g,picker,target));
    }catch(e){
      if(seq===Number(picker.dataset.requestNo))status(picker,e.message||"GIF search failed. Check the Supabase GIPHY_API_KEY secret.");
    }
  }
  function setup(id,toggleId,target){
    const picker=$(id),toggle=$(toggleId);if(!picker||!toggle)return;
    const input=picker.querySelector("[data-gif-search]");
    toggle.addEventListener("click",()=>{
      document.querySelectorAll(".gif-picker").forEach(p=>{if(p!==picker)p.classList.add("hidden");});
      picker.classList.toggle("hidden");
      if(!picker.classList.contains("hidden")){load(picker,"",target);input.focus();}
    });
    picker.querySelector("[data-gif-close]").addEventListener("click",()=>picker.classList.add("hidden"));
    input.addEventListener("input",()=>{clearTimeout(timers.get(picker));timers.set(picker,setTimeout(()=>load(picker,input.value,target),300));});
    input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();clearTimeout(timers.get(picker));load(picker,input.value,target);}});
  }
  setup("gif-picker","gif-toggle","main");
  setup("dm-gif-picker","dm-gif-toggle","dm");
  function syncButtons(){
    const ready=!!S.user;
    if($("gif-toggle"))$("gif-toggle").disabled=!ready||!S.channel;
    if($("dm-gif-toggle"))$("dm-gif-toggle").disabled=!ready||!$("dm-message-input")||$("dm-message-input").disabled;
  }
  if(typeof S!=="undefined"&&S.db){S.db.auth.onAuthStateChange(()=>setTimeout(syncButtons,0));S.db.auth.getSession().then(()=>syncButtons());}
  const originalSelect=window.selectChannel;
  if(typeof originalSelect==="function")window.selectChannel=async function(id){const r=await originalSelect(id);syncButtons();return r;};
  setInterval(syncButtons,1200);
})();