// YAPPER searchable GIF picker powered by GIPHY.
(function(){
  function keyName(target){return "yapper_giphy_api_key_"+target;}
  const timers=new WeakMap();
  const $g=id=>document.getElementById(id);
  function apiKey(target){return localStorage.getItem(keyName(target))||"";}
  function setStatus(picker,message){const el=picker.querySelector("[data-gif-status]");if(el)el.textContent=message;}
  function renderContent(target,content,kind){
    const match=String(content||"").match(/^\[\[GIF:(https:\/\/[^\]]+)\]\]$/);
    if(!match){target.textContent=content||"";return;}
    let url;try{url=new URL(match[1]);}catch{target.textContent=content;return;}
    if(!/^(media\d*|i)\.giphy\.com$/.test(url.hostname)){target.textContent=content;return;}
    const img=document.createElement("img");img.src=url.href;img.alt="GIF";img.loading="lazy";img.referrerPolicy="no-referrer";img.className=kind==="dm"?"dm-message-gif":"message-gif";
    img.onerror=()=>{img.replaceWith(document.createTextNode("GIF could not be loaded."));};
    target.append(img);
  }
  window.yapperRenderContent=renderContent;
  function configureKey(picker,target){
    const value=prompt("Paste your GIPHY API key for "+(target==="dm"?"private messages":"server chat")+". Get one at developers.giphy.com/dashboard/. It is saved only in this browser.",apiKey(target));
    if(value===null)return;
    if(!value.trim()){localStorage.removeItem(keyName(target));setStatus(picker,"API key removed. Add a GIPHY key to search GIFs.");return;}
    localStorage.setItem(keyName(target),value.trim());load(picker,"",target);
  }
  function makeCard(gif,picker,target){
    const image=gif?.images?.fixed_width_small?.url||gif?.images?.fixed_width?.url||gif?.images?.downsized?.url;
    const sendUrl=gif?.images?.fixed_width?.url||gif?.images?.original?.url;
    if(!image||!sendUrl)return;
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
      }catch(e){setStatus(picker,e.message||String(e));}
    });
    picker.querySelector("[data-gif-results]").append(button);
  }
  async function load(picker,query,target){
    const key=apiKey(target);
    if(!key){setStatus(picker,"Add a GIPHY API key to search and send GIFs.");picker.querySelector("[data-gif-results]").replaceChildren();return;}
    const seq=Number(picker.dataset.requestNo||0)+1;picker.dataset.requestNo=String(seq);
    setStatus(picker,"Finding GIFs…");picker.querySelector("[data-gif-results]").replaceChildren();
    const endpoint=query.trim()?"search":"trending";
    const params=new URLSearchParams({api_key:key,limit:"24",rating:"pg-13",bundle:"messaging_non_clips"});
    if(query.trim())params.set("q",query.trim());
    try{
      const response=await fetch("https://api.giphy.com/v1/gifs/"+endpoint+"?"+params.toString());
      if(!response.ok)throw Error(response.status===401||response.status===403?"GIPHY rejected that API key. Check it and try again.":"GIPHY request failed ("+response.status+").");
      const result=await response.json();if(seq!==Number(picker.dataset.requestNo))return;
      const rows=result.data||[];if(!rows.length){setStatus(picker,"No GIFs found. Try another search.");return;}
      setStatus(picker,query.trim()?"Search results":"Trending GIFs");
      rows.forEach(g=>makeCard(g,picker,target));
    }catch(e){if(seq===Number(picker.dataset.requestNo))setStatus(picker,e.message||String(e));}
  }
  function setup(id,toggleId,target){
    const picker=$g(id),toggle=$g(toggleId);if(!picker||!toggle)return;
    const input=picker.querySelector("[data-gif-search]");
    toggle.addEventListener("click",()=>{
      document.querySelectorAll(".gif-picker").forEach(p=>{if(p!==picker)p.classList.add("hidden");});
      picker.classList.toggle("hidden");
      if(!picker.classList.contains("hidden")){if(!apiKey(target))setStatus(picker,"Add a GIPHY API key to search and send GIFs.");else load(picker,"",target);input.focus();}
    });
    picker.querySelector("[data-gif-key]").addEventListener("click",()=>configureKey(picker,target));
    picker.querySelector("[data-gif-close]").addEventListener("click",()=>picker.classList.add("hidden"));
    input.addEventListener("input",()=>{clearTimeout(timers.get(picker));timers.set(picker,setTimeout(()=>load(picker,input.value,target),300));});
    input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();clearTimeout(timers.get(picker));load(picker,input.value,target);}});
  }
  setup("gif-picker","gif-toggle","main");
  setup("dm-gif-picker","dm-gif-toggle","dm");
  function syncButtons(){
    const ready=!!S.user;
    if($g("gif-toggle"))$g("gif-toggle").disabled=!ready||!S.channel;
    if($g("dm-gif-toggle"))$g("dm-gif-toggle").disabled=!ready||!$g("dm-message-input")||$g("dm-message-input").disabled;
  }
  if(typeof S!=="undefined"&&S.db){S.db.auth.onAuthStateChange(()=>setTimeout(syncButtons,0));S.db.auth.getSession().then(()=>syncButtons());}
  const originalSelect=window.selectChannel;
  if(typeof originalSelect==="function")window.selectChannel=async function(id){const r=await originalSelect(id);syncButtons();return r;};
  setInterval(syncButtons,1200);
})();
