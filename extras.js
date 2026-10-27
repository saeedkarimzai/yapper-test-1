// YAPPER Discord-style message tools: search, quick emoji, and live reactions.
(function(){
  if(typeof S==="undefined"||!S.db)return;
  const $x=id=>document.getElementById(id);
  const emoji=["👍","❤️","😂","🔥","😭","💀","👀","🎉","🤔","😎","👎","✨","🙏","💯","🫡","🤝"];
  let reactionChannel=null, reactionTimer=null, reactionBusy=false;
  function toastX(t){if(typeof toast==="function")toast(t);}
  function setupEmoji(){
    const tray=$x("emoji-tray"),input=$x("message-input");
    tray.replaceChildren();
    emoji.forEach(symbol=>{
      const b=document.createElement("button");b.type="button";b.textContent=symbol;b.title="Insert "+symbol;
      b.addEventListener("click",()=>{
        const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;
        input.value=input.value.slice(0,start)+symbol+input.value.slice(end);
        input.focus();input.setSelectionRange(start+symbol.length,start+symbol.length);
      });tray.append(b);
    });
    $x("emoji-toggle").addEventListener("click",()=>tray.classList.toggle("hidden"));
    document.addEventListener("click",e=>{if(!tray.contains(e.target)&&e.target!==$x("emoji-toggle"))tray.classList.add("hidden");});
  }
  function setupSearch(){
    const form=$x("message-search-form"),input=$x("message-search-input");
    $x("search-toggle").addEventListener("click",()=>{
      form.classList.toggle("hidden");
      if(!form.classList.contains("hidden")){input.focus();input.select();}
      else{input.value="";filterMessages();}
    });
    function filterMessages(){
      const q=input.value.trim().toLowerCase();let count=0;
      document.querySelectorAll("#messages .message").forEach(row=>{
        const match=!q||row.querySelector(".message-text")?.textContent.toLowerCase().includes(q);
        row.classList.toggle("search-hidden",!match);if(match)count++;
      });
      $x("message-search-count").textContent=count+" result"+(count===1?"":"s");
    }
    input.addEventListener("input",filterMessages);
    form.addEventListener("submit",e=>e.preventDefault());
    $x("search-clear").addEventListener("click",()=>{input.value="";filterMessages();input.focus();});
    document.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();if(form.classList.contains("hidden"))$x("search-toggle").click();else input.focus();}
      if(e.key==="Escape"&&!form.classList.contains("hidden")){form.classList.add("hidden");input.value="";filterMessages();}
    });
  }
  async function loadReactions(){
    if(!S.user||!S.channel||!S.messages?.length)return;
    const ids=S.messages.map(m=>m.id);
    const {data,error}=await S.db.from("message_reactions").select("id,message_id,user_id,emoji").in("message_id",ids);
    if(error){console.warn("Reactions:",error.message);return;}
    const byMessage={};
    (data||[]).forEach(r=>{(byMessage[r.message_id] ||= []).push(r);});
    document.querySelectorAll("#messages .message").forEach(row=>{
      const id=row.dataset.messageId;if(!id)return;
      let bar=row.querySelector(".reaction-bar");
      if(!bar){bar=document.createElement("div");bar.className="reaction-bar";row.querySelector(".message-body")?.append(bar);}
      bar.replaceChildren();
      const reactions=byMessage[id]||[];
      const grouped={};
      reactions.forEach(r=>{grouped[r.emoji] ||= {count:0,mine:false};grouped[r.emoji].count++;if(r.user_id===S.user.id)grouped[r.emoji].mine=true;});
      Object.entries(grouped).forEach(([symbol,info])=>{
        const b=document.createElement("button");b.type="button";b.className="reaction-chip"+(info.mine?" mine":"");b.textContent=symbol+" "+info.count;b.title=info.mine?"Remove your reaction":"React with "+symbol;
        b.addEventListener("click",()=>toggleReaction(id,symbol,info.mine));bar.append(b);
      });
      const add=document.createElement("button");add.type="button";add.className="reaction-add";add.textContent="☺ +";add.title="Add reaction";
      add.addEventListener("click",()=>showReactionPicker(add,id));bar.append(add);
    });
  }
  async function toggleReaction(messageId,symbol,mine){
    if(reactionBusy||!S.user)return;reactionBusy=true;
    try{
      let result;
      if(mine)result=await S.db.from("message_reactions").delete().eq("message_id",messageId).eq("user_id",S.user.id).eq("emoji",symbol);
      else result=await S.db.from("message_reactions").insert({message_id:messageId,user_id:S.user.id,emoji:symbol});
      if(result.error)throw result.error;await loadReactions();
    }catch(e){toastX("Reaction failed: "+(e.message||e));}
    finally{reactionBusy=false;}
  }
  function showReactionPicker(anchor,messageId){
    document.querySelector(".reaction-picker")?.remove();
    const pop=document.createElement("div");pop.className="reaction-picker";
    emoji.forEach(symbol=>{const b=document.createElement("button");b.type="button";b.textContent=symbol;b.addEventListener("click",()=>{pop.remove();toggleReaction(messageId,symbol,false);});pop.append(b);});
    anchor.parentElement.append(pop);
    const close=e=>{if(!pop.contains(e.target)&&e.target!==anchor){pop.remove();document.removeEventListener("pointerdown",close);}};
    setTimeout(()=>document.addEventListener("pointerdown",close),0);
  }
  function watchReactions(){
    if(reactionChannel){S.db.removeChannel(reactionChannel);reactionChannel=null;}
    if(!S.user)return;
    reactionChannel=S.db.channel("yapper-reactions-"+S.user.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"message_reactions"},()=>{
        clearTimeout(reactionTimer);reactionTimer=setTimeout(()=>loadReactions().catch(()=>{}),180);
      }).subscribe();
  }
  const oldRender=window.renderMessages;
  if(typeof oldRender==="function"){
    window.renderMessages=function(){oldRender();setTimeout(()=>loadReactions().catch(()=>{}),0);};
  }
  S.db.auth.onAuthStateChange((event,session)=>{
    watchReactions();
    if(event==="SIGNED_OUT"){document.querySelectorAll(".reaction-bar,.reaction-picker").forEach(n=>n.remove());}
  });
  const oldSelect=window.selectChannel;
  if(typeof oldSelect==="function")window.selectChannel=async function(id){const r=await oldSelect(id);await loadReactions();return r;};
  setupEmoji();setupSearch();
  S.db.auth.getSession().then(({data})=>{if(data?.session?.user)watchReactions();});
})();