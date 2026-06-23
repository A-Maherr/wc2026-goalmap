// Shared interaction engine for the shot fields (pitch + goal net). The ONLY
// thing that differs between the two views is the projection (where a goal sits)
// and the background SVG. Everything else — clustering, stacks, hover/sibling
// highlight, live pulsing, dim states, the sibling-avoiding tooltips, touch
// handling — lives here so the two views can never drift apart.

const SF_LOW_INFO = new Set(['unknown', 'other', '', null, undefined]);
function sfFixtureKey(d) { return `${d.date || ''}|${d.team || ''}|${d.opponent || ''}`; }

function sfColorField(color) {
  return color === 'situation' ? 'situation' : color === 'finish' ? 'finish_style' : color === 'body' ? 'body_part' : null;
}
function sfColorOf(d, color) {
  if (color === 'situation') return SITUATION_COLORS[d.situation] || COLORS.muted;
  if (color === 'finish') return FINISH_COLORS[d.finish_style] || COLORS.muted;
  if (color === 'body') return BODY_COLORS[d.body_part] || COLORS.muted;
  return COLORS.gold;
}
function sfPickStackColorLead(goals, color) {
  const colorField = sfColorField(color);
  if (!goals || !goals.length) return null;
  if (!colorField || goals.length === 1) return goals[0];
  const counts = new Map(); let firstKnown = null;
  for (const g of goals) {
    const v = g && g[colorField];
    if (SF_LOW_INFO.has(v)) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
    if (firstKnown == null) firstKnown = g;
  }
  if (counts.size === 0) return goals[0];
  let bestValue = null, bestCount = -1;
  for (const [val, n] of counts.entries()) if (n > bestCount) { bestValue = val; bestCount = n; }
  return goals.find(g => g && g[colorField] === bestValue) || firstKnown || goals[0];
}

// buckets present in the data, most-scored first (shared legend)
function sfLegendItems(dotsData, color) {
  const field = sfColorField(color);
  if (!field) return [];
  const cmap = color === 'situation' ? SITUATION_COLORS : color === 'finish' ? FINISH_COLORS : BODY_COLORS;
  const fmt = color === 'situation' ? fmtSituation : color === 'finish' ? fmtFinish : fmtBodyPart;
  const cnt = {};
  for (const d of dotsData) { const v = d[field]; if (v && v !== 'unknown') cnt[v] = (cnt[v] || 0) + 1; }
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).map(k => [fmt(k), cmap[k] || COLORS.muted, cnt[k]]);
}

function sfUseClusters(dotsData, clusterKey) {
  const clusters = React.useMemo(() => {
    const map = new Map();
    for (const d of dotsData) {
      const key = clusterKey(d);
      let bucket = map.get(key);
      if (!bucket) { bucket = { key, goals: [] }; map.set(key, bucket); }
      bucket.goals.push(d);
    }
    return [...map.values()];
  }, [dotsData, clusterKey]);
  const anyLive = React.useMemo(() => clusters.some(c => c.goals.some(g => g.live)), [clusters]);
  const orderedClusters = React.useMemo(
    () => anyLive ? [...clusters].sort((a, b) => (a.goals.some(g => g.live) ? 1 : 0) - (b.goals.some(g => g.live) ? 1 : 0)) : clusters,
    [clusters, anyLive]
  );
  return { clusters, anyLive, orderedClusters };
}

// tooltip placement: opposite the centroid of same-match siblings so it never
// covers the other dots of a brace / hat-trick. project() works in either field.
function sfMakeTipStyle(project, dotsData) {
  const TIP_W = 250, TIP_H = 165;
  return (hv, extra = {}) => {
    const cx = hv._x, cy = hv._y;
    const anchor = hv._stackLead || hv;
    const [hx, hy] = project(anchor);
    const fk = sfFixtureKey(anchor);
    let dx = 0, dy = 0, n = 0;
    for (const g of dotsData) {
      if (sfFixtureKey(g) !== fk) continue;
      const [gx, gy] = project(g); dx += gx - hx; dy += gy - hy; n++;
    }
    const goLeft = n > 1 ? dx > 0 : (cx > window.innerWidth / 2);
    const goUp = n > 1 ? dy > 0 : false;
    let left = goLeft ? cx - TIP_W - 16 : cx + 16;
    let top = goUp ? cy - TIP_H - 12 : cy + 12;
    left = Math.max(8, Math.min(left, window.innerWidth - TIP_W - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - TIP_H - 8));
    return { left, top, ...extra };
  };
}

