// YAPPER private-message typing indicator. Broadcast-only; no database migration.
(function () {
  if (typeof S === "undefined" || !S.db) return;
  const input = document.getElementById("dm-message-input");
  const form = document.getElementById("dm-message-form");
  const indicator = document.getElementById("dm-typing-indicator");
  if (!input || !form || !indicator) return;

  let channel = null, peerId = null, peerName = "", timer = null, lastSent = 0, generation = 0;
  let peerTypingTimer = null;

  function paint(active) {
    indicator.textContent = active ? "@" + peerName + " is typing…" : "";
    indicator.classList.toggle("visible", !!active);
  }
  function leave() {
    generation++;
    clearTimeout(timer);
    clearTimeout(peerTypingTimer);
    if (channel) S.db.removeChannel(channel);
    channel = null;
    peerId = null;
    peerName = "";
    paint(false);
  }
  async function join(id, name) {
    leave();
    if (!id || !S.user) return;
    peerId = id;
    peerName = String(name || "Friend").slice(0, 24);
    const mine = S.user.id;
    const pair = [mine, id].sort().join("-");
    const current = generation;
    const next = S.db.channel("yapper-dm-typing-" + pair, { config: { broadcast: { self: false } } });
    channel = next;
    next.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (current !== generation || !payload || payload.user_id !== peerId) return;
      const active = payload.active !== false;
      clearTimeout(peerTypingTimer);
      paint(active);
      if (active) peerTypingTimer = setTimeout(() => paint(false), 2200);
    });
    next.subscribe();
  }
  async function send(active) {
    if (!channel || !S.user || !S.profile) return;
    try {
      await channel.send({ type: "broadcast", event: "typing", payload: {
        user_id: S.user.id, username: S.profile.username, active
      }});
    } catch (_) {}
  }
  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      clearTimeout(timer);
      send(false);
      return;
    }
    const now = Date.now();
    if (now - lastSent > 700) { lastSent = now; send(true); }
    clearTimeout(timer);
    timer = setTimeout(() => send(false), 1500);
  });
  form.addEventListener("submit", () => { clearTimeout(timer); send(false); });
  window.yapperDmTypingJoin = join;
  window.yapperDmTypingLeave = leave;
  S.db.auth.onAuthStateChange((event, session) => { if (!session?.user) leave(); });
})();
