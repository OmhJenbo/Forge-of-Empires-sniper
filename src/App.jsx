import { useEffect, useState } from 'react';

export default function App() {
  const [gbData, setGbData] = useState(null);
  const [arcBonus, setArcBonus] = useState(100);

  const loadData = () => {
    chrome.storage.local.get(['currentGBData', 'userArcBonus'], (result) => {
      if (result.currentGBData) setGbData(result.currentGBData);
      if (result.userArcBonus !== undefined) setArcBonus(result.userArcBonus);
    });
  };

  useEffect(() => {
    loadData();
    const storageListener = (changes) => { if (changes.currentGBData) loadData(); };
    const messageListener = (msg) => { if (msg.type === 'UPDATE_DATA') setGbData(msg.data); };
    
    chrome.storage.onChanged.addListener(storageListener);
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const copyToClipboard = async () => {
    if (gbData) {
      const text = `${gbData.ownerName || "Ukendt"} - ${gbData.name || "Bygning"}`;
      try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById('copyBtn');
        btn.innerText = '✅';
        setTimeout(() => btn.innerText = '📋', 1000);
      } catch (err) { 
        console.error(err); 
      }
    }
  };

  if (!gbData || !gbData.name) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Åbn en bygning...</div>;
  }

  const currentFp = Number(gbData.currentFp) || 0;
  const totalFp = Number(gbData.maxFp) || 0;
  const remainingFp = Math.max(0, totalFp - currentFp);
  const arcMultiplier = 1 + (Number(arcBonus) / 100);

  return (
    <div style={{ padding: '15px', fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>{gbData.name}</h3>
        <button id="copyBtn" onClick={copyToClipboard} style={{ cursor: 'pointer', border: 'none', background: '#f0f0f0', borderRadius: '4px', padding: '4px 8px' }}>📋</button>
      </div>

      <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginBottom: '5px' }}>
          <span>Total: <strong>{totalFp}</strong></span>
          <span>Lagt: <strong>{currentFp}</strong></span>
        </div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e67e22' }}>
          {totalFp > 0 ? `Lukkes efter: ${remainingFp} FP` : "Henter total..."}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#999', display: 'block', marginBottom: '5px' }}>DIN ARK BONUS %</label>
        <input 
          type="number" 
          value={arcBonus} 
          onChange={(e) => {
            setArcBonus(e.target.value);
            chrome.storage.local.set({ userArcBonus: e.target.value });
          }} 
          style={{ width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ddd', borderRadius: '8px' }} 
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#bbb', fontSize: '11px', borderBottom: '1px solid #eee' }}>
            <th style={{ padding: '8px' }}>P</th>
            <th style={{ padding: '8px' }}>Gevinst</th>
            <th style={{ padding: '8px' }}>Snipe for:</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {(gbData.rankings || [])
            .filter(rank => rank.reward) // Fjerner ejeren (og andre uden gevinst)
            .map((rank, i) => {
              const baseReward = rank.reward?.strategy_point_amount || 0;
              const rewardWithArc = Math.round(baseReward * arcMultiplier);
              const alreadyInvested = rank.forge_points || 0;
              
              // Sikringsberegning
              const secureCost = totalFp > 0 ? Math.ceil((remainingFp + alreadyInvested) / 2) : 0;
              
              // Identificering
              const isActuallyMe = (rank.player?.player_id === gbData.myPlayerId) || (rank.player?.is_self === true);
              const is100PercentSecure = totalFp > 0 && (remainingFp === 0 || (alreadyInvested >= secureCost && secureCost > 0));
              const isMeAndSecured = isActuallyMe && is100PercentSecure;
              
              // Økonomi
              const payNow = isActuallyMe ? Math.max(0, secureCost - alreadyInvested) : secureCost;
              const profit = rewardWithArc - secureCost;

              // Styling af rækken afhængig af ejerskab og sikring
              const rowStyle = {
                borderBottom: '1px solid #f1f1f1',
                backgroundColor: isMeAndSecured ? 'rgba(39, 174, 96, 0.15)' : 'transparent',
                opacity: (is100PercentSecure && !isMeAndSecured) ? 0.4 : 1 // Gråes ud hvis sikret af en anden
              };

              return (
                <tr key={i} style={rowStyle}>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                    #{rank.rank || i+1}
                  </td>
                  <td style={{ padding: '12px 8px' }}>{rewardWithArc}</td>
                  <td style={{ padding: '12px 8px', color: '#2980b9', fontWeight: 'bold' }}>
                    {totalFp === 0 ? "?" : (isMeAndSecured ? "✅" : (is100PercentSecure ? "-" : payNow))}
                  </td>
                  <td style={{ 
                    padding: '12px 8px', 
                    textAlign: 'right', 
                    fontWeight: 'bold', 
                    color: (is100PercentSecure && !isMeAndSecured) ? '#999' : (profit > 0 ? '#27ae60' : '#e74c3c') 
                  }}>
                    {totalFp > 0 
                      ? (isMeAndSecured 
                          ? (profit > 0 ? `+${profit}` : profit) 
                          : (is100PercentSecure ? "Optaget" : (profit > 0 ? `+${profit}` : profit))) 
                      : "..."}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}