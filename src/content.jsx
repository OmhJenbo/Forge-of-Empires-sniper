// content.jsx
window.addEventListener('FOE_INJECT_DATA', (event) => {
  const packet = event.detail;
  if (!Array.isArray(packet)) return;

  chrome.storage.local.get(['currentGBData'], (result) => {
    let db = result.currentGBData || { name: "", maxFp: 0, currentFp: 0, rankings: [], ownerName: "", myPlayerId: null };
    let hasChanges = false;

    for (const item of packet) {
      const method = item.requestMethod;
      const res = item.responseData;

      if (!res) continue;

      // 1. Fang Total FP (Ligger inde i state i CityMapEntity)
      if (method === "getOtherPlayerCityMapEntity") {
        db.maxFp = res.state?.forge_points_for_level_up || db.maxFp;
        db.entityId = res.id || db.entityId;
        hasChanges = true;
      }

      // 2. Fang Navne
      if (method === "getOtherPlayerOverview" && Array.isArray(res)) {
        const match = res.find(b => b.entity_id === db.entityId) || res.find(b => b.name === db.name);
        if (match) {
          db.name = match.name || db.name;
          db.ownerName = (match.player && match.player.name) || db.ownerName;
          db.maxFp = match.max_progress || db.maxFp;
          hasChanges = true;
        }
      }

      // 3. Fang Rankings, beregn lagt, og find dit Player ID
      if (method === "getConstruction") {
        db.rankings = res.rankings || [];
        db.currentFp = db.rankings.reduce((sum, r) => sum + (r.forge_points || 0), 0);
        
        const me = db.rankings.find(r => r.player && r.player.is_self);
        if (me) db.myPlayerId = me.player.player_id;

        db.updatedAt = Date.now();
        hasChanges = true;
      }

      // 4. Fang Indbetalinger (Når du lægger FP, opdateres listen automatisk)
      if (method === "contributeForgePoints" && Array.isArray(res)) {
        db.rankings = res;
        db.currentFp = db.rankings.reduce((sum, r) => sum + (r.forge_points || 0), 0);
        
        const me = db.rankings.find(r => r.player && r.player.is_self);
        if (me) db.myPlayerId = me.player.player_id;

        db.updatedAt = Date.now();
        hasChanges = true;
      }
    }

    if (hasChanges) {
      chrome.storage.local.set({ currentGBData: db }, () => {
        chrome.runtime.sendMessage({ type: 'UPDATE_DATA', data: db }).catch(() => {});
      });
    }
  });
});

if (!document.querySelector('script[src*="inject.js"]')) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/inject.js');
  (document.head || document.documentElement).appendChild(script);
}