window.addEventListener('FOE_INJECT_DATA', (event) => {
    const packet = event.detail;
    if (!Array.isArray(packet)) return;

    chrome.storage.local.get(['currentGBData'], (result) => {
        let db = result.currentGBData || { name: "", maxFp: 0, currentFp: 0, rankings: [] };
        let hasChanges = false;

        packet.forEach(item => {
            const method = item.requestMethod;
            const res = item.responseData;
            if (!res) return;

            // 1. ÅBN VINDUE
            if (method === "getConstruction") {
                const rankings = res.rankings || [];
                
                // Find dit ID ved at lede efter is_self i listen
                const me = rankings.find(r => r.player && r.player.is_self);
                const myId = me ? me.player.player_id : db.myPlayerId;

                db = {
                    name: "Henter navn...",
                    maxFp: 0,
                    currentFp: rankings.reduce((sum, r) => sum + (r.forge_points || 0), 0),
                    rankings: rankings,
                    myPlayerId: myId,
                    updatedAt: Date.now()
                };
                hasChanges = true;
            }

            // 2. INDBETALING (Rettet til Array-struktur)
            if (method === "contributeForgePoints") {
                // Din log viser at res ER selve listen (Array), ikke et objekt med .rankings
                if (Array.isArray(res)) {
                    const rankings = res;
                    const me = rankings.find(r => r.player && r.player.is_self);
                    
                    db.rankings = rankings;
                    db.currentFp = rankings.reduce((sum, r) => sum + (r.forge_points || 0), 0);
                    if (me) db.myPlayerId = me.player.player_id;
                    
                    db.updatedAt = Date.now();
                    hasChanges = true;
                }
            }

            // 3. STAMDATA
            if (method === "getOtherPlayerOverview" && Array.isArray(res)) {
                const match = res.find(b => 
                    (b.current_progress === db.currentFp && b.max_progress > 0) ||
                    (db.name !== "" && b.name === db.name)
                );
                
                if (match) {
                    db.name = match.name;
                    db.maxFp = match.max_progress;
                    db.currentFp = match.current_progress; 
                    db.updatedAt = Date.now();
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            chrome.storage.local.set({ currentGBData: db });
        }
    });
});

const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/inject.js');
script.onload = function() { this.remove(); };
(document.head || document.documentElement).appendChild(script);