// YAPPER Fun Hub: quick games and conversation starters. No backend or extra setup.
(()=>{
 const actions=document.querySelector(".chat-head-actions");
 if(!actions||document.getElementById("open-fun-hub"))return;
 const button=document.createElement("button");
 button.id="open-fun-hub";button.type="button";button.className="search-toggle";button.textContent="🎲 Fun";button.title="Open the YAPPER Fun Hub";
 actions.insertBefore(button,actions.firstChild);
 const style=document.createElement("style");
 style.textContent=`
 #fun-hub{width:min(94vw,560px);max-height:88vh;overflow:auto}
 .fun-intro{color:var(--muted);font-size:12px}
 .fun-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
 .fun-game{border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:12px;padding:13px 8px;font-weight:700}
 .fun-game.active{border-color:var(--purple);background:#302747}
 .fun-stage{min-height:150px;display:grid;place-items:center;text-align:center;padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
 .fun-result{font:700 25px 'Space Grotesk',sans-serif}
 .fun-sub{font-size:11px;color:var(--muted);margin-top:8px}
 .fun-controls{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px}
 .fun-controls button{border:1px solid var(--line);border-radius:9px;background:#29243b;color:white;padding:10px 14px;font-weight:700}
 @media(max-width:430px){.fun-grid{grid-template-columns:1fr}.fun-game{padding:9px}}
 `;
 document.head.append(style);
 const dialog=document.createElement("dialog");dialog.id="fun-hub";
 dialog.innerHTML=`
 <form method="dialog" class="close"><button aria-label="Close">✕</button></form>
 <small>YAPPER ARCADE</small><h2>🎲 Fun Hub</h2>
 <p class="fun-intro">Tiny games for when the chat needs a little chaos.</p>
 <div class="fun-grid">
  <button class="fun-game active" data-game="ice">💬 Icebreakers</button>
  <button class="fun-game" data-game="coin">🪙 Coin flip</button>
  <button class="fun-game" data-game="eight">🔮 8-ball</button>
 </div>
 <div class="fun-stage" aria-live="polite"><div><div class="fun-result" id="fun-result">Would you rather explore space or the deep ocean?</div><div class="fun-sub" id="fun-sub">Conversation starter</div></div></div>
 <div class="fun-controls"><button type="button" id="fun-roll">🎲 Roll again</button><button type="button" id="fun-use">Use in chat</button></div>
 <div class="modal-actions"><button type="button" id="fun-close">Done</button></div>`;
 document.body.append(dialog);
 const prompts=["Would you rather explore space or the deep ocean?","What's a game you could play for 100 hours?","If you could instantly master one skill, what would it be?","What's the most random thing you're good at?","Which fictional world would you live in?","What's a food you could eat every day?","What's one tiny thing that makes your day better?","If your life had a loading screen tip, what would it say?","What's a hill you'll defend forever?","Would you rather time travel to the past or future?","What's the funniest username you've seen?","If you could add one feature to YAPPER, what would it be?"];
 const answers=["It is certain.","Ask again after snacks.","Absolutely not. 💀","The signs point to yes.","My sources say maybe.","Without a doubt.","Try again, human.","Probably. Don't quote me.","Outlook unclear.","100% YES."];
 let game="ice",current=prompts[0];
 const result=dialog.querySelector("#fun-result"),sub=dialog.querySelector("#fun-sub"),roll=dialog.querySelector("#fun-roll"),use=dialog.querySelector("#fun-use");
 function pick(){
  if(game==="ice"){current=prompts[Math.floor(Math.random()*prompts.length)];result.textContent=current;sub.textContent="Conversation starter";use.hidden=false;roll.textContent="🎲 Another question";}
  if(game==="coin"){current=Math.random()<.5?"🪙 HEADS":"🪙 TAILS";result.textContent=current;sub.textContent="The coin has spoken.";use.hidden=true;roll.textContent="Flip again";}
  if(game==="eight"){current=answers[Math.floor(Math.random()*answers.length)];result.textContent=current;sub.textContent="The YAPPER 8-ball knows all. Allegedly.";use.hidden=false;roll.textContent="Ask again";}
 }
 dialog.querySelectorAll("[data-game]").forEach(b=>b.addEventListener("click",()=>{game=b.dataset.game;dialog.querySelectorAll("[data-game]").forEach(x=>x.classList.toggle("active",x===b));pick()}));
 roll.addEventListener("click",pick);
 use.addEventListener("click",()=>{
  const input=document.getElementById("message-input");
  if(!input||input.disabled){result.textContent="Pick a channel first!";sub.textContent="Then you can use this in chat.";return}
  input.value=(game==="eight"?"🔮 "+current:current);input.focus();dialog.close();
 });
 button.addEventListener("click",()=>{game="ice";dialog.querySelectorAll("[data-game]").forEach(x=>x.classList.toggle("active",x.dataset.game==="ice"));pick();dialog.showModal()});
 dialog.querySelector("#fun-close").addEventListener("click",()=>dialog.close());
})();