// the dots + stacks layer, identical for both fields (project + dotScale differ)
function ClusterLayer({ orderedClusters, project, dotScale, color, hover, hoverFixture, anyLive, isTouch, tappedKey, setHover, setTappedKey, onPick, onPickStack }) {
  return (
    <g>
      {orderedClusters.map((cluster) => {
        const isStack = cluster.goals.length > 1;
        if (!isStack) {
          const d = cluster.goals[0];
          const [cx, cy] = project(d);
          const dotActive = hover && hover.match_key === d.match_key;
          const isSibling = !dotActive && hoverFixture && sfFixtureKey(d) === hoverFixture;
          const anyHover = hover && hover.match_key;
          const isLive = !!d.live;
          const baseR = (dotActive ? 9 : (isSibling ? 7 : 5.5)) * dotScale;
          const spotDim = anyLive && !isLive && !dotActive && !isSibling;
          const opacity = spotDim ? 0.6 : (anyHover ? (dotActive ? 1 : (isSibling ? 0.95 : 0.3)) : (isLive ? 1 : 0.88));
          return (
            <g key={d.match_key}>
              {isLive && (
                <g pointerEvents="none">
                  <circle cx={cx} cy={cy} r={baseR + 5} fill="#ff4d5e">
                    <animate attributeName="r" values={`${baseR + 4};${baseR + 11};${baseR + 4}`} dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.30;0.04;0.30" dur="1.6s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx={cx} cy={cy} r={baseR + 2.5} fill="none" stroke="#ff4d5e" strokeWidth="2">
                    <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="r" values={`${baseR + 2};${baseR + 6};${baseR + 2}`} dur="1.6s" repeatCount="indefinite"/>
                  </circle>
                </g>
              )}
              <circle className="dot" cx={cx} cy={cy} r={baseR}
                fill={sfColorOf(d, color)} fillOpacity={opacity}
                stroke={dotActive || isLive ? '#fff' : (isSibling ? COLORS.gold2 : 'rgba(0,0,0,0.5)')}
                strokeWidth={dotActive ? 2 : (isLive ? 1.8 : (isSibling ? 1.6 : 0.9))}
                onMouseEnter={(e) => setHover({ ...d, _x: e.clientX, _y: e.clientY })}
                onMouseMove={(e) => setHover(h => h && h.match_key === d.match_key ? { ...h, _x: e.clientX, _y: e.clientY } : h)}
                onMouseLeave={() => { if (!isTouch) setHover(null); }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isTouch && tappedKey !== d.match_key) { setTappedKey(d.match_key); setHover({ ...d, _x: e.clientX, _y: e.clientY }); }
                  else { setTappedKey(null); setHover(null); onPick(d); }
                }}
                style={{ cursor: 'pointer' }}/>
            </g>
          );
        }

        const lead = cluster.goals[0];
        const [cx, cy] = project(lead);
        const colorLead = sfPickStackColorLead(cluster.goals, color);
        const liveInStack = cluster.goals.some(g => g.live);
        const dotR = 7.5 * dotScale;
        const isStackHover = hover && hover._stackKey === cluster.key;
        const siblingsHere = hoverFixture ? cluster.goals.filter(g => sfFixtureKey(g) === hoverFixture).length : 0;
        const anyDotHover = hover && hover.match_key;
        const dimStack = anyDotHover && !isStackHover && siblingsHere === 0;
        const spotDimStack = anyLive && !liveInStack && !isStackHover && siblingsHere === 0;
        const countStr = String(cluster.goals.length);
        const badgeH = 11, charW = 4.4, padX = 4;
        const badgeW = Math.max(badgeH, countStr.length * charW + padX * 2);
        const bcx = cx + dotR - 1, bcy = cy - dotR + 1;
        return (
          <g key={cluster.key}
            onMouseEnter={(e) => setHover({ _stackKey: cluster.key, _stackCount: cluster.goals.length, _stackLead: lead, _stackGoals: cluster.goals, _x: e.clientX, _y: e.clientY })}
            onMouseMove={(e) => setHover(h => h && h._stackKey === cluster.key ? { ...h, _x: e.clientX, _y: e.clientY } : h)}
            onMouseLeave={() => { if (!isTouch) setHover(null); }}
            onClick={(e) => {
              e.stopPropagation();
              if (isTouch && tappedKey !== cluster.key) { setTappedKey(cluster.key); setHover({ _stackKey: cluster.key, _stackCount: cluster.goals.length, _stackLead: lead, _stackGoals: cluster.goals, _x: e.clientX, _y: e.clientY }); }
              else { setTappedKey(null); setHover(null); if (onPickStack) onPickStack(cluster.goals); }
            }}
            style={{ cursor: 'pointer' }}>
            {liveInStack && (
              <g pointerEvents="none">
                <circle cx={cx} cy={cy} r={dotR + 5} fill="#ff4d5e">
                  <animate attributeName="r" values={`${dotR + 4};${dotR + 12};${dotR + 4}`} dur="1.6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.30;0.04;0.30" dur="1.6s" repeatCount="indefinite"/>
                </circle>
                <circle cx={cx} cy={cy} r={dotR + 3} fill="none" stroke="#ff4d5e" strokeWidth="2">
                  <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
                  <animate attributeName="r" values={`${dotR + 2};${dotR + 7};${dotR + 2}`} dur="1.6s" repeatCount="indefinite"/>
                </circle>
              </g>
            )}
            {siblingsHere > 0 && (
              <circle cx={cx} cy={cy} r={dotR + 4} fill="none" stroke={COLORS.gold2} strokeWidth="1.8" strokeOpacity="0.9" pointerEvents="none"/>
            )}
            <circle className="dot" cx={cx} cy={cy} r={dotR}
              fill={sfColorOf(colorLead, color)}
              fillOpacity={spotDimStack ? 0.6 : (dimStack ? 0.3 : (isStackHover ? 1 : 0.92))}
              stroke={isStackHover || liveInStack ? '#fff' : 'rgba(0,0,0,0.5)'}
              strokeWidth={isStackHover ? 2 : (liveInStack ? 1.8 : 0.9)}/>
            <rect x={bcx - badgeW / 2} y={bcy - badgeH / 2} width={badgeW} height={badgeH}
              rx={badgeH / 2} ry={badgeH / 2} fill={COLORS.gold} stroke={COLORS.bg0} strokeWidth="1"
              opacity={spotDimStack ? 0.7 : (dimStack ? 0.4 : 1)}/>
            <text x={bcx} y={bcy} dominantBaseline="central" fill={COLORS.bg0} fontSize="8.5" fontWeight="700"
              fontFamily="JetBrains Mono" textAnchor="middle" style={{ pointerEvents: 'none', letterSpacing: '-0.01em' }}>
              {countStr}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// single-goal tooltip (rich). `extra` is appended before the footer (net adds height).
function GoalTooltip({ hover, tipStyle, isTouch, onPick, setHover, setTappedKey, extra }) {
  if (!hover || hover._stackKey || !hover.match_key) return null;
  const p = String(hover.score_after_goal || '').split(':');
  const hasScore = p.length === 2;
  const homeName = hover.home_team || hover.team;
  const awayName = hover.away_team || hover.opponent;
  const homeAbbr = hover.home_abbr || hover.team_abbr;
  const awayAbbr = hover.away_abbr || hover.opponent_abbr;
  const homeScored = hover.scorer_side ? hover.scorer_side === 'home' : true;
  const gold = { color: COLORS.gold2, fontWeight: 800 };
  const plain = { color: COLORS.ink, fontWeight: 700 };
  return (
    <div className="tt" style={tipStyle(hover, { cursor: 'pointer', pointerEvents: isTouch ? 'auto' : 'none' })}
      onClick={(e) => { e.stopPropagation(); const g = hover; setTappedKey(null); setHover(null); if (onPick) onPick(g); }}>
      <div className="flex items-center gap-2 mb-2">
        {hover.goal_number != null && (
          <span className="font-mono uppercase" style={{ color: COLORS.gold2, fontSize: 13, fontWeight: 800, letterSpacing: '0.10em' }}>GOAL #{hover.goal_number}</span>
        )}
        {hover.live && (
          <span className="font-mono uppercase" style={{ color: '#ff8d99', fontSize: 10, fontWeight: 800, letterSpacing: '0.10em' }}>● LIVE</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>
        <FlagImg abbr={homeAbbr} size={18}/>
        <span style={{ color: homeScored ? COLORS.gold2 : COLORS.ink, fontWeight: 600 }}>{homeName}</span>
        {hasScore && <span className="font-mono num-tabular" style={homeScored ? gold : plain}>{p[0]}</span>}
        <span style={{ color: COLORS.muted, fontStyle: 'italic' }}>vs</span>
        {hasScore && <span className="font-mono num-tabular" style={homeScored ? plain : gold}>{p[1]}</span>}
        <span style={{ color: homeScored ? COLORS.ink : COLORS.gold2, fontWeight: 600 }}>{awayName}</span>
        <FlagImg abbr={awayAbbr} size={18}/>
      </div>
      {hover.scorer && (
        <div className="font-serif mb-1" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.15 }}>
          {hover.scorer}
          {hover.minute != null && <span className="font-mono ml-2" style={{ fontSize: 12, color: COLORS.muted }}>{hover.minute}'</span>}
        </div>
      )}
      {hover.xg != null && (
        <div className="font-mono text-xs" style={{ color: COLORS.muted }}>xG <span style={{ color: COLORS.gold2 }}>{Number(hover.xg).toFixed(2)}</span></div>
      )}
      {extra}
      <div className="mt-2 pt-2 text-[10px]" style={{ color: COLORS.muted2, borderTop: `1px solid ${COLORS.line}` }}>Tap to open detail →</div>
    </div>
  );
}

// stack tooltip. stackInfo(lead) lets a field name a special spot (e.g. penalty).
function StackTooltip({ hover, tipStyle, isTouch, onPickStack, setHover, setTappedKey, stackInfo }) {
  if (!hover || !hover._stackKey) return null;
  const info = (stackInfo && stackInfo(hover._stackLead)) || { title: 'Stacked goals', subtitle: 'goals at this exact spot' };
  return (
    <div className="tt" style={tipStyle(hover, { cursor: 'pointer', pointerEvents: isTouch ? 'auto' : 'none' })}
      onClick={(e) => { e.stopPropagation(); const g = hover._stackGoals; setTappedKey(null); setHover(null); if (onPickStack && g) onPickStack(g); }}>
      <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: COLORS.muted2, letterSpacing: '0.14em' }}>{info.title}</div>
      <div className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: COLORS.gold2, lineHeight: 1, paddingBottom: 2 }}>{hover._stackCount}</div>
      <div className="text-[11px] mt-1" style={{ color: COLORS.muted }}>{info.subtitle}</div>
      <div className="mt-2 pt-2 text-[10px]" style={{ color: COLORS.muted2, borderTop: `1px solid ${COLORS.line}` }}>Tap to view the list →</div>
    </div>
  );
}

// shared panel header — same "N goals plotted in M matches" line for both views
function FieldHeader({ title, dotsData, headerCenter }) {
  const matches = new Set(dotsData.map(d => String(d.match_key || '').split('-')[0]).filter(Boolean)).size;
  return (
    <div className="flex items-center gap-4 flex-wrap mb-5">
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-widest" style={{ color: COLORS.muted2, letterSpacing: '0.14em' }}>{title}</div>
        <div className="font-serif text-2xl mt-1" style={{ fontWeight: 600 }}>
          <span className="num-tabular">{dotsData.length.toLocaleString()}</span> goals plotted
          <span style={{ color: COLORS.muted, fontStyle: 'italic', fontWeight: 400 }}> in </span>
          <span className="num-tabular">{matches.toLocaleString()}</span>
          <span style={{ color: COLORS.muted, fontStyle: 'italic', fontWeight: 400 }}> matches</span>
        </div>
      </div>
      {headerCenter && (
        <div className="order-last w-full flex justify-center mt-2 sm:order-none sm:flex-1 sm:w-auto sm:mt-0">{headerCenter}</div>
      )}
      <div className="shrink-0">
        <a href="https://github.com/A-Maherr/wc2026-goalmap" target="_blank" rel="noopener noreferrer"
           title="Built by Ahmed — view the source on GitHub"
           className="inline-flex items-center font-mono hover:opacity-80"
           style={{ gap: 7, fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.04em', padding: '7px 15px', borderRadius: 999,
             textDecoration: 'none', whiteSpace: 'nowrap', color: COLORS.ink, border: `1px solid ${COLORS.gold2}`,
             background: 'rgba(205,163,73,0.16)', boxShadow: '0 0 0 4px rgba(205,163,73,0.05)', transition: 'opacity .15s' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Built by Ahmed
        </a>
      </div>
    </div>
  );
}

// shared "Color by" segment + legend bar
function FieldControls({ color, setColor, dotsData }) {
  const colorOpts = [{ key: 'body', label: 'Body part' }, { key: 'situation', label: 'Situation' }, { key: 'finish', label: 'Finish style' }];
  const legend = sfLegendItems(dotsData, color);
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: COLORS.muted2, letterSpacing: '0.14em' }}>Color by</span>
        <div className="seg">
          {colorOpts.map(o => <button key={o.key} className={color === o.key ? 'on' : ''} onClick={() => setColor(o.key)}>{o.label}</button>)}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {legend.map(([l, c]) => (
          <span key={l} className="text-[11px] flex items-center gap-1.5" style={{ color: COLORS.muted }}>
            <span className="legend-dot" style={{ background: c }}></span>{l}
          </span>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  sfFixtureKey, sfColorField, sfColorOf, sfPickStackColorLead, sfLegendItems,
  sfUseClusters, sfMakeTipStyle, ClusterLayer, GoalTooltip, StackTooltip,
  FieldHeader, FieldControls,
});
