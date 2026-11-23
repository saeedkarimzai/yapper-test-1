import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:cors});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return out(405,{error:"POST only"});
 try{
  const url=Deno.env.get("SUPABASE_URL")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const authorization=req.headers.get("Authorization");if(!authorization)return out(401,{error:"Sign in first."});
  const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:auth,error:authErr}=await caller.auth.getUser();if(authErr||!auth.user)return out(401,{error:"Invalid session."});
  const {action,server_id,channel_id,content}=await req.json();if(typeof server_id!=="string")return out(400,{error:"Select a server."});
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:member,error:memberErr}=await admin.from("server_members").select("server_id").eq("server_id",server_id).eq("user_id",auth.user.id).maybeSingle();
  if(memberErr)throw memberErr;if(!member)return out(403,{error:"You are not a member of this server."});
  const email="yapper-test-bot@bot.yapper.invalid";
  const list=await admin.auth.admin.listUsers({page:1,perPage:1000});if(list.error)throw list.error;
  let bot=list.data.users.find(u=>u.email===email);
  if(!bot){const made=await admin.auth.admin.createUser({email,password:crypto.randomUUID()+"Aa9!",email_confirm:true,user_metadata:{username:"yapper_test_bot",is_test_bot:true}});if(made.error)throw made.error;bot=made.data.user;}
  if(!bot)throw new Error("Could not create test bot account.");
  const profile=await admin.from("profiles").upsert({id:bot.id,username:"yapper_test_bot",avatar_url:null},{onConflict:"id"});if(profile.error)throw profile.error;
  const bm=await admin.from("server_members").select("server_id").eq("server_id",server_id).eq("user_id",bot.id).maybeSingle();if(bm.error)throw bm.error;
  if(!bm.data){const add=await admin.from("server_members").insert({server_id,user_id:bot.id,role:"member"});if(add.error)throw add.error;}
  const send=async(text:string,target:string)=>{const r=await admin.from("messages").insert({channel_id:target,user_id:bot!.id,content:text});if(r.error)throw r.error;};
  if(action==="join"){if(!channel_id)return out(400,{error:"Select a channel."});await send("🤖 YAPPER Test Bot is online! Mention @yapper_test_bot or type !testbot help. I can reply to commands and run message-delivery tests.",channel_id);return out(200,{ok:true,username:"yapper_test_bot"});}
  if(action==="message"){
   if(!channel_id||typeof content!=="string")return out(400,{error:"Missing channel or message."});
   const m=content.toLowerCase();let answer="Beep boop! I’m here. Type !testbot help to see my commands.";
   if(m.includes("!testbot help"))answer="🤖 Test Bot commands: !testbot ping checks replies; !testbot test sends three live test messages; !testbot help shows this guide. You can also mention @yapper_test_bot.";
   else if(m.includes("!testbot ping"))answer="🏓 Pong! I received your message and sent this reply through Supabase.";
   else if(m.includes("!testbot test")){await send("🧪 Test 1/3: message insert is working.",channel_id);await new Promise(r=>setTimeout(r,450));await send("🧪 Test 2/3: multiple messages are being delivered.",channel_id);await new Promise(r=>setTimeout(r,450));await send("✅ Test 3/3: sequence complete. Check that all three appeared live.",channel_id);return out(200,{ok:true,username:"yapper_test_bot"});}
   else if(m.includes("hello")||m.includes("hi"))answer="Hey! 🤖 Try !testbot ping or !testbot test.";
   await send(answer,channel_id);return out(200,{ok:true,username:"yapper_test_bot"});
  }
  return out(400,{error:"Unknown action."});
 }catch(e){console.error("yapper-test-bot",e);return out(500,{error:e instanceof Error?e.message:"Test bot failed."});}
});