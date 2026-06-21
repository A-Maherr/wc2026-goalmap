function Cards({ data, matches, matchesData, onSearch, onTimeFilter, onDistFilter, onBodyPart, onOpponent, onZone, activeZone, onPosition, activePositions, onXgFilter, activeXg, onPickGoal, onPickMatch, activeMatches }) {
  return (
    <section className="grid grid-cols-12 gap-4 mt-6">
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><BodyPartDonut data={data} onBodyPart={onBodyPart}/></div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><MinuteBuckets data={data} onTimeFilter={onTimeFilter}/></div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><DistanceDist data={data} onDistFilter={onDistFilter} onZone={onZone} activeZone={activeZone}/></div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><PositionCard data={data} onPosition={onPosition} activePositions={activePositions}/></div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><XGCard data={data} onXgFilter={onXgFilter} activeXg={activeXg}/></div>
      <div className="col-span-12 sm:col-span-6 lg:col-span-4"><TopOpponents data={data} onOpponent={onOpponent}/></div>
      <div className="col-span-12"><MatchesCard data={matchesData || data} matches={matches} onPickGoal={onPickGoal} onPickMatch={onPickMatch} activeMatches={activeMatches}/></div>
    </section>
  );
}

function MatchesCard({ data, matches, onPickGoal, onPickMatch, activeMatches }) {
  const [expanded, setExpanded] = React.useState(false);
  const byId = React.useMemo(() => {
    const m = {};
    (matches || []).forEach(x => { m[String(x.id)] = x; });
    return m;
  }, [matches]);
  const rows = React.useMemo(() => {
    const g = {};
    for (const goal of data) {
      const id = String(goal.match_key || '').split('-')[0];
      if (!id) continue;
      (g[id] = g[id] || []).push(goal);
    }
    return Object.entries(g).map(([id, goals]) => ({
      id, match: byId[id], goals,
      date: (byId[id] && byId[id].date) || goals[0].date,
      kickoff: (byId[id] && byId[id].kickoff_iso) || (byId[id] && byId[id].date) || goals[0].date,
    })).sort((a, b) => String(b.kickoff).localeCompare(String(a.kickoff)));
  }, [data, byId]);
  if (!rows.length) return <CardEmpty kicker="07 / Matches" title="Matches in view"/>;
  const lastName = (n) => (n ? String(n).split(' ').slice(-1)[0] : '?');
  const isActive = (id) => activeMatches instanceof Set && activeMatches.has(id);
  const anyActive = activeMatches instanceof Set && activeMatches.size > 0;
  const visible = expanded ? rows : rows.slice(0, 3);
  return (
    <CardShell kicker="07 / Matches" title="Matches in view"
      right={
        <span className="font-mono" style={{ fontSize: 11, color: COLORS.muted2 }}>
          {rows.length} match{rows.length === 1 ? '' : 'es'}
        </span>
      }>
      <div className="space-y-2">
        {visible.map(r => {
          const m = r.match;
          const home = m ? m.home : { name: r.goals[0].team, short_name: r.goals[0].team, abbreviation: r.goals[0].team_abbr };
          const away = m ? m.away : { name: r.goals[0].opponent, short_name: r.goals[0].opponent, abbreviation: r.goals[0].opponent_abbr };
          const stage = (m && m.stage) || r.goals[0].stage;
          const sc = STAGE_COLORS[stage] || COLORS.gold;
          const byMin = (a, b) => (a.minute || 0) - (b.minute || 0);
          const isHomeGoal = (g) => (g.scorer_side ? g.scorer_side === 'home' : g.team === (home.name));
          const homeG = r.goals.filter(isHomeGoal).sort(byMin);
          const awayG = r.goals.filter(g => !isHomeGoal(g)).sort(byMin);
          // Trust the official score only when it's >= our plotted count; the
          // live feed can lag (0-0 while goal events already exist).
          const ohs = m && m.home_score != null ? parseInt(m.home_score, 10) : NaN;
          const oas = m && m.away_score != null ? parseInt(m.away_score, 10) : NaN;
          const useOfficial = Number.isFinite(ohs) && Number.isFinite(oas) && (ohs + oas) >= (homeG.length + awayG.length);
          const hs = useOfficial ? ohs : homeG.length;
          const as = useOfficial ? oas : awayG.length;
          const active = isActive(r.id);
          return (
            <div key={r.id}
              onClick={() => onPickMatch && onPickMatch(r.id)}
              title="Click to filter the dashboard to this match"
              className="panel-2 px-3 py-2.5 cursor-pointer transition"
              style={{
                borderColor: active ? COLORS.gold : COLORS.line,
                background: active ? 'rgba(205,163,73,0.10)' : undefined,
                opacity: anyActive && !active ? 0.5 : 1,
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase flex items-center gap-1.5" style={{ color: COLORS.muted2, letterSpacing: '0.08em' }}>
                  <span className="legend-dot" style={{ background: sc, width: 7, height: 7 }}></span>{stage}
                </span>
                <span className="text-[10px] font-mono flex items-center gap-2" style={{ color: COLORS.muted2 }}>
                  {active && <span style={{ color: COLORS.gold2, fontWeight: 700 }}>● FILTERED</span>}
                  {fmtDate(r.date)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FlagImg abbr={home.abbreviation} size={18}/>
                <span className="text-sm flex-1 truncate" style={{ color: COLORS.ink }}>{home.short_name || home.name}</span>
                <span className="font-mono num-tabular" style={{ color: COLORS.ink, fontWeight: 700 }}>
                  {hs != null ? hs : '—'} <span style={{ color: COLORS.muted2 }}>–</span> {as != null ? as : '—'}
                </span>
                <span className="text-sm flex-1 truncate text-right" style={{ color: COLORS.ink }}>{away.short_name || away.name}</span>
                <FlagImg abbr={away.abbreviation} size={18}/>
              </div>
              {(() => {
                const chip = (goal) => (
                  <button key={goal.goal_number ?? `${goal.scorer}-${goal.minute}`}
                    onClick={(e) => { e.stopPropagation(); onPickGoal && onPickGoal(goal); }}
                    title={`${scorerLabel(goal) || ''} ${goal.minute != null ? goal.minute + "'" : ''} — open goal`}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded transition hover:ring-gold"
                    style={{ border: `1px solid ${COLORS.line}`, color: COLORS.muted, background: 'rgba(255,255,255,0.03)' }}>
                    {goal.own_goal ? 'Own Goal' : lastName(goal.scorer)} {goal.minute != null ? goal.minute + "'" : ''}{goal.live ? <span style={{ color: '#ff8d99' }}> ●</span> : null}
                  </button>
                );
                if (!homeG.length && !awayG.length) return null;
                return (
                  <div className="flex justify-between items-start gap-3 mt-2">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">{homeG.map(chip)}</div>
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0 justify-end">{awayG.map(chip)}</div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
      {rows.length > 3 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full mt-2 py-2 rounded text-xs font-mono transition"
          style={{ border: `1px solid ${COLORS.line}`, color: COLORS.gold2, background: 'rgba(255,255,255,0.02)' }}>
          {expanded ? '▴ Show fewer' : `▾ Show all ${rows.length} matches (${rows.length - 3} more)`}
        </button>
      )}
    </CardShell>
  );
}

const POSITION_META = [
  { code: 'FWD', label: 'Forwards',   color: '#c8102e' },
  { code: 'MID', label: 'Midfielders', color: '#cda349' },
  { code: 'DEF', label: 'Defenders',  color: '#5dade2' },
  { code: 'GK',  label: 'Goalkeepers', color: '#2a8a4c' },
];
function PositionCard({ data, onPosition, activePositions }) {
  const [hover, setHover] = React.useState(null);
  const counts = {};
  for (const d of data) counts[d.scorer_role || ''] = (counts[d.scorer_role || ''] || 0) + 1;
  const has = (c) => activePositions instanceof Set && activePositions.has(c);
  const rows = POSITION_META.filter(p => counts[p.code]);
  if (rows.length === 0) return <CardEmpty kicker="04 / Scorer position"/>;
  const total = rows.reduce((s, p) => s + counts[p.code], 0) || 1;

  const W = 240, H = 240, R = 104, r = 64;
  let acc = 0;
  const slices = rows.map(p => {
    const v = counts[p.code];
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += v;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    return { code: p.code, color: p.color, value: v, a0, a1 };
  });
  const wedge = (a0, a1, Ro, Ri) => {
    const x0=Math.cos(a0)*Ro, y0=Math.sin(a0)*Ro, x1=Math.cos(a1)*Ro, y1=Math.sin(a1)*Ro;
    const x0i=Math.cos(a0)*Ri, y0i=Math.sin(a0)*Ri, x1i=Math.cos(a1)*Ri, y1i=Math.sin(a1)*Ri;
    const large = (a1-a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${Ro} ${Ro} 0 ${large} 1 ${x1} ${y1} L ${x1i} ${y1i} A ${Ri} ${Ri} 0 ${large} 0 ${x0i} ${y0i} Z`;
  };
  const arc = (a0, a1, Ro, Ri) => {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
      return `M ${Ro} 0 A ${Ro} ${Ro} 0 1 1 ${-Ro} 0 A ${Ro} ${Ro} 0 1 1 ${Ro} 0 Z `
           + `M ${Ri} 0 A ${Ri} ${Ri} 0 1 0 ${-Ri} 0 A ${Ri} ${Ri} 0 1 0 ${Ri} 0 Z`;
    }
    return wedge(a0, a1, Ro, Ri);
  };
  const labelFor = (c) => (POSITION_META.find(p => p.code === c) || {}).label || c;
  const hv = hover ? counts[hover] || 0 : null;
  // Own goals carry no scorer position, so the donut covers fewer than total.
  const og = data.reduce((s, d) => s + (d.own_goal ? 1 : 0), 0);
  const excluded = data.length - total;
  const focus = hover
    ? { label: labelFor(hover), value: hv, sub: `${(hv / total * 100).toFixed(0)}%` }
    : excluded > 0
      ? { label: excluded === og ? `excl. ${og} own goal${og > 1 ? 's' : ''}` : `${excluded} unclassified`,
          value: total, sub: `of ${data.length}` }
      : { label: 'all goals', value: total, sub: '100%' };

  return (
    <CardShell kicker="04 / Scorer position">
      <div className="flex items-center gap-3">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <g transform={`translate(${W/2},${H/2})`}>
            {slices.map(s => {
              const isHover = hover === s.code;
              const Ro = isHover ? R + 8 : R;
              return (
                <path key={s.code}
                  d={arc(s.a0, s.a1, Ro, r)}
                  fill={s.color}
                  stroke={COLORS.bg0}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHover(s.code)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPosition && onPosition(s.code)}
                  style={{cursor:'pointer', transition:'all 0.15s'}}
                />
              );
            })}
            <text textAnchor="middle" y="-8" className="font-serif" fill={COLORS.ink} fontSize="32" fontWeight="600">
              {focus.value.toLocaleString()}
            </text>
            <text textAnchor="middle" y="12" fill={COLORS.gold2} fontSize="13" fontFamily="JetBrains Mono">{focus.sub}</text>
            <text textAnchor="middle" y="28" fill={COLORS.muted} fontSize="11">{focus.label}</text>
          </g>
        </svg>
        <div className="space-y-1.5 flex-1">
          {rows.map(p => {
            const n = counts[p.code];
            const isHover = hover === p.code;
            const active = has(p.code);
            return (
              <div key={p.code}
                onMouseEnter={() => setHover(p.code)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPosition && onPosition(p.code)}
                title={`Filter the pitch to goals by ${p.label.toLowerCase()}`}
                className="flex items-center justify-between gap-2 text-xs cursor-pointer rounded px-2 py-1 transition"
                style={{background: (isHover || active) ? 'rgba(205,163,73,0.08)' : 'transparent', border: `1px solid ${active ? p.color : 'transparent'}`}}>
                <span className="flex items-center gap-2" style={{color: COLORS.ink}}>
                  <span className="legend-dot" style={{background: p.color}}></span>
                  {p.label}
                </span>
                <span className="font-mono num-tabular" style={{color: active ? COLORS.gold2 : COLORS.muted}}>{n} <span style={{color: COLORS.muted2}}>· {(n/total*100).toFixed(0)}%</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}

function XGCard({ data, onXgFilter, activeXg }) {
  const withXg = data.filter(d => d.xg != null);
  const [hover, setHover] = React.useState(null);
  const buckets = new Array(10).fill(0);
  let sum = 0, lowest = null;
  for (const d of withXg) {
    const v = Number(d.xg);
    sum += v;
    const i = Math.min(9, Math.floor(v * 10));
    buckets[i]++;
    if (lowest == null || v < Number(lowest.xg)) lowest = d;
  }
  const n = withXg.length;
  const avg = n ? sum / n : 0;
  const max = Math.max(1, ...buckets);
  const W = 380, H = 200, P = 24;
  const bw = (W - P * 2) / buckets.length;
  const label = (i) => `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`;
  if (n === 0) return <CardEmpty kicker="05 / Expected goals"/>;
  return (
    <CardShell kicker="05 / Expected goals">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {buckets.map((v, i) => {
          const h = (v / max) * (H - P * 2 - 20);
          const isHover = hover === i;
          const lo = i / 10, hi = i === 9 ? 1.01 : (i + 1) / 10;
          const isActive = activeXg && Math.abs(activeXg[0] - lo) < 1e-9 && Math.abs(activeXg[1] - hi) < 1e-9;
          return (
            <g key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onXgFilter && onXgFilter(lo, hi)}
              style={{cursor: 'pointer'}}>
              <rect x={P + i*bw} y={P} width={bw} height={H-P*2} fill="transparent"/>
              <rect x={P + i*bw + 1} y={H-P-h} width={bw-2} height={h}
                fill={i < 2 ? COLORS.red : COLORS.gold}
                fillOpacity={isHover || isActive ? 1 : 0.85}
                stroke={isHover || isActive ? COLORS.gold2 : 'none'} strokeWidth={isHover || isActive ? 1 : 0}
                rx="2" style={{transition: 'all 0.12s'}}/>
              {i % 2 === 0 && <text x={P+i*bw+bw/2} y={H-8} fill={isHover ? COLORS.ink : COLORS.muted2} fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">{(i/10).toFixed(1)}</text>}
            </g>
          );
        })}
        <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={COLORS.line} strokeWidth="1"/>
      </svg>
      <div className="text-[11px] mt-1" style={{color: COLORS.muted, minHeight: 16}}>
        {hover != null ? (
          <><span className="font-mono" style={{color: COLORS.gold2}}>xG {label(hover)}</span> · <span style={{color: COLORS.ink}}>{buckets[hover]}</span> goal{buckets[hover]===1?'':'s'} · {(buckets[hover]/n*100).toFixed(0)}% of mapped</>
        ) : (
          <>Total <span className="font-mono" style={{color: COLORS.gold2}}>{sum.toFixed(2)} xG</span> · avg <span className="font-mono" style={{color: COLORS.gold2}}>{avg.toFixed(2)}</span>/goal</>
        )}
      </div>
    </CardShell>
  );
}

function BodyPartDonut({ data, onBodyPart }) {
  const counts = {};
  for (const d of data) counts[d.body_part] = (counts[d.body_part]||0)+1;
  const order = ['right_foot','left_foot','header','other'];
  const total = order.reduce((s,k)=>s+(counts[k]||0),0) || 1;
  const [hoveredSlice, setHoveredSlice] = React.useState(null);
  if (!data.length) return <CardEmpty kicker="01 / Body part"/>;

  const W=240, H=240, R=104, r=64;
  let acc = 0;

  const slices = order.map(k => {
    const v = counts[k] || 0;
    if (!v) return null;
    const a0 = (acc/total)*Math.PI*2 - Math.PI/2;
    acc += v;
    const a1 = (acc/total)*Math.PI*2 - Math.PI/2;
    return { key: k, value: v, a0, a1 };
  }).filter(Boolean);

  const _wedge = (a0, a1, Ro, Ri) => {
    const x0=Math.cos(a0)*Ro, y0=Math.sin(a0)*Ro, x1=Math.cos(a1)*Ro, y1=Math.sin(a1)*Ro;
    const x0i=Math.cos(a0)*Ri, y0i=Math.sin(a0)*Ri, x1i=Math.cos(a1)*Ri, y1i=Math.sin(a1)*Ri;
    const large = (a1-a0) > Math.PI ? 1 : 0;
    return `M ${x0} ${y0} A ${Ro} ${Ro} 0 ${large} 1 ${x1} ${y1} L ${x1i} ${y1i} A ${Ri} ${Ri} 0 ${large} 0 ${x0i} ${y0i} Z`;
  };
  // SVG can't draw a 360° arc in one command (start = end → empty path). For
  // the single-slice "100%" case, draw outer circle minus inner circle: outer
  // clockwise, inner counter-clockwise → nonzero fill leaves the centre hollow
  // with no seam (two 180° wedges would show seams top + bottom).
  const arc = (a0, a1, Ro, Ri) => {
    if (a1 - a0 >= Math.PI * 2 - 1e-6) {
      return `M ${Ro} 0 A ${Ro} ${Ro} 0 1 1 ${-Ro} 0 A ${Ro} ${Ro} 0 1 1 ${Ro} 0 Z `
           + `M ${Ri} 0 A ${Ri} ${Ri} 0 1 0 ${-Ri} 0 A ${Ri} ${Ri} 0 1 0 ${Ri} 0 Z`;
    }
    return _wedge(a0, a1, Ro, Ri);
  };

  // hoveredSlice may be a body-part with 0 count under the current filter (the
  // legend lets you hover any row), so guard against undefined.
  const hv = hoveredSlice ? (counts[hoveredSlice] || 0) : null;
  const focus = hoveredSlice
    ? { label: fmtBodyPart(hoveredSlice), value: hv, pct: total ? (hv/total*100).toFixed(1) : '0.0' }
    : { label: 'all goals', value: total, pct: '100' };

  return (
    <CardShell kicker="01 / Body part">
      <div className="flex items-center gap-3">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <g transform={`translate(${W/2},${H/2})`}>
            {slices.map(s => {
              const isHover = hoveredSlice === s.key;
              const Ro = isHover ? R + 8 : R;
              return (
                <path key={s.key}
                  d={arc(s.a0, s.a1, Ro, r)}
                  fill={BODY_COLORS[s.key]}
                  stroke={COLORS.bg0}
                  strokeWidth="1.5"
                  onMouseEnter={()=>setHoveredSlice(s.key)}
                  onMouseLeave={()=>setHoveredSlice(null)}
                  onClick={()=>onBodyPart && onBodyPart(s.key)}
                  style={{cursor:'pointer', transition:'all 0.15s'}}
                />
              );
            })}
            <text textAnchor="middle" y="-8" className="font-serif" fill={COLORS.ink} fontSize="32" fontWeight="600">
              {focus.value.toLocaleString()}
            </text>
            <text textAnchor="middle" y="12" fill={COLORS.gold2} fontSize="13" fontFamily="JetBrains Mono">{focus.pct}%</text>
            <text textAnchor="middle" y="28" fill={COLORS.muted} fontSize="11">{focus.label}</text>
          </g>
        </svg>
        <div className="space-y-1.5 flex-1">
          {order.map(k => {
            const v = counts[k] || 0;
            const pct = total ? (v/total*100) : 0;
            const isHover = hoveredSlice === k;
            return (
              <div key={k}
                onMouseEnter={()=>setHoveredSlice(k)}
                onMouseLeave={()=>setHoveredSlice(null)}
                onClick={()=>onBodyPart && onBodyPart(k)}
                title={`Filter the pitch to ${fmtBodyPart(k)}`}
                className="flex items-center justify-between gap-2 text-xs cursor-pointer rounded px-2 py-1 transition"
                style={{background: isHover ? 'rgba(205,163,73,0.08)' : 'transparent'}}>
                <span className="flex items-center gap-2" style={{color: COLORS.ink}}>
                  <span className="legend-dot" style={{background: BODY_COLORS[k]}}></span>
                  {fmtBodyPart(k)}
                </span>
                <span className="font-mono num-tabular" style={{color: COLORS.muted}}>{v} <span style={{color: COLORS.muted2}}>· {pct.toFixed(1)}%</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}

function CardShell({ title, kicker, right, children, height=260 }) {
  return (
    <div className="panel p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-1" style={{minHeight: 30}}>
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>{kicker}</div>
          {title && (
            <div className="font-serif text-xl mt-1" style={{fontWeight: 600, lineHeight: 1.1}}>{title}</div>
          )}
        </div>
        {right}
      </div>
      <div style={{minHeight: height, marginTop: 12, flex: 1}}>{children}</div>
    </div>
  );
}

// Shown in place of a card's content when the active filters leave it with no
// data — keeps the card in the grid (same size) instead of vanishing or
// rendering an empty chart.
function CardEmpty({ kicker, title }) {
  return (
    <CardShell kicker={kicker} title={title}>
      <div className="flex flex-col items-center justify-center text-center h-full" style={{gap: 10, minHeight: 200}}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.muted2} strokeWidth="1.6" style={{opacity: 0.55}}>
          <circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <div className="text-xs" style={{color: COLORS.muted}}>No goals match the current filters</div>
      </div>
    </CardShell>
  );
}

function MinuteBuckets({ data, onTimeFilter }) {
  const bucket = (m) => Math.min(18, Math.floor((m||0)/5));
  const buckets = new Array(19).fill(0);
  let withMinute = 0;
  for (const d of data) {
    if (d.minute == null) continue;
    withMinute++;
    const i = bucket(d.minute);
    buckets[i]++;
  }
  const max = Math.max(1, ...buckets);
  const W=380, H=200, P=24;
  const bw = (W - P*2) / buckets.length;
  const [hover, setHover] = React.useState(null);
  if (!data.length) return <CardEmpty kicker="02 / Timing"/>;
  const minuteLabel = (i) => i === 18 ? "90'+" : `${i*5}'–${i*5+4}'`;
  return (
    <CardShell kicker="02 / Timing">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {buckets.map((v,i)=>{
          const h = (v/max) * (H-P*2-20);
          const isLate = i*5 >= 75;
          const isHover = hover === i;
          return (
            <g key={i}
              onMouseEnter={()=>setHover(i)}
              onMouseLeave={()=>setHover(null)}
              onClick={()=>{
                if (!onTimeFilter) return;
                // bucket i covers minutes i*5..i*5+4; the last bucket (18) is "90'+"
                const lo = i*5;
                const hi = i === 18 ? 120 : i*5 + 4;
                onTimeFilter(lo, hi);
              }}
              style={{cursor:'pointer'}}>
              <rect x={P + i*bw} y={P} width={bw} height={H-P*2} fill="transparent"/>
              <rect x={P + i*bw + 1} y={H-P-h} width={bw-2} height={h}
                fill={isLate ? COLORS.gold : COLORS.grass2}
                fillOpacity={isHover ? 1 : (isLate ? 0.95 : 0.7)}
                stroke={isHover ? COLORS.gold2 : 'none'} strokeWidth={isHover ? 1 : 0}
                rx="2" style={{transition:'all 0.12s'}}/>
              {i%2===0 && <text x={P+i*bw+bw/2} y={H-8} fill={isHover ? COLORS.ink : COLORS.muted2} fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">{i*5}'</text>}
            </g>
          );
        })}
        <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={COLORS.line} strokeWidth="1"/>
      </svg>
      <div className="text-[11px] mt-1" style={{color: COLORS.muted, minHeight: 16}}>
        {hover != null && (
          <><span className="font-mono" style={{color: COLORS.gold2}}>{minuteLabel(hover)}</span> · <span style={{color: COLORS.ink}}>{buckets[hover]}</span> goals · {(buckets[hover]/withMinute*100).toFixed(1)}% of timed</>
        )}
      </div>
    </CardShell>
  );
}

function DistanceDist({ data, onDistFilter, onZone, activeZone }) {
  const buckets = new Array(13).fill(0);
  let total = 0;
  // Zone chip counts use box rectangles, not radial distance; must match the
  // predicates in app.jsx filters.zone.
  let nIn6 = 0, nIn18 = 0, nOut18 = 0;
  for (const d of data) {
    const v = distFromGoal(d.x, d.y);
    if (v == null) continue;
    const i = Math.min(buckets.length-1, Math.floor(v/2));
    buckets[i]++; total++;
    const inBox18 = d.x >= 102 && d.x <= 120 && d.y >= 18 && d.y <= 62;
    const inBox6 = d.x >= 114 && d.x <= 120 && d.y >= 30 && d.y <= 50;
    if (inBox6) nIn6++;
    if (inBox18) nIn18++;
    else nOut18++;
  }
  const max = Math.max(1, ...buckets);
  const W=380, H=200, P=24;
  const bw = (W - P*2) / buckets.length;
  let cum = 0; let median = 0;
  for (let i=0;i<buckets.length;i++) { cum += buckets[i]; if (cum >= total/2) { median = i*2; break; } }
  const [hover, setHover] = React.useState(null);
  if (!data.length) return <CardEmpty kicker="03 / Distance"/>;
  const distLabel = (i) => i === buckets.length-1 ? `${i*2} yd+` : `${i*2}–${i*2+2} yd`;
  const zones = [
    { key: '6yd',         label: '6-yd box',  count: nIn6 },
    { key: '18yd',        label: '18-yd box', count: nIn18 },
    { key: 'outside18yd', label: 'Outside',   count: nOut18 },
  ];
  const zonePills = (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {zones.map(z => {
        const active = activeZone === z.key;
        return (
          <button key={z.key}
            onClick={() => onZone && onZone(z.key)}
            disabled={z.count === 0}
            className="text-[11px] font-mono px-2 py-1 rounded transition"
            title={`Filter to goals ${z.key === 'outside18yd' ? 'outside the 18-yard box' : `inside the ${z.label}`}`}
            style={{
              border: `1px solid ${active ? COLORS.gold : COLORS.line}`,
              background: active ? 'rgba(205,163,73,0.14)' : 'transparent',
              color: active ? COLORS.gold2 : (z.count === 0 ? COLORS.muted2 : COLORS.ink),
              opacity: z.count === 0 ? 0.4 : 1,
              cursor: z.count === 0 ? 'not-allowed' : 'pointer',
              letterSpacing: '0.04em',
            }}>
            {z.label}
            <span className="ml-1.5 text-[10px]" style={{color: COLORS.muted2}}>{z.count}</span>
          </button>
        );
      })}
    </div>
  );
  return (
    <CardShell kicker="03 / Distance">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        {buckets.map((v,i)=>{
          const h = (v/max)*(H-P*2-20);
          const isHover = hover === i;
          return (
            <g key={i}
              onMouseEnter={()=>setHover(i)}
              onMouseLeave={()=>setHover(null)}
              onClick={()=>{
                if (!onDistFilter) return;
                // bucket i covers i*2..i*2+2 yards; last bucket (12) is "24 yd+"
                const lo = i*2;
                const hi = i === buckets.length - 1 ? 999 : i*2 + 2;
                onDistFilter(lo, hi);
              }}
              style={{cursor:'pointer'}}>
              <rect x={P+i*bw} y={P} width={bw} height={H-P*2} fill="transparent"/>
              <rect x={P+i*bw+1} y={H-P-h} width={bw-2} height={h}
                fill={COLORS.lf}
                fillOpacity={isHover ? 1 : 0.85}
                stroke={isHover ? COLORS.gold2 : 'none'} strokeWidth={isHover ? 1 : 0}
                rx="2" style={{transition:'all 0.12s'}}/>
              {i%2===0 && <text x={P+i*bw+bw/2} y={H-8} fill={isHover ? COLORS.ink : COLORS.muted2} fontSize="9" fontFamily="JetBrains Mono" textAnchor="middle">{i*2}</text>}
            </g>
          );
        })}
        <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke={COLORS.line} strokeWidth="1"/>
      </svg>
      <div className="text-[11px] mt-1" style={{color: COLORS.muted, minHeight: 16}}>
        {hover != null && (
          <><span className="font-mono" style={{color: COLORS.gold2}}>{distLabel(hover)}</span> · <span style={{color: COLORS.ink}}>{buckets[hover]}</span> goals · {(buckets[hover]/total*100).toFixed(1)}% of mapped {hover*2 < 16 && <span style={{color: COLORS.muted2}}>· inside box</span>}</>
        )}
      </div>
      {zonePills}
    </CardShell>
  );
}

function TopOpponents({ data, onOpponent }) {
  const counts = {};
  const oppAbbr = {};
  for (const d of data) {
    if (!d.opponent) continue;
    counts[d.opponent] = (counts[d.opponent]||0)+1;
    if (d.opponent_abbr) oppAbbr[d.opponent] = d.opponent_abbr;
  }
  const items = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const max = items[0]?.[1] || 1;
  const totalAll = data.length;
  const [hover, setHover] = React.useState(null);
  if (!data.length) return <CardEmpty kicker="06 / Most conceded"/>;
  return (
    <CardShell kicker="06 / Most conceded">
      <div className="space-y-1">
        {items.map(([opp, n], i) => {
          const isHover = hover === opp;
          return (
            <div key={opp}
              onMouseEnter={()=>setHover(opp)}
              onMouseLeave={()=>setHover(null)}
              onClick={()=>onOpponent && onOpponent(opp)}
              title={`Filter the pitch to goals conceded by ${opp}`}
              className="flex items-center gap-3 cursor-pointer rounded px-2 py-1 transition"
              style={{background: isHover ? 'rgba(205,163,73,0.08)' : 'transparent'}}>
              <div className="w-5 text-[11px] font-mono" style={{color: isHover ? COLORS.gold2 : COLORS.muted2}}>{String(i+1).padStart(2,'0')}</div>
              <FlagImg abbr={oppAbbr[opp]} size={18}/>
              <div className="flex-1 text-sm truncate" style={{color: COLORS.ink}}>{opp}</div>
              <div className="w-24 h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.04)'}}>
                <div className="h-full rounded-full" style={{width:(n/max*100)+'%', background: COLORS.red, opacity: isHover ? 1 : 0.85, transition:'opacity 0.12s'}}></div>
              </div>
              <div className="w-8 text-right font-mono text-sm num-tabular" style={{color: COLORS.red2}}>{n}</div>
            </div>
          );
        })}
      </div>
      <div className="text-[11px] mt-2 px-2" style={{color: COLORS.muted, minHeight: 16}}>
        {hover && (
          <><span style={{color: COLORS.ink}}>{hover}</span> has conceded <span className="font-mono" style={{color: COLORS.red2}}>{counts[hover]}</span> goal{counts[hover]===1?'':'s'} · {(counts[hover]/totalAll*100).toFixed(1)}% of all</>
        )}
      </div>
    </CardShell>
  );
}

window.Cards = Cards;
