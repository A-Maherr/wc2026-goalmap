function GoalDrawer({ goal, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (goal) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goal, onClose]);

  if (!goal) return null;
  const dist = distFromGoal(goal.x, goal.y);

  return (
    <div className="fixed inset-0 drawer-bg z-40 flex justify-end" onClick={onClose}>
      <div className="h-full overflow-y-auto" style={{
        width: 'min(620px, 92vw)',
        background: COLORS.bg1,
        borderLeft: `1px solid ${COLORS.line2}`,
      }} onClick={e=>e.stopPropagation()}>
        <div className="p-4 sm:p-6 border-b sticky top-0 z-10" style={{borderColor: COLORS.line, background: COLORS.bg1}}>
          <div className="flex items-center justify-between">
            <div className="font-mono uppercase tracking-widest" style={{color: COLORS.gold2, fontWeight: 800, fontSize: 15, letterSpacing:'0.10em'}}>
              {goal.goal_number != null ? `GOAL #${goal.goal_number} OF TOURNAMENT` : ''}
            </div>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded hover:text-white" style={{color: COLORS.muted, border: `1px solid ${COLORS.line}`}}>ESC ✕</button>
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing: '0.14em'}}>{fmtDate(goal.date)}</div>
          {goal.scorer && (
            <div className="mt-2 flex items-center gap-2">
              <FlagImg abbr={goal.team_abbr} size={22}/>
              <span className="font-serif text-xl sm:text-[26px]" style={{fontWeight: 600, color: COLORS.ink}}>{goal.scorer}</span>
              {goal.scorer_jersey != null && <span className="font-mono text-sm" style={{color: COLORS.muted2}}>#{goal.scorer_jersey}</span>}
            </div>
          )}
          {/* Scorer's side of the running score is gold. */}
          <div className="font-serif text-lg sm:text-[28px] mt-1 flex items-center gap-2 sm:gap-3 flex-wrap" style={{fontWeight: 600, lineHeight: 1.15, paddingBottom: '0.05em'}}>
            {(() => {
              const p = String(goal.score_after_goal || '').split(':');
              const hasScore = p.length === 2;
              const homeName = goal.home_team || goal.team;
              const awayName = goal.away_team || goal.opponent;
              const homeScored = goal.scorer_side ? goal.scorer_side === 'home' : true;
              return (
                <>
                  <span style={{color: homeScored ? COLORS.gold2 : COLORS.ink}}>{homeName}</span>
                  {hasScore && <span className="num-tabular" style={{color: homeScored ? COLORS.gold2 : COLORS.ink}}>{p[0]}</span>}
                  <span style={{color: COLORS.muted, fontStyle: 'italic'}}>vs</span>
                  {hasScore && <span className="num-tabular" style={{color: homeScored ? COLORS.ink : COLORS.gold2}}>{p[1]}</span>}
                  <span style={{color: homeScored ? COLORS.ink : COLORS.gold2}}>{awayName}</span>
                </>
              );
            })()}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {goal.live && (
              <span className="chip font-mono" title="Live — coordinates and xG are provisional until full time"
                style={{borderColor: 'rgba(200,16,46,0.55)', color: '#ff8d99', background: 'rgba(200,16,46,0.10)', fontWeight: 700}}>
                ● LIVE
              </span>
            )}
            <span className="chip">{goal.competition}</span>
            <span className="chip">{goal.venue}</span>
            {goal.minute != null && <span className="chip font-mono">{goal.minute}'</span>}
            {goal.xg != null && (
              <span className="chip font-mono" title="Expected goals — the probability an average shot from this position is scored"
                style={{borderColor: 'rgba(205,163,73,0.5)', color: COLORS.gold2}}>
                xG {Number(goal.xg).toFixed(2)}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-[11px] uppercase tracking-widest mb-3" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Shot location</div>
          <div className="relative" style={{aspectRatio: '105 / 68', background:'linear-gradient(180deg, #1a5e30, #155026)', borderRadius: 8, border: `1px solid ${COLORS.line}`}}>
            <svg width="100%" height="100%" viewBox="0 0 120 80" preserveAspectRatio="none">
              <rect x="1" y="1" width="118" height="78" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" fill="none"/>
              <line x1="60" y1="1" x2="60" y2="79" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
              <circle cx="60" cy="40" r="9" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" fill="none"/>
              <rect x="102" y="18" width="18" height="44" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" fill="none"/>
              <rect x="114" y="30" width="6" height="20" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" fill="none"/>
              <rect x="0" y="18" width="18" height="44" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4" fill="none"/>
              {goal.x != null && (
                <g>
                  <circle cx={goal.x} cy={goal.y} r="2.4" fill={BODY_COLORS[goal.body_part]} stroke="white" strokeWidth="0.5"/>
                  <line x1={goal.x} y1={goal.y} x2="120" y2="40" stroke={COLORS.gold} strokeWidth="0.4" strokeDasharray="1 1"/>
                </g>
              )}
            </svg>
            {goal.x == null && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-mono placeholder-stripes" style={{color: COLORS.muted2}}>NO SHOT COORDINATES AVAILABLE</div>
            )}
          </div>
          {goal.x != null && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>X</div><div className="font-mono mt-0.5" style={{color: COLORS.ink}}>{goal.x.toFixed(2)}</div></div>
              <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>Y</div><div className="font-mono mt-0.5" style={{color: COLORS.ink}}>{goal.y.toFixed(2)}</div></div>
              <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>DIST</div><div className="font-mono mt-0.5" style={{color: COLORS.gold2}}>{dist.toFixed(1)} yd</div></div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="text-[11px] uppercase tracking-widest mb-3" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Anatomy</div>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Body part" value={<span><span className="legend-dot mr-1.5" style={{background: BODY_COLORS[goal.body_part]}}></span>{fmtBodyPart(goal.body_part)}</span>}/>
            <KV label="Situation" value={fmtSituation(goal.situation)}/>
            <KV label="Finish" value={fmtFinish(goal.finish_style)}/>
            <KV label="Precision" value={<span><span className="legend-dot mr-1.5" style={{background: PRECISION_COLORS[goal.location_precision]}}></span>{fmtPrecision(goal.location_precision)}</span>}/>
            <KV label="Stage" value={goal.stage || '—'}/>
            <KV label="xG" value={goal.xg != null ? <span style={{color: COLORS.gold2}}>{Number(goal.xg).toFixed(2)}</span> : '—'}/>
            <KV label="Scorer" value={goal.scorer ? `${goal.scorer}${goal.scorer_jersey != null ? ` · #${goal.scorer_jersey}` : ''}` : '—'}/>
            <KV label="Position" value={goal.scorer_position || '—'}/>
          </div>

        </div>
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div className="panel-2 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest font-mono" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>{label}</div>
      <div className="text-xs mt-1" style={{color: COLORS.ink}}>{value}</div>
    </div>
  );
}

window.GoalDrawer = GoalDrawer;
