function formatHeroDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${m[3]} ${months[parseInt(m[2], 10) - 1] || ''} ${m[1]}`;
}

function Hero({ stats, freshness }) {
  const updatedLabel = freshness
    ? `UPDATED ${freshness}`
    : (stats.latestDate ? `UPDATED ${formatHeroDate(stats.latestDate)}` : 'UPDATED —');

  return (
    <header className="px-4 sm:px-8 py-3 border-b" style={{borderColor: COLORS.line, background: 'linear-gradient(180deg, rgba(26,58,92,0.30), transparent)'}}>
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="assets/wc2026_official.png"
            alt="FIFA World Cup 2026 official emblem"
            style={{height: 56, width: 'auto', display: 'block', flexShrink: 0}}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <h1 className="font-serif" style={{fontSize: 'clamp(19px, 2.1vw, 28px)', lineHeight: 1.05, letterSpacing: '-0.02em', fontWeight: 600}}>
              World Cup 26 Goal Map
              <span className="gold-shimmer italic" style={{marginLeft: '0.3em'}}>— every goal, live.</span>
            </h1>
            <div className="flex items-center gap-2 flex-wrap" style={{marginTop: 4}}>
              <span className="pill font-mono" style={{color: COLORS.gold2, border: `1px solid rgba(200,16,46,0.5)`, background: 'rgba(200,16,46,0.10)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, fontSize: '10px'}}>
                ● LIVE
              </span>
              <span className="pill font-mono" style={{color: COLORS.muted2, fontSize: '10px'}}>{updatedLabel}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <StatBlock big={stats.total.toLocaleString()} label="goals" sub={`${(stats.total / Math.max(stats.matchesPlayed, 1)).toFixed(1)} per match`} hi />
          <StatBlock big={stats.nationsScored.toLocaleString()} label="nations" sub="of 48 scored"/>
          <StatBlock
            big={stats.topScorerGoals.toLocaleString()}
            label="Golden Boot"
            sub={stats.topScorer !== '—'
              ? <span style={{display:'inline-flex', alignItems:'center', gap:5}}>
                  {stats.topScorerAbbr && <FlagImg abbr={stats.topScorerAbbr} size={12}/>}
                  <span className="truncate" style={{maxWidth: 104, display:'inline-block', verticalAlign:'bottom'}}>{stats.topScorer}</span>
                </span>
              : '—'}
          />
          <StatBlock big={`${stats.matchesPlayed}`} label="matches" sub={`of ${stats.totalMatches}`}/>
        </div>
      </div>
    </header>
  );
}

function StatBlock({ big, label, sub, hi }) {
  return (
    <div className="panel px-3.5 py-2" style={{minWidth: 108}}>
      <div className="font-serif num-tabular" style={{
        fontSize: 26, lineHeight: 1.05, fontWeight: 600,
        color: hi ? COLORS.gold2 : COLORS.ink,
        letterSpacing: '-0.01em',
      }}>{big}</div>
      <div style={{color: COLORS.ink, marginTop: 2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em'}}>{label}</div>
      <div className="text-[10px] font-mono" style={{color: COLORS.muted2, marginTop: 1}}>{sub}</div>
    </div>
  );
}

window.Hero = Hero;
