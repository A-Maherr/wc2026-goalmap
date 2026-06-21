function GoldenBoot({ data, activeScorer, onPickScorer }) {
  const minutesProxy = (window.TOURNAMENT_CONFIG && window.TOURNAMENT_CONFIG.minutes_proxy) || {};

  const { rows, totalScorers } = React.useMemo(() => {
    const by = new Map();
    for (const g of data) {
      if (g.own_goal) continue;  // own goals don't count toward the Golden Boot
      const id = String(g.scorer_id || g.scorer || '');
      if (!id) continue;
      let r = by.get(id);
      if (!r) {
        r = { id, scorer: g.scorer, team: g.team, abbr: g.team_abbr,
              jersey: g.scorer_jersey, goals: 0 };
        by.set(id, r);
      }
      r.goals += 1;
      if (r.jersey == null && g.scorer_jersey != null) r.jersey = g.scorer_jersey;
    }
    const sorted = [...by.values()].sort((a, b) =>
      b.goals - a.goals ||
      (minutesProxy[b.id] || 0) - (minutesProxy[a.id] || 0) ||
      String(a.scorer).localeCompare(String(b.scorer))
    );
    return { rows: sorted.slice(0, 10), totalScorers: by.size };
  }, [data]);

  const maxGoals = rows[0]?.goals || 1;

  return (
    <CardShell kicker="Golden Boot" title="Top scorers"
      right={totalScorers > 0 ? (
        <span className="font-mono" style={{fontSize: 11, color: COLORS.muted2, whiteSpace: 'nowrap'}}>
          {totalScorers} scorer{totalScorers === 1 ? '' : 's'}
        </span>
      ) : null}>
      {rows.length === 0 ? (
        <div className="text-xs py-8 text-center" style={{color: COLORS.muted}}>
          No goals scored yet.
        </div>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => {
            const active = activeScorer && String(activeScorer) === r.id;
            return (
              <button key={r.id}
                onClick={() => onPickScorer && onPickScorer(r.id)}
                title={`Filter the pitch to ${r.scorer}`}
                className="w-full flex items-center gap-3 text-left rounded px-2 py-1.5 transition"
                style={{
                  background: active ? 'rgba(205,163,73,0.14)' : 'transparent',
                  border: `1px solid ${active ? COLORS.gold : 'transparent'}`,
                }}>
                <span className="w-5 text-[11px] font-mono num-tabular text-right"
                  style={{color: i === 0 ? COLORS.gold2 : COLORS.muted2}}>{i + 1}</span>
                <FlagImg abbr={r.abbr} size={20}/>
                <span className="flex-1 min-w-0">
                  <span className="text-sm truncate block" style={{color: COLORS.ink}}>{r.scorer}</span>
                  <span className="text-[10px] font-mono" style={{color: COLORS.muted2}}>
                    {r.team}{r.jersey != null ? ` · #${r.jersey}` : ''}
                  </span>
                </span>
                <span className="w-16 h-1.5 rounded-full hidden sm:block" style={{background: 'rgba(255,255,255,0.05)'}}>
                  <span className="block h-full rounded-full" style={{width: (r.goals / maxGoals * 100) + '%', background: COLORS.gold, opacity: active ? 1 : 0.8}}></span>
                </span>
                <span className="font-serif num-tabular" style={{fontSize: 20, fontWeight: 600, color: active ? COLORS.gold2 : COLORS.ink, minWidth: 22, textAlign: 'right'}}>{r.goals}</span>
              </button>
            );
          })}
        </div>
      )}
    </CardShell>
  );
}

window.GoldenBoot = GoldenBoot;
