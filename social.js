// YAPPER group chats + one-to-one voice calls. Requires the group/voice SQL migration.
(function () {
  if (typeof S === "undefined" || !S.db) return;
  const $s = id => document.getElementById(id);
  let activeGroup = null, groupSub = null, membershipSub = null, signalSub = null, currentUserId = null;
  let pc = null, localStream = null, callPeer = null, callRoom = null, pendingOffer = null;
  let pendingCandidates = [], orphanCandidates = [];
  const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun.cloudflare.com:3478" }] };

  function message(text, bad=false) {
    const el=$s("social-feedback"); if(el){el.textContent=text;el.classList.toggle("error",bad);}
    if (typeof toast === "function" && bad) toast(text);
  }
  function err(e){return e?.message || String(e);}
  function initials(s){return (s||"Y").trim().slice(0,1).toUpperCase()||"Y";}
  function safeText(el, value){el.textContent=value==null?"":String(value);}
  function rowButton(label, action, cls="social-action") {
    const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.onclick=action;return b;
  }
  function showSocial(){ $s("social-modal").showModal(); loadGroups().catch(e=>message("Group chats: "+err(e),true)); }
  $s("open-social").addEventListener("click",showSocial);
  $s("open-social-mobile").addEventListener("click",showSocial);
  $s("social-close").addEventListener("click",()=>$s("social-modal").close());

  async function loadGroups(){
    if(!currentUserId)return;
    const {data:members,error}=await S.db.from("group_chat_members").select("group_id").eq("user_id",currentUserId);
    if(error)throw error;
    const ids=(members||[]).map(x=>x.group_id);
    const root=$s("group-list");root.replaceChildren();
    if(!ids.length){const p=document.createElement("p");p.className="muted";p.textContent="No group chats yet. Make one below.";root.append(p);return;}
    const {data:groups,error:groupError}=await S.db.from("group_chats").select("id,name,owner_id,created_at").in("id",ids).order("created_at",{ascending:false});
    if(groupError)throw groupError;
    (groups||[]).forEach(g=>{
      const b=rowButton("✦ "+g.name,()=>selectGroup(g),"group-choice"+(activeGroup?.id===g.id?" active":""));
      root.append(b);
    });
    if(activeGroup && !ids.includes(activeGroup.id)){activeGroup=null;clearGroupChat();}
    else if(!activeGroup && groups?.length) await selectGroup(groups[0]);
  }
  function clearGroupChat(){
    if(groupSub){S.db.removeChannel(groupSub);groupSub=null;}
    $s("active-group-title").textContent="Choose a group";
    $s("group-chat-messages").replaceChildren();
    $s("group-message-input").disabled=true;$s("group-send").disabled=true;
    $s("group-members").textContent="";
  }
  async function selectGroup(group){
    activeGroup=group;
    if(groupSub){const old=groupSub;groupSub=null;await S.db.removeChannel(old);}
    $s("active-group-title").textContent=group.name;
    $s("group-chat-messages").replaceChildren();
    $s("group-message-input").disabled=false;$s("group-send").disabled=false;
    const {data:members,error:me}=await S.db.from("group_chat_members").select("user_id").eq("group_id",group.id);
    if(me)throw me;
    const ids=(members||[]).map(m=>m.user_id);
    let names=[];
    if(ids.length){const r=await S.db.from("profiles").select("id,username").in("id",ids);if(!r.error)names=(r.data||[]).map(p=>p.username);}
    safeText($s("group-members"),names.length?names.join(" · "):"Members");
    const {data,error}=await S.db.from("group_chat_messages").select("id,group_id,user_id,content,created_at").eq("group_id",group.id).order("created_at",{ascending:true}).limit(100);
    if(error)throw error;
    await renderGroupMessages(data||[]);
    groupSub=S.db.channel("yapper-group-"+group.id+"-"+Date.now())
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"group_chat_messages",filter:"group_id=eq."+group.id},async payload=>{
        if(activeGroup?.id!==group.id)return;
        if(!$s("group-chat-messages").querySelector('[data-id="'+payload.new.id+'"]')) await renderGroupMessages([payload.new],true);
      }).subscribe();
    [...$s("group-list").children].forEach(b=>b.classList.toggle("active",b.textContent.includes(group.name)));
  }
  async function renderGroupMessages(messages, append=false){
    const root=$s("group-chat-messages");
    if(!append)root.replaceChildren();
    const ids=[...new Set(messages.map(m=>m.user_id))];
    let profileMap={};
    if(ids.length){const r=await S.db.from("profiles").select("id,username,avatar_url").in("id",ids);if(!r.error)(r.data||[]).forEach(p=>profileMap[p.id]=p);}
    for(const m of messages){
      if(root.querySelector('[data-id="'+m.id+'"]'))continue;
      const article=document.createElement("article");article.className="social-message";article.dataset.id=m.id;
      const who=document.createElement("b");who.textContent=profileMap[m.user_id]?.username||(m.user_id===currentUserId?"You":"Yapper");
      const time=document.createElement("time");time.textContent=new Date(m.created_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
      const body=document.createElement("p");body.textContent=m.content;
      const meta=document.createElement("div");meta.className="social-message-meta";meta.append(who,time);
      article.append(meta,body);root.append(article);
    }
    root.scrollTop=root.scrollHeight;
  }
  $s("group-message-form").addEventListener("submit",async e=>{
    e.preventDefault();const input=$s("group-message-input"),content=input.value.trim();
    if(!content||!activeGroup||!currentUserId)return;
    $s("group-send").disabled=true;
    try{
      const {data,error}=await S.db.from("group_chat_messages").insert({group_id:activeGroup.id,user_id:currentUserId,content}).select("id,group_id,user_id,content,created_at").single();
      if(error)throw error;await renderGroupMessages([data],true);input.value="";
    }catch(ex){message(err(ex),true)}finally{$s("group-send").disabled=!activeGroup;input.focus();}
  });
  $s("group-create-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!currentUserId)return message("Sign in first.",true);
    const name=$s("group-name-input").value.trim().slice(0,60);
    const usernames=[...new Set($s("group-invite-input").value.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean))];
    if(!name)return message("Give your group a name.",true);
    $s("group-create-submit").disabled=true;
    try{
      const created=await S.db.from("group_chats").insert({name,owner_id:currentUserId}).select("id,name,owner_id,created_at").single();
      if(created.error)throw created.error;
      const group=created.data;
      const self=await S.db.from("group_chat_members").insert({group_id:group.id,user_id:currentUserId});
      if(self.error)throw self.error;
      let invited=0, skipped=[];
      if(usernames.length){
        const lookup=await S.db.from("profiles").select("id,username").in("username",usernames);
        if(lookup.error)throw lookup.error;
        const byName=new Map((lookup.data||[]).map(p=>[p.username,p.id]));
        const targets=usernames.map(n=>({name:n,id:byName.get(n)}));
        const friendships=await S.db.from("friendships").select("requester_id,addressee_id,status").eq("status","accepted").or("requester_id.eq."+currentUserId+",addressee_id.eq."+currentUserId);
        if(friendships.error)throw friendships.error;
        const friendIds=new Set((friendships.data||[]).map(f=>f.requester_id===currentUserId?f.addressee_id:f.requester_id));
        const valid=[];
        for(const t of targets){if(t.id&&t.id!==currentUserId&&friendIds.has(t.id))valid.push({group_id:group.id,user_id:t.id});else skipped.push(t.name);}
        if(valid.length){const ins=await S.db.from("group_chat_members").insert(valid);if(ins.error)throw ins.error;invited=valid.length;}
      }
      $s("group-name-input").value="";$s("group-invite-input").value="";
      await loadGroups();await selectGroup(group);
      message("Group created! Added "+invited+" friend"+(invited===1?"":"s")+(skipped.length?"; couldn't add: "+skipped.join(", "):"."));
    }catch(ex){message("Couldn't create group: "+err(ex),true)}
    finally{$s("group-create-submit").disabled=false;}
  });

  async function insertSignal(room, recipient, signal){
    const {error}=await S.db.from("voice_signals").insert({room_id:room,sender_id:currentUserId,recipient_id:recipient,signal});
    if(error)throw error;
  }
  async function setupPeer(peerId,roomId){
    pc=new RTCPeerConnection(rtcConfig);callPeer=peerId;callRoom=roomId;pendingCandidates=orphanCandidates.filter(x=>x.room_id===roomId&&x.sender_id===peerId).map(x=>x.signal.candidate);orphanCandidates=orphanCandidates.filter(x=>x.room_id!==roomId||x.sender_id!==peerId);
    pc.onicecandidate=e=>{if(e.candidate&&callRoom&&callPeer)insertSignal(callRoom,callPeer,{type:"ice",candidate:e.candidate.toJSON()}).catch(ex=>message("Voice connection: "+err(ex),true));};
    pc.ontrack=e=>{const audio=$s("remote-audio");audio.srcObject=e.streams[0];audio.play().catch(()=>{});$s("voice-status").textContent="Connected — voice is live 🎙️";};
    pc.onconnectionstatechange=()=>{if(pc && ["failed","disconnected","closed"].includes(pc.connectionState)&&pc.connectionState!=="closed")$s("voice-status").textContent="Connection lost. Try calling again.";};
    localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
    localStream.getTracks().forEach(track=>pc.addTrack(track,localStream));
    $s("voice-mute").disabled=false;$s("voice-hangup").disabled=false;$s("voice-mute").textContent="Mute mic";
  }
  async function flushCandidates(){
    if(!pc?.remoteDescription)return;
    const queue=pendingCandidates.splice(0);
    for(const candidate of queue){try{await pc.addIceCandidate(candidate)}catch(e){console.warn("ICE candidate skipped",e)}}
  }
  async function handleSignal(row){
    const sig=row.signal||{};
    if(sig.type==="offer"){
      if(pc||pendingOffer)return;
      pendingOffer=row;
      const r=await S.db.from("profiles").select("username").eq("id",row.sender_id).maybeSingle();
      const name=r.data?.username||"A friend";
      $s("voice-status").textContent=name+" is calling you.";
      $s("voice-accept").classList.remove("hidden");
      $s("voice-accept").textContent="Accept call from @"+name;
      $s("voice-accept").disabled=false;
      $s("voice-accept").dataset.name=name;
      return;
    }
    if(!pc||row.room_id!==callRoom||row.sender_id!==callPeer)return;
    if(sig.type==="answer"){
      await pc.setRemoteDescription({type:"answer",sdp:sig.sdp});await flushCandidates();
    }else if(sig.type==="ice"&&sig.candidate){
      if(pc.remoteDescription)await pc.addIceCandidate(sig.candidate);
      else pendingCandidates.push(sig.candidate);
    }else if(sig.type==="hangup"){hangup(false);}
  }
  async function startCall(){
    if(!currentUserId)return message("Sign in first.",true);
    if(pc||pendingOffer)return message("Finish the current call first.",true);
    const username=$s("voice-username").value.trim().toLowerCase();
    if(!/^[a-z0-9_]{2,24}$/.test(username))return message("Enter your friend's exact username.",true);
    $s("voice-call").disabled=true;
    try{
      const lookup=await S.db.from("profiles").select("id,username").eq("username",username).maybeSingle();
      if(lookup.error)throw lookup.error;if(!lookup.data)throw Error("No YAPPER user has that username.");
      if(lookup.data.id===currentUserId)throw Error("You can't call yourself.");
      const f=await S.db.from("friendships").select("status").eq("status","accepted").or("and(requester_id.eq."+currentUserId+",addressee_id.eq."+lookup.data.id+"),and(requester_id.eq."+lookup.data.id+",addressee_id.eq."+currentUserId+")").maybeSingle();
      if(f.error)throw f.error;if(!f.data)throw Error("You can voice-call accepted friends only.");
      const room=crypto.randomUUID?crypto.randomUUID():"call-"+Date.now()+"-"+Math.random().toString(36).slice(2);
      await setupPeer(lookup.data.id,room);
      const offer=await pc.createOffer();await pc.setLocalDescription(offer);
      await insertSignal(room,lookup.data.id,{type:"offer",sdp:pc.localDescription.sdp});
      $s("voice-status").textContent="Calling @"+lookup.data.username+"… Keep YAPPER open on both devices.";
      $s("voice-accept").classList.add("hidden");
    }catch(ex){await hangup(false);message("Couldn't start call: "+err(ex),true)}
    finally{$s("voice-call").disabled=false;}
  }
  async function acceptCall(){
    if(!pendingOffer)return;
    const row=pendingOffer;pendingOffer=null;$s("voice-accept").classList.add("hidden");
    try{
      await setupPeer(row.sender_id,row.room_id);
      await pc.setRemoteDescription({type:"offer",sdp:row.signal.sdp});await flushCandidates();
      const answer=await pc.createAnswer();await pc.setLocalDescription(answer);
      await insertSignal(row.room_id,row.sender_id,{type:"answer",sdp:pc.localDescription.sdp});
      $s("voice-status").textContent="Connecting audio…";
    }catch(ex){message("Couldn't accept call: "+err(ex),true);await hangup(false);}
  }
  async function hangup(send=true){
    const peer=callPeer,room=callRoom;
    if(send&&peer&&room){insertSignal(room,peer,{type:"hangup"}).catch(()=>{});}
    if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}
    if(pc){pc.ontrack=null;pc.onicecandidate=null;pc.close();pc=null;}
    $s("remote-audio").srcObject=null;
    $s("voice-mute").disabled=true;$s("voice-mute").textContent="Mute mic";$s("voice-hangup").disabled=true;
    $s("voice-status").textContent="Not in a call.";
    callPeer=null;callRoom=null;pendingOffer=null;pendingCandidates=[];
    $s("voice-accept").classList.add("hidden");
    if(room)S.db.from("voice_signals").delete().eq("room_id",room).then(()=>{}).catch(()=>{});
  }
  $s("voice-call").addEventListener("click",startCall);
  $s("voice-accept").addEventListener("click",acceptCall);
  $s("voice-hangup").addEventListener("click",()=>hangup(true));
  $s("voice-mute").addEventListener("click",()=>{
    if(!localStream)return;
    const tracks=localStream.getAudioTracks(),muted=tracks.every(t=>!t.enabled);
    tracks.forEach(t=>t.enabled=muted);
    $s("voice-mute").textContent=muted?"Mute mic":"Unmute mic";
  });
  function watchGroups(userId){\n    if(membershipSub){S.db.removeChannel(membershipSub);membershipSub=null;}\n    if(!userId)return;\n    membershipSub=S.db.channel("yapper-group-membership-"+userId)\n      .on("postgres_changes",{event:"*",schema:"public",table:"group_chat_members",filter:"user_id=eq."+userId},()=>loadGroups().catch(ex=>message(err(ex),true)))\n      .subscribe();\n  }\n  function watchSignals(userId){
    if(signalSub){S.db.removeChannel(signalSub);signalSub=null;}
    if(!userId)return;
    signalSub=S.db.channel("yapper-voice-signals-"+userId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"voice_signals",filter:"recipient_id=eq."+userId},payload=>{
        handleSignal(payload.new).catch(ex=>message("Voice signal: "+err(ex),true));
      }).subscribe();
  }
  S.db.auth.onAuthStateChange((event,session)=>{
    currentUserId=session?.user?.id||null;watchSignals(currentUserId);watchGroups(currentUserId);
    if(event==="SIGNED_OUT"){hangup(false);activeGroup=null;clearGroupChat();$s("group-list").replaceChildren();}
    else if(currentUserId)queueMicrotask(()=>loadGroups().catch(ex=>message(err(ex),true)));
  });
  S.db.auth.getSession().then(({data})=>{currentUserId=data?.session?.user?.id||null;watchSignals(currentUserId);watchGroups(currentUserId);if(currentUserId)loadGroups().catch(ex=>message(err(ex),true));});
  window.addEventListener("beforeunload",()=>{if(localStream)localStream.getTracks().forEach(t=>t.stop());if(pc)pc.close();});
})();