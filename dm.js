// YAPPER private direct messages for accepted friends.
(function(){
  if(typeof S==="undefined"||!S.db)return;
  const $d=id=>document.getElementById(id);
  let userId=null, peerId=null, peerName="", sub=null;
  function note(text,bad=false){const el=$d("social-feedback");if(el){el.textContent=text;el.classList.toggle("error",bad);}}
  async function render(rows,append=false){
    const root=$d("dm-messages");if(!append)root.replaceChildren();
    const ids=[...new Set(rows.flatMap(m=>[m.sender_id,m.recipient_id]))];
    let names={};
    if(ids.length){const p=await S.db.from("profiles").select("id,username").in("id",ids);if(!p.error)(p.data||[]).forEach(x=>names[x.id]=x.username);}
    for(const m of rows){
      if(root.querySelector('[data-id="'+m.id+'"]'))continue;
      const article=document.createElement("article");article.className="social-message";article.dataset.id=m.id;
      const meta=document.createElement("div");meta.className="social-message-meta";
      const author=document.createElement("b");author.textContent=m.sender_id===userId?"You":(names[m.sender_id]||"Friend");
      const time=document.createElement("time");time.textContent=new Date(m.created_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
      const body=document.createElement("p");body.textContent=m.content;
      meta.append(author,time);article.append(meta,body);root.append(article);
    }
    root.scrollTop=root.scrollHeight;
  }
  async function openChat(e){
    e.preventDefault();
    if(!userId)return note("Sign in first.",true);
    const username=$d("dm-username").value.trim().toLowerCase();
    if(!/^[a-z0-9_]{2,24}$/.test(username))return note("Enter a valid username.",true);
    $d("dm-open-button").disabled=true;
    try{
      const t=await S.db.from("profiles").select("id,username").eq("username",username).maybeSingle();
      if(t.error)throw t.error;if(!t.data)throw Error("No YAPPER user has that username.");
      if(t.data.id===userId)throw Error("You can't DM yourself.");
      const f=await S.db.from("friendships").select("id").eq("status","accepted").or("and(requester_id.eq."+userId+",addressee_id.eq."+t.data.id+"),and(requester_id.eq."+t.data.id+",addressee_id.eq."+userId+")").maybeSingle();
      if(f.error)throw f.error;if(!f.data)throw Error("You can DM accepted friends only.");
      peerId=t.data.id;peerName=t.data.username;$d("dm-active-title").textContent="Chat with @"+peerName;
      $d("dm-message-input").disabled=false;$d("dm-send").disabled=false;
      if(sub){S.db.removeChannel(sub);sub=null;}
      const filter="and(sender_id.eq."+userId+",recipient_id.eq."+peerId+"),and(sender_id.eq."+peerId+",recipient_id.eq."+userId+")";
      const r=await S.db.from("direct_messages").select("id,sender_id,recipient_id,content,created_at").or(filter).order("created_at",{ascending:true}).limit(100);
      if(r.error)throw r.error;await render(r.data||[]);
      const accept=m=>{if(peerId&&(m.sender_id===peerId||m.recipient_id===peerId))render([m],true).catch(x=>note(x.message||String(x),true));};
      sub=S.db.channel("yapper-dm-"+userId+"-"+peerId+"-"+Date.now())
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"sender_id=eq."+userId},p=>accept(p.new))
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"recipient_id=eq."+userId},p=>accept(p.new))
        .subscribe();
      note("Private chat opened with @"+peerName+".");
    }catch(x){note(x.message||String(x),true)}
    finally{$d("dm-open-button").disabled=false;}
  }
  $d("dm-open-form").addEventListener("submit",openChat);
  $d("dm-message-form").addEventListener("submit",async e=>{
    e.preventDefault();const content=$d("dm-message-input").value.trim();if(!content||!peerId||!userId)return;
    $d("dm-send").disabled=true;
    try{const r=await S.db.from("direct_messages").insert({sender_id:userId,recipient_id:peerId,content}).select("id,sender_id,recipient_id,content,created_at").single();if(r.error)throw r.error;await render([r.data],true);$d("dm-message-input").value="";}
    catch(x){note(x.message||String(x),true)}
    finally{$d("dm-send").disabled=!peerId;$d("dm-message-input").focus();}
  });
  function setUser(id){userId=id;if(sub){S.db.removeChannel(sub);sub=null;}if(!id){peerId=null;peerName="";$d("dm-messages").replaceChildren();$d("dm-active-title").textContent="No direct message selected";$d("dm-message-input").disabled=true;$d("dm-send").disabled=true;}}
  S.db.auth.onAuthStateChange((event,session)=>{setUser(session?.user?.id||null);});
  S.db.auth.getSession().then(({data})=>setUser(data?.session?.user?.id||null));
})();