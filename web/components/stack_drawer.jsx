function StackDrawer({ goals, onClose, onPickGoal }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (goals) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goals, onClose]);

  if (!goals || !goals.length) return null;

  const sorted = [...goals].sort((a, b) => {
    const an = a.goal_number == null ? Infinity : Number(a.goal_number);
    const bn = b.goal_number == null ? Infinity : Number(b.goal_number);
    return an - bn;
  });
  const lead = sorted[0];
  const x = lead.x?.toFixed(1);
  const y = lead.y?.toFixed(1);

  return (
    <div className="fixed inset-0 drawer-bg z-40 flex justify-end" onClick={onClose}>
      <div className="h-full overflow-y-auto" style={{
        width: 'min(520px, 92vw)',
        background: COLORS.bg1,
        borderLeft: `1px solid ${COLORS.line2}`,
      }} onClick={e=>e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b sticky top-0 z-10" style={{borderColor: COLORS.line, background: COLORS.bg1}}>
          <div className="flex items-center justify-between">
            <div className="font-mono uppercase tracking-widest" style={{color: COLORS.gold2, fontWeight: 800, fontSize: 13, letterSpacing:'0.14em'}}>
              {goals.length} goals at this spot
            </div>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded hover:text-white" style={{color: COLORS.muted, border: `1px solid ${COLORS.line}`}}>ESC ✕</button>
          </div>
          <div className="font-serif mt-2 text-2xl sm:text-[32px]" style={{fontWeight: 600, lineHeight: 1.1}}>
            <span className="num-tabular" style={{color: COLORS.gold2}}>{goals.length}</span>
            <span className="ml-2" style={{color: COLORS.muted, fontStyle: 'italic'}}>stacked</span>
          </div>
          <div className="mt-2 text-[11px] font-mono" style={{color: COLORS.muted2}}>
            position {x}, {y} · {distFromGoal(lead.x, lead.y)?.toFixed(1)} yd from goal
          </div>
        </div>

        <div className="px-3 py-3 space-y-1">
          {sorted.map(g => (
            <button
              key={g.match_key}
              onClick={() => { onPickGoal(g); onClose(); }}
              className="w-full text-left panel-2 px-4 py-3 transition hover:ring-gold flex items-center gap-3"
              style={{borderColor: COLORS.line}}>
              <div className="font-mono num-tabular" style={{color: COLORS.gold2, fontSize: 13, fontWeight: 700, minWidth: 56}}>
                {g.goal_number != null ? `#${g.goal_number}` : '—'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.10em'}}>
                  {fmtDate(g.date)}
                </div>
                <div className="font-serif mt-0.5 truncate" style={{color: COLORS.ink, fontSize: 13.5, fontWeight: 600}}>
                  {g.scorer || 'Unknown scorer'}{g.own_goal ? ' (OG)' : ''}
                </div>
                <div className="mt-1 truncate flex items-center gap-2" style={{fontSize: 14}}>
                  {g.team_abbr && <FlagImg abbr={g.team_abbr} size={18}/>}
                  <span style={{color: COLORS.gold2, fontWeight: 600}}>{g.team}</span>
                  <span style={{color: COLORS.muted2}}>vs</span>
                  <span style={{color: COLORS.muted}}>{g.opponent}</span>
                </div>
                <div className="text-[11px] font-mono mt-0.5" style={{color: COLORS.muted}}>
                  {g.competition}{g.minute != null ? ` · ${g.minute}'` : ''} · {fmtBodyPart(g.body_part)}
                </div>
              </div>
              <div className="text-[10px]" style={{color: COLORS.muted2}}>open →</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.StackDrawer = StackDrawer;
