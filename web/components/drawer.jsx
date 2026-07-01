function GoalDrawer({ goal, view, onClose }) {
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

        {/* The drawer shows the COMPLEMENT of the active view: on the pitch you
            already see where it was struck, so show where it crossed the net; on
            the net you see the crossing, so show where on the pitch it came from. */}
        {view === 'pitch' ? (
          <div className="p-4 sm:p-6">
            <div className="text-[11px] uppercase tracking-widest mb-3" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Where it crossed the line</div>
            <div className="relative" style={{aspectRatio: `${NET_GEOM.W} / ${NET_GEOM.H}`, borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.line}`}}>
              {goal.goal_mouth_y != null ? (
                <svg width="100%" height="100%" viewBox={`0 0 ${NET_GEOM.W} ${NET_GEOM.H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                  <NetBackdrop idp="gnm"/>
                  {(() => { const [cx, cy] = netProject(goal); return <circle cx={cx} cy={cy} r="8" fill={BODY_COLORS[goal.body_part]} stroke="white" strokeWidth="1.6"/>; })()}
                  <NetFrame idp="gnm"/>
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono placeholder-stripes" style={{color: COLORS.muted2}}>NO CROSSING DATA AVAILABLE</div>
              )}
            </div>
            {goal.goal_mouth_y != null && (() => {
              const u = (37.66 - goal.goal_mouth_y) / 7.32;
              const v = 1 - goal.goal_mouth_z / 2.44;
              const vert = v < 0.35 ? 'Upper' : v > 0.72 ? 'Low' : 'Mid';
              const side = u < 0.3 ? 'left side' : u > 0.7 ? 'right side' : 'central';
              return (
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>HEIGHT</div><div className="font-mono mt-0.5" style={{color: COLORS.gold2}}>{goal.goal_mouth_z.toFixed(2)} m</div></div>
                  <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>PLACEMENT</div><div className="font-mono mt-0.5" style={{color: COLORS.ink}}>{vert} · {side}</div></div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="text-[11px] uppercase tracking-widest mb-3" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Shot location</div>
            {(() => {
              const Wm = 520, PAD = 24;
              const xMin = (goal.x != null && goal.x < 60) ? Math.max(0, Math.min(60, Math.floor((goal.x - 4) / 10) * 10)) : 60;
              const Hm = (Wm - 2 * PAD) * (((120 - xMin) * (105 / 120)) / 68) + 2 * PAD;
              const [cx, cy] = goal.x != null ? pitchProject(Wm, Hm, xMin)(goal.x, goal.y) : [0, 0];
              return (
                <div className="relative" style={{ aspectRatio: `${Wm} / ${Hm}`, borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.line}` }}>
                  <svg width="100%" height="100%" viewBox={`0 0 ${Wm} ${Hm}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
                    <PitchBackdrop W={Wm} H={Hm} xMin={xMin} gid="grassGradMini"/>
                    {goal.x != null && <circle cx={cx} cy={cy} r="7" fill={BODY_COLORS[goal.body_part]} stroke="white" strokeWidth="1.4"/>}
                  </svg>
                  {goal.x == null && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-mono placeholder-stripes" style={{ color: COLORS.muted2 }}>NO SHOT COORDINATES AVAILABLE</div>
                  )}
                </div>
              );
            })()}
            {goal.x != null && (
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>X</div><div className="font-mono mt-0.5" style={{color: COLORS.ink}}>{goal.x.toFixed(2)}</div></div>
                <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>Y</div><div className="font-mono mt-0.5" style={{color: COLORS.ink}}>{goal.y.toFixed(2)}</div></div>
                <div className="panel-2 px-3 py-2"><div className="text-[10px] font-mono" style={{color: COLORS.muted2}}>DIST</div><div className="font-mono mt-0.5" style={{color: COLORS.gold2}}>{dist.toFixed(1)} yd</div></div>
              </div>
            )}
          </div>
        )}

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
