// YAPPER profiles, avatars, and online presence.
(function () {
  if (typeof S === "undefined" || !S.db) return;
  S.profiles = S.profiles || {};
  S.onlineIds = new Set();
  S.memberProfiles = [];
  S.profileLoading = new Set();
  S.profileLookedUp = S.profileLookedUp || new Set();
  S.profileBootUser = null;

  async function ensureProfile(user) {
    if (!user || S.profileBootUser === user.id) return;
    S.profileBootUser = user.id;
    S.user = user;
    try {
      let result = await S.db.from("profiles").select("id,username,avatar_url").eq("id", user.id).maybeSingle();
      if (result.error) throw result.error;
      let profile = result.data;
      if (!profile) {
        const base = (user.email || "yapper").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 14) || "yapper";
        profile = { id: user.id, username: base + "_" + user.id.slice(0, 6), avatar_url: null };
        const created = await S.db.from("profiles").insert(profile).select("id,username,avatar_url").single();
        if (created.error) throw created.error;
        profile = created.data;
      }
      S.profile = profile;
      S.profiles[profile.id] = profile;
      paintOwnProfile();
      startPresence();
      if (S.server) await loadMembers();
      if (S.messages && S.messages.length) await hydrateMessageProfiles();
      if (typeof renderMessages === "function") renderMessages();
    } catch (e) {
      toast("Profile loading: " + (e.message || e));
    }
  }

  function paintOwnProfile() {
    if (!S.profile) return;
    const name = document.getElementById("user-email");
    const avatar = document.getElementById("own-avatar");
    if (name) name.textContent = S.profile.username;
    if (avatar) {
      avatar.innerHTML = S.profile.avatar_url ? '<img src="' + esc(S.profile.avatar_url) + '" alt="">' : esc(initial(S.profile.username));
      avatar.classList.toggle("has-image", !!S.profile.avatar_url);
    }
    const preview = document.getElementById("profile-preview");
    if (preview && !document.getElementById("profile-modal").open) {
      preview.innerHTML = S.profile.avatar_url ? '<img src="' + esc(S.profile.avatar_url) + '" alt="">' : esc(initial(S.profile.username));
    }
  }

  function startPresence() {
    if (!S.profile || !S.user) return;
    if (S.presence) S.db.removeChannel(S.presence);
    S.presence = S.db.channel("yapper-global-presence", { config: { presence: { key: S.user.id } } });
    S.presence
      .on("presence", { event: "sync" }, () => {
        const state = S.presence.presenceState();
        S.onlineIds = new Set(Object.values(state).flat().map(p => p.user_id).filter(Boolean));
        renderMembers();
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await S.presence.track({
            user_id: S.user.id,
            username: S.profile.username,
            avatar_url: S.profile.avatar_url || null,
            online_at: new Date().toISOString()
          });
        }
      });
  }

  async function loadMembers() {
    if (!S.server) return;
    const result = await S.db.from("server_members").select("user_id").eq("server_id", S.server.id);
    if (result.error) throw result.error;
    const ids = (result.data || []).map(row => row.user_id);
    if (!ids.length) { S.memberProfiles = []; renderMembers(); return; }
    const profiles = await S.db.from("profiles").select("id,username,avatar_url").in("id", ids);
    if (profiles.error) throw profiles.error;
    S.memberProfiles = profiles.data || [];
    S.memberProfiles.forEach(p => { S.profiles[p.id] = p; });
    renderMembers();
  }

  function renderMembers() {
    const root = document.getElementById("member-list");
    if (!root) return;
    root.innerHTML = "";
    if (!S.server) { root.textContent = "Choose a server to see its members."; return; }
    if (!S.memberProfiles.length) { root.textContent = "No members yet."; return; }
    S.memberProfiles.slice().sort((a, b) =>
      Number(S.onlineIds.has(b.id)) - Number(S.onlineIds.has(a.id)) || a.username.localeCompare(b.username)
    ).forEach(profile => {
      const row = document.createElement("div");
      row.className = "member-row";
      const avatar = document.createElement("div");
      avatar.className = "member-avatar";
      if (profile.avatar_url) {
        const image = document.createElement("img");
        image.src = profile.avatar_url;
        image.alt = "";
        avatar.append(image);
      } else avatar.textContent = initial(profile.username);
      const info = document.createElement("div");
      info.className = "member-name";
      const username = document.createElement("b");
      username.textContent = profile.username;
      const status = document.createElement("small");
      const online = S.onlineIds.has(profile.id);
      status.textContent = online ? "Online" : "Offline";
      status.className = online ? "status-online" : "status-offline";
      const dot = document.createElement("i");
      dot.className = "presence-dot" + (online ? " online" : "");
      info.append(username, status);
      row.append(avatar, info, dot);
      root.append(row);
    });
  }

  async function hydrateMessageProfiles() {
    if (!S.messages) return;
    const ids = [...new Set(S.messages.map(m => m.user_id).filter(id => id && !S.profiles[id] && !S.profileLoading.has(id) && !S.profileLookedUp.has(id)))];
    if (!ids.length) return;
    ids.forEach(id => { S.profileLoading.add(id); S.profileLookedUp.add(id); });
    try {
      const result = await S.db.from("profiles").select("id,username,avatar_url").in("id", ids);
      if (!result.error) { (result.data || []).forEach(p => { S.profiles[p.id] = p; }); if ((result.data || []).length) queueMicrotask(() => window.renderMessages()); }
    } finally {
      ids.forEach(id => S.profileLoading.delete(id));
    }
  }

  // Replace the message renderer so usernames and avatars are shown consistently.
  window.renderMessages = function () {
    const root = document.getElementById("messages");
    if (!root) return;
    root.innerHTML = "";
    const empty = document.getElementById("empty");
    if (empty) empty.classList.toggle("hidden", !!(S.channel && S.messages.length));
    if (S.channel && !S.messages.length && empty) {
      empty.classList.remove("hidden");
      empty.querySelector("h2").textContent = "Welcome to #" + S.channel.name + ".";
      empty.querySelector("p").textContent = "Be the first to send a message.";
    }
    S.messages.forEach(message => {
      const profile = S.profiles[message.user_id];
      const name = profile?.username || (message.user_id === S.user?.id ? (S.profile?.username || "You") : "Yapper");
      const avatarUrl = profile?.avatar_url;
      const article = document.createElement("article");
      article.className = "message";
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      if (avatarUrl) {
        const image = document.createElement("img");
        image.src = avatarUrl;
        image.alt = "";
        avatar.append(image);
      } else avatar.textContent = initial(name);
      const body = document.createElement("div");
      body.className = "message-body";
      const meta = document.createElement("div");
      meta.className = "meta";
      const author = document.createElement("b");
      author.textContent = name;
      const time = document.createElement("time");
      time.textContent = new Date(message.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      const text = document.createElement("div");
      text.className = "message-text";
      text.textContent = message.content;
      meta.append(author, time);
      body.append(meta, text);
      article.append(avatar, body);
      root.append(article);
    });
    root.scrollTop = root.scrollHeight;
    hydrateMessageProfiles().then(() => {
      if (S.messages.some(m => !S.profiles[m.user_id])) return;
      // Re-render once profile data has been fetched.
      if (S.messages.some(m => S.profiles[m.user_id])) window.renderMessagesAgain = false;
    }).catch(() => {});
  };

  const originalSelectServer = window.selectServer;
  if (typeof originalSelectServer === "function") {
    window.selectServer = async function (id) {
      const result = await originalSelectServer(id);
      try { await loadMembers(); } catch (e) { toast("Members: " + (e.message || e)); }
      return result;
    };
  }
  const originalSelectChannel = window.selectChannel;
  if (typeof originalSelectChannel === "function") {
    window.selectChannel = async function (id) {
      const result = await originalSelectChannel(id);
      await hydrateMessageProfiles();
      window.renderMessages();
      return result;
    };
  }

  const editButton = document.getElementById("edit-profile");
  if (editButton) editButton.addEventListener("click", () => {
    if (!S.profile) return toast("Your profile is still loading.");
    document.getElementById("profile-username").value = S.profile.username;
    document.getElementById("profile-file").value = "";
    paintOwnProfile();
    document.getElementById("profile-modal").showModal();
  });

  document.getElementById("profile-cancel").addEventListener("click", () => document.getElementById("profile-modal").close());
  document.getElementById("profile-file").addEventListener("change", () => {
    const file = document.getElementById("profile-file").files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("Avatar must be 2 MB or smaller.");
      document.getElementById("profile-file").value = "";
      return;
    }
    const preview = document.getElementById("profile-preview");
    preview.innerHTML = "";
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.alt = "Avatar preview";
    preview.append(image);
  });

  document.getElementById("profile-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!S.user || !S.profile) return;
    const save = document.getElementById("profile-save");
    save.disabled = true;
    try {
      const username = document.getElementById("profile-username").value.trim().toLowerCase();
      if (!/^[a-z0-9_]{2,24}$/.test(username)) throw new Error("Username must be 2–24 letters, numbers, or underscores.");
      let avatarUrl = S.profile.avatar_url || null;
      const file = document.getElementById("profile-file").files[0];
      if (file) {
        const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type];
        if (!ext) throw new Error("Use PNG, JPG, WEBP, or GIF.");
        const path = S.user.id + "/avatar." + ext;
        const upload = await S.db.storage.from("yapper-avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
        if (upload.error) throw upload.error;
        avatarUrl = S.db.storage.from("yapper-avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
      }
      const updated = await S.db.from("profiles").update({ username, avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq("id", S.user.id).select("id,username,avatar_url").single();
      if (updated.error) throw updated.error;
      S.profile = updated.data;
      S.profiles[S.user.id] = updated.data;
      paintOwnProfile();
      if (S.presence) await S.presence.track({ user_id: S.user.id, username, avatar_url: avatarUrl, online_at: new Date().toISOString() });
      await loadMembers();
      window.renderMessages();
      document.getElementById("profile-modal").close();
      toast("Profile updated!");
    } catch (error) {
      toast(error.message || String(error));
    } finally {
      save.disabled = false;
    }
  });

  S.db.auth.onAuthStateChange((event, session) => {
    if (session?.user) queueMicrotask(() => ensureProfile(session.user));
    if (event === "SIGNED_OUT") {
      if (S.presence) S.db.removeChannel(S.presence);
      S.presence = null;
      S.profile = null;
      S.memberProfiles = [];
      S.onlineIds = new Set();
      renderMembers();
    }
  });
  S.db.auth.getSession().then(({ data }) => { if (data?.session?.user) ensureProfile(data.session.user); });
})();