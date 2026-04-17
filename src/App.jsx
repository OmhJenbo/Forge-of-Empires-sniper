import { useEffect, useState } from 'react';

export default function App() {
  const [gbData, setGbData] = useState(null);
  const [arcBonus, setArcBonus] = useState(100);

  useEffect(() => {
    const loadData = () => {
      chrome.storage.local.get(['currentGBData', 'userArcBonus'], (result) => {
        if (result.currentGBData) {
          const now = Date.now();
          if (now - result.currentGBData.updatedAt < 15000) {
            setGbData(result.currentGBData);
          } else {
            setGbData(null);
          }
        }
        if (result.userArcBonus !== undefined) setArcBonus(result.userArcBonus);
      });
    };

    loadData();

    const listener = (changes) => {
      if (changes.currentGBData || changes.userArcBonus) {
        loadData();
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!gbData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <span style={{ fontSize: '30px' }}>🎯</span>
        <p>Åbn en bygning i spillet...</p>
      </div>
    );
  }

  const currentFp = Number(gbData.currentFp) || 0;
  const totalFp = Number(gbData.maxFp) || 0;
  const remainingFp = Math.max(0, totalFp - currentFp);
  const arcMultiplier = 1 + (Number(arcBonus) / 100);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{gbData.name}</h3>
      
      <div style={{ background: '#f8f9fa', padding: '18px', borderRadius: '12px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#666' }}>
          <span>Total: <strong>{totalFp}</strong></span>
          <span>Allerede Lagt: <strong>{currentFp}</strong></span>
        </div>
        <div style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: '#e67e22', marginTop: '10px' }}>
          {totalFp === 0 ? 'Venter på total...' : `Lukkes efter: ${remainingFp} FP`}
        </div>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#999', display: 'block', marginBottom: '8px' }}>ARK BONUS %</label>
        <input 
          type="number" 
          value={arcBonus} 
          onChange={(e) => {
            const val = Number(e.target.value);
            setArcBonus(val);
            chrome.storage.local.set({ userArcBonus: val });
          }} 
          style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box' }} 
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#bbb', fontSize: '11px', borderBottom: '2px solid #eee' }}>
            <th style={{ padding: '10px' }}>P</th>
            <th style={{ padding: '10px' }}>Gevinst</th>
            <th style={{ padding: '10px' }}>Snipes for</th>
            <th style={{ padding: '10px', textAlign: 'right' }}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {(gbData.rankings || [])
            .filter(rank => rank.reward)
            .map((rank, i) => {
              const reward = Math.round((rank.reward?.strategy_point_amount || 0) * arcMultiplier);
              const otherFp = rank.forge_points || 0;
              const secureCost = Math.ceil((remainingFp + otherFp) / 2);
              const profit = reward - secureCost;
              
              // 1. Tjek om det er dit ID (uanset beløb)
              const isActuallyMe = (rank.player_id && rank.player_id === gbData.myPlayerId) || 
                                   (rank.player && rank.player.is_self === true);

              // 2. Er pladsen 100% sikret (af hvem som helst)?
              const is100PercentSecure = totalFp > 0 && (remainingFp === 0 || (otherFp >= secureCost && secureCost > 0));

              // 3. Strenge logik for "DIG": Kun hvis det er dig OG den er 100% låst
              const isMeAndSecured = isActuallyMe && is100PercentSecure;

              // 4. "Pay Now" logik: Hvor meget skal du indtaste lige nu?
              // Vi trækker dine egne point fra sikringskravet
              const payNow = isActuallyMe ? Math.max(0, secureCost - otherFp) : secureCost;

              const textOpacity = is100PercentSecure ? 0.5 : 1;
            
              return (
                <tr key={i} style={{ 
                  borderBottom: '1px solid #f1f1f1', 
                  backgroundColor: isMeAndSecured ? 'rgba(39, 174, 96, 0.25)' : 'transparent' 
                }}>
                  <td style={{ padding: '18px 10px', fontWeight: 'bold', opacity: textOpacity }}>
                    #{rank.rank || i+1} 
                    {isMeAndSecured && <span style={{fontSize: '10px', color: '#1e8449', display: 'block'}}>DIG</span>}
                  </td>
                  
                  <td style={{ padding: '18px 10px', opacity: textOpacity }}>{reward}</td>
                  
                  <td style={{ padding: '18px 10px', color: '#2980b9', fontWeight: '1000', opacity: textOpacity }}>
                    {isMeAndSecured ? "✅" : (is100PercentSecure ? "-" : payNow)}
                  </td>
                  
                  <td style={{ 
                    padding: '18px 10px', 
                    textAlign: 'right', 
                    fontWeight: 'bold', 
                    opacity: textOpacity,
                    color: (is100PercentSecure && !isMeAndSecured) ? '#999' : (profit > 0 ? '#27ae60' : '#e74c3c') 
                  }}>
                    {isMeAndSecured ? (profit > 0 ? `+${profit}` : profit) : (is100PercentSecure ? 'Optaget' : (profit > 0 ? `+${profit}` : profit))}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}