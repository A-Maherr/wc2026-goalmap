function Pitch({ data, color, setColor, onPick, onPickStack, hover, setHover }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState(() => {
    const vw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 600;
    return { w: Math.max(280, Math.min(600, vw - 32)), h: 750 };
  });

  const [tappedKey, setTappedKey] = React.useState(null);
  const isTouch = React.useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia
      && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    []
  );

  // Phones render the pitch as a fixed-viewBox SVG that scales with CSS (dots
  // and lines scale together — robust at any width). Desktop keeps the measured
  // pixel layout untouched.
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(max-width: 768px)').matches
  );
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);

  const dotsData = React.useMemo(() => data.filter(d => d.x != null && d.y != null), [data]);
  const X_MAX = 120;
  const X_MIN = React.useMemo(() => {
    const xs = dotsData.map(d => d.x).filter(x => typeof x === 'number');
    if (xs.length === 0) return 60;
    const minX = Math.min(...xs);
    if (minX >= 60) return 60;
    const snapped = Math.floor((minX - 4) / 10) * 10;
    return Math.max(0, Math.min(60, snapped));
  }, [dotsData]);
  const VIEW_W_M = 80;
  const VIEW_H_M = X_MAX - X_MIN;

  const FIFA_FULL_M = 105;
  const FIFA_WIDTH_M = 68;
  const YD_TO_M = FIFA_FULL_M / 120;            
  const PAD = 24;
  const fifaRatio = (VIEW_H_M * YD_TO_M) / FIFA_WIDTH_M;

  React.useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const hCap = 660;
    const measure = () => {
      const vw = (typeof window !== 'undefined' && window.innerWidth) || 1e9;
      const containerW = Math.min(el.getBoundingClientRect().width, vw);
      if (!containerW) return;
      let W = containerW;
      let H = (W - 2*PAD) * fifaRatio + 2*PAD;
      if (H > hCap) {
        H = hCap;
        W = (H - 2*PAD) / fifaRatio + 2*PAD;
        if (W > containerW) { W = containerW; H = (W - 2*PAD) * fifaRatio + 2*PAD; }
      }
      setSize(prev => (Math.abs(prev.w - W) < 0.5 && Math.abs(prev.h - H) < 0.5) ? prev : {w: W, h: H});
    };
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    measure();
    // Tailwind Play CDN applies styles after first paint, so the real layout
    // width can land late — re-measure so we never stick at the seed size.
    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 450);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [fifaRatio]);

  // Mobile: fixed 600-unit viewBox (the SVG scales via CSS). Desktop: measured
  // pixel size. sx/sy below operate in whichever space W/H are in, so both paths
  // share the same geometry math.
  const W = isMobile ? 600 : size.w;
  const H = isMobile ? ((600 - 2*PAD) * fifaRatio + 2*PAD) : size.h;
  // Desktop scales fixed-pixel dots down with pitch width so they don't crowd;
  // mobile dots are in viewBox units and scale with the SVG, so no extra scale.
  const dotScale = isMobile ? 1 : Math.max(0.6, Math.min(1, W / 520));
  const sx = data_y => PAD + (data_y / VIEW_W_M) * (W - PAD*2);
  const sy = data_x => PAD + ((X_MAX - data_x) / VIEW_H_M) * (H - PAD*2);


  // Group dots by (x, y) bucket — penalties all snap to (108, 40), so they
  // collapse into one cluster instead of overlapping dots.
  const clusters = React.useMemo(() => {
    const map = new Map();
    for (const d of dotsData) {
      const key = `${d.x.toFixed(1)}|${d.y.toFixed(1)}`;
      let bucket = map.get(key);
      if (!bucket) { bucket = { key, x: d.x, y: d.y, goals: [] }; map.set(key, bucket); }
      bucket.goals.push(d);
    }
    return [...map.values()];
  }, [dotsData]);

  const anyLive = React.useMemo(
    () => clusters.some(c => c.goals.some(g => g.live)),
    [clusters]
  );
  const orderedClusters = React.useMemo(
    () => anyLive
      ? [...clusters].sort((a, b) => (a.goals.some(g => g.live) ? 1 : 0) - (b.goals.some(g => g.live) ? 1 : 0))
      : clusters,
    [clusters, anyLive]
  );

  const fixtureKey = (d) => `${d.date||''}|${d.team||''}|${d.opponent||''}`;
  const hoverFixture = hover && hover.match_key ? fixtureKey(hover) : null;

  // Place the tooltip on the side pointing away from same-match sibling goals,
  // so it never covers the other dots of a brace / hat-trick. Clamps to viewport.
  const TIP_W = 250, TIP_H = 165;
  const tipStyle = (hv, extra = {}) => {
    const cx = hv._x, cy = hv._y;
    const anchor = hv._stackLead || hv;
    const hx = sx(anchor.y), hy = sy(anchor.x);
    const fk = fixtureKey(anchor);
    let dx = 0, dy = 0, n = 0;
    for (const g of dotsData) {
      if (fixtureKey(g) !== fk) continue;
      dx += sx(g.y) - hx; dy += sy(g.x) - hy; n++;
    }
    const goLeft = n > 1 ? dx > 0 : (cx > window.innerWidth / 2);
    const goUp = n > 1 ? dy > 0 : false;
    let left = goLeft ? cx - TIP_W - 16 : cx + 16;
    let top = goUp ? cy - TIP_H - 12 : cy + 12;
    left = Math.max(8, Math.min(left, window.innerWidth - TIP_W - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - TIP_H - 8));
    return { left, top, ...extra };
  };

  const colorOf = (d) => {
    if (color === 'body') return BODY_COLORS[d.body_part] || COLORS.muted;
    if (color === 'situation') return SITUATION_COLORS[d.situation] || COLORS.muted;
    if (color === 'finish') return FINISH_COLORS[d.finish_style] || COLORS.muted;
    return COLORS.gold;
  };

  const colorField = color === 'body' ? 'body_part'
                   : color === 'situation' ? 'situation'
                   : color === 'finish' ? 'finish_style'
                   : null;
  const _LOW_INFO_VALUES = new Set(['unknown', 'other', '', null, undefined]);
  const pickStackColorLead = (goals) => {
    if (!goals || goals.length === 0) return null;
    if (!colorField) return goals[0];
    if (goals.length === 1) return goals[0];
    const counts = new Map();
    let firstKnown = null;
    for (const g of goals) {
      const v = g && g[colorField];
      if (_LOW_INFO_VALUES.has(v)) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
      if (firstKnown == null) firstKnown = g;
    }
    if (counts.size === 0) return goals[0]; 
    let bestValue = null, bestCount = -1;
    for (const [val, n] of counts.entries()) {
      if (n > bestCount) { bestValue = val; bestCount = n; }
    }
    return goals.find(g => g && g[colorField] === bestValue) || firstKnown || goals[0];
  };

  const colorOpts = [
    {key:'body', label:'Body part'},
    {key:'situation', label:'Situation'},
    {key:'finish', label:'Finish style'},
  ];

  const legendItems = React.useMemo(() => {
    const field = color === 'body' ? 'body_part'
                : color === 'situation' ? 'situation'
                : color === 'finish' ? 'finish_style' : null;
    if (!field) return [];
    const cmap = color === 'body' ? BODY_COLORS : color === 'situation' ? SITUATION_COLORS : FINISH_COLORS;
    const fmt = color === 'body' ? fmtBodyPart : color === 'situation' ? fmtSituation : fmtFinish;
    // Only buckets actually on the pitch, most-scored first — no empty entries.
    const cnt = {};
    for (const d of dotsData) { const v = d[field]; if (v && v !== 'unknown') cnt[v] = (cnt[v] || 0) + 1; }
    return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).map(k => [fmt(k), cmap[k] || COLORS.muted]);
  }, [color, dotsData]);

  // Penalty area: data x ∈ [102, 120], y ∈ [18, 62]
  const boxLeft = sx(18), boxRight = sx(62), boxBottom = sy(102), boxTop = sy(120);
  // 6-yard area: x ∈ [114, 120], y ∈ [30, 50]
  const sixLeft = sx(30), sixRight = sx(50), sixBottom = sy(114), sixTop = sy(120);
  // Penalty arc + centre-circle radius — 10 yards in StatsBomb's 120×80 system
  // (not the metric 9.15, which would undersize the arcs ~9% here).
  const arcRadiusY = (10 / VIEW_H_M) * (H - PAD*2);
  const arcRadiusX = (10 / VIEW_W_M) * (W - PAD*2);

  return (
    <div className="panel p-6">
      <div className="flex items-center gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing: '0.14em'}}>The shot map</div>
          <div className="font-serif text-2xl mt-1" style={{fontWeight: 600}}>
            <span className="num-tabular">{dotsData.length.toLocaleString()}</span> goals plotted
            <span style={{color: COLORS.muted, fontStyle: 'italic', fontWeight: 400}}>
              {' '}in{' '}
            </span>
            <span className="num-tabular">{(new Set(dotsData.map(d => String(d.match_key || '').split('-')[0]).filter(Boolean))).size.toLocaleString()}</span>
            <span style={{color: COLORS.muted, fontStyle: 'italic', fontWeight: 400}}>
              {' '}matches
            </span>
          </div>
        </div>
        <div className="w-full flex justify-start mt-2 sm:flex-1 sm:justify-center sm:w-auto sm:mt-0" style={{minWidth: 0}}>
          <a href="https://github.com/A-Maherr/wc2026-goalmap" target="_blank" rel="noopener noreferrer"
             title="Built by Ahmed — view the source on GitHub"
             className="inline-flex items-center font-mono hover:opacity-80"
             style={{
               gap: 7, fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.04em',
               padding: '7px 15px', borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap',
               color: COLORS.ink, border: `1px solid ${COLORS.gold2}`,
               background: 'rgba(205,163,73,0.16)', boxShadow: '0 0 0 4px rgba(205,163,73,0.05)',
               transition: 'opacity .15s',
             }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{flexShrink: 0}}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 014 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Built by Ahmed
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Color by</span>
          <div className="seg">
            {colorOpts.map(o => <button key={o.key} className={color===o.key?'on':''} onClick={()=>setColor(o.key)}>{o.label}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {legendItems.map(([l,c])=>(
            <span key={l} className="text-[11px] flex items-center gap-1.5" style={{color: COLORS.muted}}>
              <span className="legend-dot" style={{background: c}}></span>{l}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4 items-stretch">
        <div className="flex-1 relative flex justify-center" style={{minWidth: 0}}>
          <svg ref={ref}
            {...(isMobile
              ? { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet',
                  style: { display: 'block', width: '100%', height: 'auto', maxWidth: 640, margin: '0 auto' } }
              : { width: W, height: H, style: { display: 'block' } })}
            onClick={()=>{ if (isTouch) { setHover(null); setTappedKey(null); } }}>
            <defs>
              <linearGradient id="grassGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1a5e30"/>
                <stop offset="100%" stopColor="#155026"/>
              </linearGradient>
            </defs>

            {/* turf */}
            <rect x="0" y="0" width={W} height={H} rx="8" fill="url(#grassGrad)"/>

            {/* Mowing stripes — 6-yard cadence from the goal line, alternating
                light/dark overlays, extended across the whole visible region. */}
            {(() => {
              const breaks = [];
              for (let v = 120; v >= X_MIN; v -= 6) breaks.push(v);
              if (breaks[breaks.length - 1] !== X_MIN) breaks.push(X_MIN);
              return breaks.slice(0, -1).map((hi, i) => {
                const lo = breaks[i + 1];
                const yTop = sy(hi);
                const yBot = sy(lo);
                const fill = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
                return (
                  <rect key={i}
                    x={PAD} y={yTop}
                    width={W - PAD*2} height={yBot - yTop}
                    fill={fill}
                  />
                );
              });
            })()}

            {/* Straight lines go in a crispEdges group; arcs stay outside it
                so they keep geometricPrecision smoothing. */}
            <g shapeRendering="crispEdges">
              {/* Outer frame */}
              <rect x={PAD} y={PAD} width={W-PAD*2} height={H-PAD*2} className="pitch-line"/>
              {/* Halfway line (pitch x = 60) */}
              <line x1={PAD} y1={sy(60)} x2={W-PAD} y2={sy(60)} className="pitch-line"/>
              {/* Attacking penalty area: x ∈ [102, 120], y ∈ [18, 62] */}
              <rect
                x={boxLeft} y={boxTop}
                width={boxRight - boxLeft} height={boxBottom - boxTop}
                className="pitch-line"
              />
              {/* Attacking 6-yard box: x ∈ [114, 120], y ∈ [30, 50] */}
              <rect
                x={sixLeft} y={sixTop}
                width={sixRight - sixLeft} height={sixBottom - sixTop}
                className="pitch-line"
              />
              {/* Defensive-half boxes — only when the view drops past their x boundary */}
              {X_MIN <= 18 && (
                <rect
                  x={sx(18)} y={sy(18)}
                  width={sx(62) - sx(18)} height={sy(0) - sy(18)}
                  className="pitch-line"
                />
              )}
              {X_MIN <= 6 && (
                <rect
                  x={sx(30)} y={sy(6)}
                  width={sx(50) - sx(30)} height={sy(0) - sy(6)}
                  className="pitch-line"
                />
              )}
            </g>

            {/* Centre dot */}
            <circle cx={sx(40)} cy={sy(60)} r="2" fill="rgba(255,255,255,0.55)"/>
            {/* Centre-circle arc — attacking half. Endpoints at y = 30 / 50. */}
            <path
              d={`M ${sx(30)} ${sy(60)} A ${arcRadiusX} ${arcRadiusY} 0 0 1 ${sx(50)} ${sy(60)}`}
              className="pitch-line"
            />
            {/* Centre-circle arc — defensive half, only past halfway. Sweep
                flag 0 reverses the curve so the two arcs complete the circle. */}
            {X_MIN < 60 && (
              <path
                d={`M ${sx(30)} ${sy(60)} A ${arcRadiusX} ${arcRadiusY} 0 0 0 ${sx(50)} ${sy(60)}`}
                className="pitch-line"
              />
            )}
            {/* Attacking penalty spot */}
            <circle cx={sx(40)} cy={sy(108)} r="2" fill="rgba(255,255,255,0.55)"/>
            {/* Attacking penalty arc — the half outside the box. Spot (108, 40),
                radius 10, meets box edge x=102 at y = 40 ± 8 → (32, 102)/(48, 102). */}
            <path
              d={`M ${sx(32)} ${sy(102)} A ${arcRadiusX} ${arcRadiusY} 0 0 0 ${sx(48)} ${sy(102)}`}
              className="pitch-line"
            />
            {/* Defensive penalty spot + arc (mirrored) */}
            {X_MIN <= 12 && (
              <circle cx={sx(40)} cy={sy(12)} r="2" fill="rgba(255,255,255,0.55)"/>
            )}
            {X_MIN <= 12 && (
              <path
                d={`M ${sx(32)} ${sy(18)} A ${arcRadiusX} ${arcRadiusY} 0 0 1 ${sx(48)} ${sy(18)}`}
                className="pitch-line"
              />
            )}

            {/* Goal — 8 yards wide (y ∈ [36, 44]), mesh net in a gold frame.
                Depth in pitch units so the net scales with the pitch. */}
            {(() => {
              const goalDepthYd = 2.0;
              const yardPx = (H - PAD * 2) / VIEW_H_M;
              const depthPx = goalDepthYd * yardPx;
              const left = sx(36);
              const right = sx(44);
              const front = sy(120);
              const back = front - depthPx;
              const verticalStrands = 8;
              const horizontalStrands = 4;
              return (
                <g shapeRendering="crispEdges">
                  <rect
                    x={left} y={back}
                    width={right - left} height={depthPx}
                    fill="rgba(0,0,0,0.30)"
                  />
                  {Array.from({length: verticalStrands}, (_, i) => {
                    const x = left + ((i + 1) / (verticalStrands + 1)) * (right - left);
                    return (
                      <line key={`vstrand-${i}`}
                        x1={x} y1={back} x2={x} y2={front}
                        stroke="rgba(255,255,255,0.35)" strokeWidth="0.6"
                      />
                    );
                  })}
                  {Array.from({length: horizontalStrands}, (_, i) => {
                    const y = back + ((i + 1) / (horizontalStrands + 1)) * depthPx;
                    return (
                      <line key={`hstrand-${i}`}
                        x1={left} y1={y} x2={right} y2={y}
                        stroke="rgba(255,255,255,0.35)" strokeWidth="0.6"
                      />
                    );
                  })}
                  {/* Frame: two posts + crossbar */}
                  <line x1={left}  y1={front} x2={left}  y2={back}
                    stroke={COLORS.gold2} strokeWidth="2.5" strokeLinecap="square"/>
                  <line x1={right} y1={front} x2={right} y2={back}
                    stroke={COLORS.gold2} strokeWidth="2.5" strokeLinecap="square"/>
                  <line x1={left}  y1={back}  x2={right} y2={back}
                    stroke={COLORS.gold2} strokeWidth="2.5" strokeLinecap="square"/>
                </g>
              );
            })()}

            {/* Direction indicator at the bottom of the pitch */}
            <text x={W/2} y={H - 10} fill={COLORS.muted2} fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
              ↑ ATTACKING DIRECTION ↑
            </text>

            {(
              <g>
                {orderedClusters.map((cluster) => {
                  const isStack = cluster.goals.length > 1;

                  if (!isStack) {
                    const d = cluster.goals[0];
                    const dotActive = hover && hover.match_key === d.match_key;
                    const isSibling = !dotActive && hoverFixture && fixtureKey(d) === hoverFixture;
                    const isActive = dotActive || isSibling;
                    const anyHover = hover && hover.match_key;
                    const isLive = !!d.live;
                    const baseR = (dotActive ? 9 : (isSibling ? 7 : 5.5)) * dotScale;
                    const spotDim = anyLive && !isLive && !dotActive && !isSibling;
                    const opacity = spotDim ? 0.6
                      : (anyHover ? (dotActive ? 1 : (isSibling ? 0.95 : 0.3)) : (isLive ? 1 : 0.88));
                    return (
                      <g key={d.match_key}>
                        {isLive && (
                          <g pointerEvents="none">
                            <circle cx={sx(d.y)} cy={sy(d.x)} r={baseR + 5} fill="#ff4d5e">
                              <animate attributeName="r" values={`${baseR+4};${baseR+11};${baseR+4}`} dur="1.6s" repeatCount="indefinite"/>
                              <animate attributeName="opacity" values="0.30;0.04;0.30" dur="1.6s" repeatCount="indefinite"/>
                            </circle>
                            <circle cx={sx(d.y)} cy={sy(d.x)} r={baseR + 2.5} fill="none" stroke="#ff4d5e" strokeWidth="2">
                              <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
                              <animate attributeName="r" values={`${baseR + 2};${baseR + 6};${baseR + 2}`} dur="1.6s" repeatCount="indefinite"/>
                            </circle>
                          </g>
                        )}
                        <circle
                          className="dot"
                          cx={sx(d.y)} cy={sy(d.x)}
                          r={baseR}
                          fill={colorOf(d)}
                          fillOpacity={opacity}
                          stroke={dotActive || isLive ? '#fff' : (isSibling ? COLORS.gold2 : 'rgba(0,0,0,0.5)')}
                          strokeWidth={dotActive ? 2 : (isLive ? 1.8 : (isSibling ? 1.6 : 0.9))}
                          onMouseEnter={(e)=>setHover({...d, _x: e.clientX, _y: e.clientY})}
                          onMouseMove={(e)=>setHover(h => h && h.match_key===d.match_key ? {...h, _x: e.clientX, _y: e.clientY} : h)}
                          onMouseLeave={()=>{ if (!isTouch) setHover(null); }}
                          onClick={(e)=>{
                            e.stopPropagation();
                            if (isTouch && tappedKey !== d.match_key) {
                              setTappedKey(d.match_key);
                              setHover({...d, _x: e.clientX, _y: e.clientY});
                            } else {
                              setTappedKey(null);
                              setHover(null);
                              onPick(d);
                            }
                          }}
                          style={{cursor:'pointer'}}
                        />
                      </g>
                    );
                  }

                  // Stack — single dot with a count badge that widens to fit the digits.
                  const lead = cluster.goals[0];
                  const colorLead = pickStackColorLead(cluster.goals);
                  const liveInStack = cluster.goals.some(g => g.live);
                  const dotR = 7.5 * dotScale;
                  const cx = sx(cluster.y);
                  const cy = sy(cluster.x);
                  const isStackHover = hover && hover._stackKey === cluster.key;
                  const siblingsHere = hoverFixture
                    ? cluster.goals.filter(g => fixtureKey(g) === hoverFixture).length
                    : 0;
                  const anyDotHover = hover && hover.match_key;
                  const dimStack = anyDotHover && !isStackHover && siblingsHere === 0;
                  const spotDimStack = anyLive && !liveInStack && !isStackHover && siblingsHere === 0;

                  const countStr = String(cluster.goals.length);
                  const badgeH = 11;
                  const charW = 4.4;
                  const padX = 4;
                  const badgeW = Math.max(badgeH, countStr.length * charW + padX * 2);
                  const bcx = cx + dotR - 1;
                  const bcy = cy - dotR + 1;

                  return (
                    <g key={cluster.key}
                      onMouseEnter={(e)=>setHover({_stackKey: cluster.key, _stackCount: cluster.goals.length, _stackLead: lead, _stackGoals: cluster.goals, _x: e.clientX, _y: e.clientY})}
                      onMouseMove={(e)=>setHover(h => h && h._stackKey === cluster.key ? {...h, _x: e.clientX, _y: e.clientY} : h)}
                      onMouseLeave={()=>{ if (!isTouch) setHover(null); }}
                      onClick={(e)=>{
                        e.stopPropagation();
                        if (isTouch && tappedKey !== cluster.key) {
                          setTappedKey(cluster.key);
                          setHover({_stackKey: cluster.key, _stackCount: cluster.goals.length, _stackLead: lead, _stackGoals: cluster.goals, _x: e.clientX, _y: e.clientY});
                        } else {
                          setTappedKey(null);
                          setHover(null);
                          if (onPickStack) onPickStack(cluster.goals);
                        }
                      }}
                      style={{cursor:'pointer'}}>
                      {liveInStack && (
                        <g pointerEvents="none">
                          <circle cx={cx} cy={cy} r={dotR + 5} fill="#ff4d5e">
                            <animate attributeName="r" values={`${dotR+4};${dotR+12};${dotR+4}`} dur="1.6s" repeatCount="indefinite"/>
                            <animate attributeName="opacity" values="0.30;0.04;0.30" dur="1.6s" repeatCount="indefinite"/>
                          </circle>
                          <circle cx={cx} cy={cy} r={dotR + 3} fill="none" stroke="#ff4d5e" strokeWidth="2">
                            <animate attributeName="stroke-opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
                            <animate attributeName="r" values={`${dotR + 2};${dotR + 7};${dotR + 2}`} dur="1.6s" repeatCount="indefinite"/>
                          </circle>
                        </g>
                      )}
                      {siblingsHere > 0 && (
                        <circle cx={cx} cy={cy} r={dotR + 4}
                          fill="none" stroke={COLORS.gold2}
                          strokeWidth="1.8" strokeOpacity="0.9"
                          pointerEvents="none"/>
                      )}
                      <circle className="dot" cx={cx} cy={cy} r={dotR}
                        fill={colorOf(colorLead)}
                        fillOpacity={spotDimStack ? 0.6 : (dimStack ? 0.3 : (isStackHover ? 1 : 0.92))}
                        stroke={isStackHover || liveInStack ? '#fff' : 'rgba(0,0,0,0.5)'}
                        strokeWidth={isStackHover ? 2 : (liveInStack ? 1.8 : 0.9)}/>
                      <rect
                        x={bcx - badgeW/2} y={bcy - badgeH/2}
                        width={badgeW} height={badgeH}
                        rx={badgeH/2} ry={badgeH/2}
                        fill={COLORS.gold} stroke={COLORS.bg0} strokeWidth="1"
                        opacity={spotDimStack ? 0.7 : (dimStack ? 0.4 : 1)}/>
                      <text x={bcx} y={bcy} dominantBaseline="central"
                        fill={COLORS.bg0} fontSize="8.5" fontWeight="700" fontFamily="JetBrains Mono"
                        textAnchor="middle"
                        style={{pointerEvents:'none', letterSpacing:'-0.01em'}}>
                        {countStr}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>

          {hover && hover._stackKey && (() => {
            // Penalties all project to (108, 40), so a stack there is the penalty spot.
            const isPenStack = hover._stackLead
              && Math.abs((hover._stackLead.x ?? 0) - 108) < 0.5
              && Math.abs((hover._stackLead.y ?? 0) - 40) < 0.5;
            return (
              <div className="tt" style={tipStyle(hover, {cursor: 'pointer', pointerEvents: isTouch ? 'auto' : 'none'})}
                onClick={(e)=>{ e.stopPropagation(); const g = hover._stackGoals; setTappedKey(null); setHover(null); if (onPickStack && g) onPickStack(g); }}>
                <div className="text-[11px] uppercase tracking-widest mb-1" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>
                  {isPenStack ? 'Penalty spot' : 'Stacked goals'}
                </div>
                <div className="font-serif" style={{fontSize: 28, fontWeight: 600, color: COLORS.gold2, lineHeight: 1, paddingBottom: 2}}>
                  {hover._stackCount}
                </div>
                <div className="text-[11px] mt-1" style={{color: COLORS.muted}}>
                  {isPenStack ? 'goals from the penalty spot' : 'goals at this exact spot'}
                </div>
                <div className="mt-2 pt-2 text-[10px]" style={{color: COLORS.muted2, borderTop: `1px solid ${COLORS.line}`}}>
                  Tap to view the list →
                </div>
              </div>
            );
          })()}

          {hover && !hover._stackKey && hover.match_key && (
            <div className="tt" style={tipStyle(hover, {cursor: 'pointer', pointerEvents: isTouch ? 'auto' : 'none'})}
              onClick={(e)=>{ e.stopPropagation(); const g = hover; setTappedKey(null); setHover(null); if (onPick) onPick(g); }}>
              <div className="flex items-center gap-2 mb-2">
                {hover.goal_number != null && (
                  <span className="font-mono uppercase" style={{color: COLORS.gold2, fontSize: 13, fontWeight: 800, letterSpacing:'0.10em'}}>
                    GOAL #{hover.goal_number}
                  </span>
                )}
                {hover.live && (
                  <span className="font-mono uppercase" style={{color: '#ff8d99', fontSize: 10, fontWeight: 800, letterSpacing:'0.10em'}}>● LIVE</span>
                )}
              </div>
              {}
              {(() => {
                const p = String(hover.score_after_goal || '').split(':');
                const hasScore = p.length === 2;
                const homeName = hover.home_team || hover.team;
                const awayName = hover.away_team || hover.opponent;
                const homeAbbr = hover.home_abbr || hover.team_abbr;
                const awayAbbr = hover.away_abbr || hover.opponent_abbr;
                const homeScored = hover.scorer_side ? hover.scorer_side === 'home' : true;
                const gold = {color: COLORS.gold2, fontWeight: 800};
                const plain = {color: COLORS.ink, fontWeight: 700};
                return (
                  <div className="flex items-center gap-1.5 mb-2" style={{fontSize: 14, whiteSpace: 'nowrap'}}>
                    <FlagImg abbr={homeAbbr} size={18}/>
                    <span style={{color: homeScored ? COLORS.gold2 : COLORS.ink, fontWeight: 600}}>{homeName}</span>
                    {hasScore && <span className="font-mono num-tabular" style={homeScored ? gold : plain}>{p[0]}</span>}
                    <span style={{color: COLORS.muted, fontStyle: 'italic'}}>vs</span>
                    {hasScore && <span className="font-mono num-tabular" style={homeScored ? plain : gold}>{p[1]}</span>}
                    <span style={{color: homeScored ? COLORS.ink : COLORS.gold2, fontWeight: 600}}>{awayName}</span>
                    <FlagImg abbr={awayAbbr} size={18}/>
                  </div>
                );
              })()}
              {hover.scorer && (
                <div className="font-serif mb-1" style={{fontSize: 15, fontWeight: 600, lineHeight: 1.15}}>
                  {hover.scorer}
                  {hover.minute != null && <span className="font-mono ml-2" style={{fontSize: 12, color: COLORS.muted}}>{hover.minute}'</span>}
                </div>
              )}
              {hover.xg != null && (
                <div className="font-mono text-xs" style={{color: COLORS.muted}}>
                  xG <span style={{color: COLORS.gold2}}>{Number(hover.xg).toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 pt-2 text-[10px]" style={{color: COLORS.muted2, borderTop: `1px solid ${COLORS.line}`}}>Tap to open detail →</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

window.Pitch = Pitch;
