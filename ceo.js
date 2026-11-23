/* CEO-only YAPPER dashboard. Access is checked against admin_users in Supabase. */
(()=>{
 const $=id=>document.getElementById(id), state={enabled:false,busy:false};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const say=(s,bad=false)=>{const e=$("ceo-feedback");if(e){e.textContent=s;e.classList.toggle("error",bad)}};
 async function check(){
  if(!window.S?.db||!S.user){state.enabled=false;$("open-ceo")?.classList.add("hidden");return}
  const {data,error}=await S.db.from("admin_users").select("user_id").eq("user_id",S.user.id).maybeSingle();
  state.enabled=!error&&!!data;
  $("open-ceo")?.classList.toggle("hidden",!state.enabled);
 }
 async function count(table){const {count,error}=await S.db.from(table).select("*",{count:"exact",head:true});if(error)throw error;return count||0}
 async function load(){
  if(!state.enabled||state.busy)return;state.busy=true;say("Loading overview…");
  try{
   const values=await Promise.all(["profiles","servers","messages","friendships"].map(count));
   $("ceo-stats").innerHTML=["Users","Servers","Messages","Friend links"].map((n,i)=>'<div class="ceo-stat"><small>'+n+'</small><b>'+values[i].toLocaleString()+'</b></div>').join("");
   const [p,s,a]=await Promise.all([
    S.db.from("profiles").select("id,username").order("username").limit(100),
    S.db.from("servers").select("id,name,owner_id,created_at").order("created_at",{ascending:false}).limit(50),
    S.db.from("announcements").select("id,title,body,created_at").order("created_at",{ascending:false}).limit(20)
   ]);
   if(p.error)throw p.error;if(s.error)throw s.error;if(a.error)throw a.error;
   $("ceo-users").innerHTML=(p.data||[]).map(x=>'<div class="ceo-row"><b>'+esc(x.username)+'</b><small>'+esc(x.id)+'</small></div>').join("")||"No users yet.";
   $("ceo-servers").innerHTML=(s.data||[]).map(x=>'<div class="ceo-row"><b>'+esc(x.name)+'</b><small>Owner: '+esc(x.owner_id)+'</small></div>').join("")||"No servers yet.";
   $("ceo-announcements").innerHTML=(a.data||[]).map(x=>'<article class="ceo-announcement"><b>'+esc(x.title)+'</b><p>'+esc(x.body)+'</p><small>'+new Date(x.created_at).toLocaleString()+'</small> <button class="ceo-delete" data-ceo-delete="'+esc(x.id)+'">Delete</button></article>').join("")||"No announcements yet.";
   say("CEO access verified. Overview refreshed.");
  }catch(e){say(e.message||String(e),true)}finally{state.busy=false}
 }
 document.addEventListener("click",async e=>{
  if(e.target.closest("#open-ceo")){if(!state.enabled)return;$("ceo-modal").showModal();load()}
  if(e.target.closest("#ceo-refresh"))load();
  const b=e.target.closest("[data-ceo-delete]");
  if(b&&confirm("Delete this announcement?")){const {error}=await S.db.from("announcements").delete().eq("id",b.dataset.ceoDelete);if(error)say(error.message,true);else load()}
 });
 $("ceo-announcement-form")?.addEventListener("submit",async e=>{
  e.preventDefault();if(!state.enabled)return;
  const button=$("ceo-publish");button.disabled=true;
  try{
   const {error}=await S.db.from("announcements").insert({title:$("ceo-title").value.trim(),body:$("ceo-body").value.trim(),created_by:S.user.id});
   if(error)throw error;$("ceo-title").value="";$("ceo-body").value="";await load();say("Announcement published.");
  }catch(error){say(error.message||String(error),true)}finally{button.disabled=false}
 });
 const wait=setInterval(()=>{if(window.S?.db){clearInterval(wait);check();S.db.auth.onAuthStateChange(()=>setTimeout(check,0))}},200);
 window.yapperCheckCEO=check;
})();