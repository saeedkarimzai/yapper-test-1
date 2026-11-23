// YAPPER live typing indicators. Uses Supabase Broadcast; no database migration required.
(function () {
  if (typeof S === "undefined" || !S.db) return;
  const input = document.getElementById("message-input");
  const form = document.getElementById("message-form");
  const indicator = document.getElementById("typing-indicator");
  if (!input || !form || !indicator) return;

  let channel = null;
  let activeChannelId = null;
  let sendTimer = null;
  let lastSent = 0;
  let generation = 0;
  const typingUsers = new Map();

  function paint() {
    const names = [...typingUsers.values()].map(x => x.username).filter(Boolean);
    indicator.textContent = names.length === 0 ? "" :
      names.length === 1 ? names[0] + " is typing…" :
      names.length === 2 ? names[0] + " and " + names[1] + " are typing…" :
      names.length + " people are typing…";
    indicator.classList.toggle("visible", names.length > 0);
  }

  function clearTyping() {
    typingUsers.clear();
    paint();
  }

  function stopChannel() {
    generation++;
    if (channel) S.db.removeChannel(channel);
    channel = null;
    activeChannelId = null;
    clearTimeout(sendTimer);
    clearTyping();
  }

  async function joinChannel(id) {
    if (!id || !S.user) { stopChannel(); return; }
    if (activeChannelId === id && channel) return;
    stopChannel();
    const myGeneration = generation;
    activeChannelId = id;
    const topic = "yapper-typing-" + id;
    const next = S.db.channel(topic, { config: { broadcast: { self: false } } });
    channel = next;
    next.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (myGeneration !== generation || !payload || payload.user_id === S.user?.id) return;
      const userId = String(payload.user_id || "");
      const username = String(payload.username || "Someone").slice(0, 24);
      if (!userId) return;
      if (payload.active === false) typingUsers.delete(userId);
      else {
        const old = typingUsers.get(userId);
        if (old?.timer) clearTimeout(old.timer);
        const timer = setTimeout(() => { typingUsers.delete(userId); paint(); }, 2200);
        typingUsers.set(userId, { username, timer });
      }
      paint();
    });
    next.subscribe();
  }

  async function broadcast(active) {
    if (!channel || !S.user || !S.profile) return;
    try {
      await channel.send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: S.user.id, username: S.profile.username, active }
      });
    } catch (_) {}
  }

  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      clearTimeout(sendTimer);
      broadcast(false);
      return;
    }
    const now = Date.now();
    if (now - lastSent > 700) {
      lastSent = now;
      broadcast(true);
    }
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => broadcast(false), 1500);
  });

  form.addEventListener("submit", () => {
    clearTimeout(sendTimer);
    broadcast(false);
  });

  const originalSelectChannel = window.selectChannel;
  if (typeof originalSelectChannel === "function") {
    window.selectChannel = async function (id) {
      const result = await originalSelectChannel(id);
      await joinChannel(id);
      return result;
    };
  }

  S.db.auth.onAuthStateChange((event, session) => {
    if (!session?.user) stopChannel();
    else if (S.channel?.id) joinChannel(S.channel.id);
  });
  S.db.auth.getSession().then(({ data }) => {
    if (data?.session?.user && S.channel?.id) joinChannel(S.channel.id);
  });
  window.addEventListener("beforeunload", () => {
    if (channel) S.db.removeChannel(channel);
  });
})();
