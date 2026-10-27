// YAPPER friend requests and accepted friends.
(function () {
  if (!window.supabase || typeof S === "undefined" || !S.db) return;
  const $f = id => document.getElementById(id);
  let currentUserId = null;
  let busy = false;
  let friendshipChannel = null;
  let refreshTimer = null;
  let loadSequence = 0;

  function note(message, error = false) {
    const el = $f("friend-feedback");
    if (el) {
      el.textContent = message || "";
      el.style.color = error ? "#ffbd75" : "";
    }
  }
  function safeText(el, value) { el.textContent = value == null ? "" : String(value); }
  function profileAvatar(profile) {
    const avatar = document.createElement("div");
    avatar.className = "friend-avatar";
    if (profile?.avatar_url) {
      const img = document.createElement("img");
      img.src = profile.avatar_url;
      img.alt = "";
      avatar.append(img);
    } else avatar.textContent = (profile?.username || "?").slice(0, 1).toUpperCase();
    return avatar;
  }
  function makeButton(label, cls, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = cls || "friend-action";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }
  function friendRow(profile, detail, actions = []) {
    const row = document.createElement("div");
    row.className = "friend-row";
    row.append(profileAvatar(profile));
    const info = document.createElement("div");
    info.className = "friend-info";
    const name = document.createElement("b");
    safeText(name, profile?.username || "Unknown user");
    const sub = document.createElement("small");
    safeText(sub, detail || "");
    info.append(name, sub);
    row.append(info);
    const controls = document.createElement("div");
    controls.className = "friend-controls";
    actions.forEach(a => controls.append(makeButton(a.label, a.className, a.action)));
    row.append(controls);
    return row;
  }
  async function getProfiles(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const { data, error } = await S.db.from("profiles").select("id,username,avatar_url").in("id", unique);
    if (error) throw error;
    return Object.fromEntries((data || []).map(p => [p.id, p]));
  }
  function setLoading(el, message) {
    el.replaceChildren();
    const p = document.createElement("p");
    p.className = "muted";
    safeText(p, message);
    el.append(p);
  }
  async function loadFriends() {
    const sequence = ++loadSequence;
    if (!currentUserId) {
      setLoading($f("friend-requests"), "Sign in to see requests.");
      setLoading($f("friends-list"), "Sign in to see friends.");
      return;
    }
    setLoading($f("friend-requests"), "Loading requests…");
    setLoading($f("friends-list"), "Loading friends…");
    const { data: rows, error } = await S.db.from("friendships")
      .select("id,requester_id,addressee_id,status,created_at")
      .or("requester_id.eq." + currentUserId + ",addressee_id.eq." + currentUserId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (sequence !== loadSequence || currentUserId === null) return;
    const records = rows || [];
    const profiles = await getProfiles(records.map(r => r.requester_id === currentUserId ? r.addressee_id : r.requester_id));
    if (sequence !== loadSequence || currentUserId === null) return;
    const incoming = records.filter(r => r.status === "pending" && r.addressee_id === currentUserId);
    const outgoing = records.filter(r => r.status === "pending" && r.requester_id === currentUserId);
    const accepted = records.filter(r => r.status === "accepted");
    const requestsRoot = $f("friend-requests");
    requestsRoot.replaceChildren();
    $f("friend-pending-count").textContent = String(incoming.length + outgoing.length);
    if (!incoming.length && !outgoing.length) setLoading(requestsRoot, "No pending requests.");
    incoming.forEach(r => {
      const p = profiles[r.requester_id] || { username: "Unknown user" };
      requestsRoot.append(friendRow(p, "Wants to be your friend", [
        { label: "Accept", className: "friend-action accept", action: async () => {
          try {
            const { error } = await S.db.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending");
            if (error) throw error;
            note("Friend request accepted!");
            await loadFriends();
          } catch (e) { note(e.message || String(e), true); }
        }},
        { label: "Decline", className: "friend-action", action: async () => {
          try {
            const { error } = await S.db.from("friendships").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", r.id).eq("status", "pending");
            if (error) throw error;
            await loadFriends();
          } catch (e) { note(e.message || String(e), true); }
        }}
      ]));
    });
    outgoing.forEach(r => requestsRoot.append(friendRow(profiles[r.addressee_id], "Request sent", [
      { label: "Cancel", className: "friend-action", action: async () => {
        try {
          const { error } = await S.db.from("friendships").delete().eq("id", r.id).eq("requester_id", currentUserId);
          if (error) throw error;
          await loadFriends();
        } catch (e) { note(e.message || String(e), true); }
      }}
    ])));
    const friendsRoot = $f("friends-list");
    friendsRoot.replaceChildren();
    $f("friend-count").textContent = String(accepted.length);
    if (!accepted.length) setLoading(friendsRoot, "No friends yet. Add someone by username!");
    accepted.sort((a, b) => (profiles[a.requester_id === currentUserId ? a.addressee_id : a.requester_id]?.username || "").localeCompare(profiles[b.requester_id === currentUserId ? b.addressee_id : b.requester_id]?.username || ""));
    accepted.forEach(r => {
      const friendId = r.requester_id === currentUserId ? r.addressee_id : r.requester_id;
      friendsRoot.append(friendRow(profiles[friendId], "YAPPER friend", [
        { label: "Remove", className: "friend-action remove", action: async () => {
          if (!confirm("Remove " + (profiles[friendId]?.username || "this friend") + " from your friends?")) return;
          try {
            const { error } = await S.db.from("friendships").delete().eq("id", r.id);
            if (error) throw error;
            note("Friend removed.");
            await loadFriends();
          } catch (e) { note(e.message || String(e), true); }
        }}
      ]));
    });
  }
  async function sendRequest(event) {
    event.preventDefault();
    if (busy) return;
    if (!currentUserId) return note("Sign in first to add friends.", true);
    const username = $f("friend-username").value.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,24}$/.test(username)) return note("Enter a username with 2–24 letters, numbers, or underscores.", true);
    busy = true;
    $f("friend-add-submit").disabled = true;
    try {
      const { data: target, error: lookupError } = await S.db.from("profiles")
        .select("id,username").eq("username", username).maybeSingle();
      if (lookupError) throw lookupError;
      if (!target) throw new Error("No YAPPER user has that username.");
      if (target.id === currentUserId) throw new Error("You can't send a friend request to yourself.");
      const { data: existing, error: existingError } = await S.db.from("friendships")
        .select("id,requester_id,addressee_id,status")
        .or("and(requester_id.eq." + currentUserId + ",addressee_id.eq." + target.id + "),and(requester_id.eq." + target.id + ",addressee_id.eq." + currentUserId + ")")
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing?.status === "accepted") throw new Error("You're already friends.");
      if (existing?.status === "pending" && existing.requester_id === currentUserId) throw new Error("You've already sent a request to @" + target.username + ".");
      if (existing?.status === "pending" && existing.addressee_id === currentUserId) throw new Error("@" + target.username + " already sent you a request. Accept it below.");
      if (existing?.status === "rejected") {
        // A rejected row is retained for history; delete it before a fresh request.
        const { error } = await S.db.from("friendships").delete().eq("id", existing.id);
        if (error) throw error;
      }
      const { error } = await S.db.from("friendships").insert({ requester_id: currentUserId, addressee_id: target.id, status: "pending" });
      if (error) {
        if (error.code === "23505") throw new Error("A request already exists between these accounts.");
        throw error;
      }
      $f("friend-username").value = "";
      note("Friend request sent to @" + target.username + "!");
      await loadFriends();
    } catch (e) { note(e.message || String(e), true); }
    finally { busy = false; $f("friend-add-submit").disabled = false; }
  }
  async function openFriends() {
    $f("friends-modal").showModal();
    note("");
    try { await loadFriends(); } catch (e) { note("Couldn't load friends: " + (e.message || e), true); }
  }
  $f("open-friends").addEventListener("click", openFriends);
  const mobileFriendsButton = $f("open-friends-mobile");
  if (mobileFriendsButton) mobileFriendsButton.addEventListener("click", openFriends);
  $f("friends-close").addEventListener("click", () => $f("friends-modal").close());
  $f("friends-refresh").addEventListener("click", async () => {
    try { note(""); await loadFriends(); } catch (e) { note(e.message || String(e), true); }
  });
  $f("friend-add-form").addEventListener("submit", sendRequest);
  function watchFriendships(userId) {
    if (friendshipChannel) { S.db.removeChannel(friendshipChannel); friendshipChannel = null; }
    if (!userId) return;
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadFriends().catch(e => note(e.message || String(e), true)), 180);
    };
    friendshipChannel = S.db.channel("yapper-friendships-" + userId)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: "requester_id=eq." + userId }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: "addressee_id=eq." + userId }, refresh)
      .subscribe();
  }
  S.db.auth.onAuthStateChange((event, session) => {
    currentUserId = session?.user?.id || null;
    watchFriendships(currentUserId);
    if (event === "SIGNED_OUT") {
      setLoading($f("friend-requests"), "Sign in to see requests.");
      setLoading($f("friends-list"), "Sign in to see friends.");
      $f("friend-count").textContent = "0";
      $f("friend-pending-count").textContent = "0";
    } else if (session?.user) queueMicrotask(() => loadFriends().catch(e => note(e.message || String(e), true)));
  });
  S.db.auth.getSession().then(({ data }) => {
    currentUserId = data?.session?.user?.id || null;
    watchFriendships(currentUserId);
    if (currentUserId) loadFriends().catch(e => note(e.message || String(e), true));
  });
})();