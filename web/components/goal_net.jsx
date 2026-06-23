// Front-on goal-net view: every goal plotted by its FotMob goal-line crossing
// point. All interaction (clustering, stacks, hover/sibling/live/dim, tooltips,
// touch) comes from shot_field.jsx — only the background + projection differ.
function GoalNet({ data, color, setColor, onPick, onPickStack, hover, setHover, headerCenter }) {
  const MW = 732, MH = 244, PT = 12, DEPTH = 42, IX = 20, PAD_X = 46;
  const PAD_TOP = DEPTH + PT + 16, GRASS_H = 74;
  const x0 = PAD_X, y0 = PAD_TOP, x1 = x0 + MW, y1 = y0 + MH;
  const W = x1 + PAD_X, H = y1 + GRASS_H;
  const A = [x0, y0], B = [x1, y0], C = [x1, y1], Dd = [x0, y1];
  const C2 = [x1 - IX, y1 - DEPTH], D2 = [x0 + IX, y1 - DEPTH];
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const bilerp = (tl, tr, br, bl, u, v) => lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
  const poly = (...ps) => ps.map(p => `${p[0]},${p[1]}`).join(' ');

  const [tappedKey, setTappedKey] = React.useState(null);
  const isTouch = React.useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    []
  );

  const dotsData = React.useMemo(
    () => data.filter(d => d.goal_mouth_y != null && d.goal_mouth_z != null),
    [data]
  );

  // projection onto the slanted net surface. The pitch runs y through _proj which
  // flips the across-axis, so mirror the mouth coordinate to match it (and reality).
  const RIGHT_POST = 37.66, MOUTH = 7.32, BARH = 2.44;
  const project = (d) => {
    const u = Math.min(1, Math.max(0, (RIGHT_POST - d.goal_mouth_y) / MOUTH));
    const v = Math.min(1, Math.max(0, 1 - d.goal_mouth_z / BARH));
    return bilerp(A, B, C2, D2, u, v);
  };
  const clusterKey = React.useCallback((d) => `${d.goal_mouth_y.toFixed(2)}|${d.goal_mouth_z.toFixed(2)}`, []);
  const { anyLive, orderedClusters } = sfUseClusters(dotsData, clusterKey);
  const hoverFixture = hover && hover.match_key ? sfFixtureKey(hover) : null;
  const tipStyle = sfMakeTipStyle(project, dotsData);
  const dotScale = 1.13;  // matches the pitch's on-screen dot size in this viewBox

  const meshLines = (tl, tr, br, bl, nu, nv, op, kp) => {
    const out = [], st = `rgba(255,255,255,${op})`;
    for (let i = 0; i <= nu; i++) { const a = lerp(tl, tr, i / nu), b = lerp(bl, br, i / nu); out.push(<line key={kp + 'i' + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={st} strokeWidth="1.2" strokeLinecap="round"/>); }
    for (let j = 0; j <= nv; j++) { const a = lerp(tl, bl, j / nv), b = lerp(tr, br, j / nv); out.push(<line key={kp + 'j' + j} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={st} strokeWidth="1.2" strokeLinecap="round"/>); }
    return out;
  };

  const NETQUAD = poly(A, B, C2, D2);
  const heightRow = hover && !hover._stackKey && hover.goal_mouth_z != null
    ? <div className="font-mono text-xs" style={{ color: COLORS.muted }}>height <span style={{ color: COLORS.gold2 }}>{hover.goal_mouth_z.toFixed(2)} m</span></div>
    : null;

  return (
    <div className="panel p-6">
      <FieldHeader title="The goal net" dotsData={dotsData} headerCenter={headerCenter}/>
      <FieldControls color={color} setColor={setColor} dotsData={dotsData}/>

      <div className="relative flex justify-center" style={{ minWidth: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', width: '100%', height: 'auto', maxWidth: 920 }}
          onClick={() => { if (isTouch) { setHover(null); setTappedKey(null); } }}>
          <defs>
            <linearGradient id="gnbg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0f1c2b"/><stop offset="100%" stopColor="#0a121c"/></linearGradient>
            <linearGradient id="gngrass" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#1a5e30"/><stop offset="100%" stopColor="#155026"/></linearGradient>
            <linearGradient id="gnpost" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#c4cdd3"/><stop offset="42%" stopColor="#fff"/><stop offset="58%" stopColor="#fff"/><stop offset="100%" stopColor="#aab4bb"/></linearGradient>
            <linearGradient id="gnbar" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#c4cdd3"/><stop offset="42%" stopColor="#fff"/><stop offset="58%" stopColor="#fff"/><stop offset="100%" stopColor="#aab4bb"/></linearGradient>
            <radialGradient id="gnvig" cx="50%" cy="42%" r="70%"><stop offset="0%" stopColor="rgba(0,0,0,0)"/><stop offset="100%" stopColor="rgba(0,0,0,0.34)"/></radialGradient>
            <linearGradient id="gnshade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgba(0,0,0,0)"/><stop offset="100%" stopColor="rgba(0,0,0,0.30)"/></linearGradient>
            <radialGradient id="gnglow" cx="50%" cy="16%" r="62%"><stop offset="0%" stopColor="rgba(150,170,200,0.16)"/><stop offset="100%" stopColor="rgba(150,170,200,0)"/></radialGradient>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill="url(#gnbg)"/>
          <rect x="0" y="0" width={W} height={y1} fill="url(#gnglow)"/>
          <rect x="0" y={y1} width={W} height={H - y1} fill="url(#gngrass)"/>
          <polygon points={poly(Dd, C, C2, D2)} fill="#10401f"/>
          <line x1="0" y1={y1} x2={W} y2={y1} stroke="rgba(255,255,255,0.55)" strokeWidth="2"/>

          <polygon points={NETQUAD} fill="#0b1622"/>
          {meshLines(A, A, D2, Dd, 8, 6, 0.26, 'L')}
          {meshLines(B, B, C2, C, 8, 6, 0.26, 'R')}
          {meshLines(A, B, C2, D2, 32, 12, 0.50, 'M')}
          <polygon points={NETQUAD} fill="url(#gnshade)"/>
          <polygon points={NETQUAD} fill="url(#gnvig)"/>

          <path d={`M ${A[0]} ${A[1]} Q ${D2[0]} ${A[1]} ${D2[0]} ${D2[1]}`} stroke="#aab3b9" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <path d={`M ${B[0]} ${B[1]} Q ${C2[0]} ${B[1]} ${C2[0]} ${C2[1]}`} stroke="#aab3b9" strokeWidth="5" strokeLinecap="round" fill="none"/>
          <line x1={D2[0]} y1={D2[1]} x2={C2[0]} y2={C2[1]} stroke="#aeb7bd" strokeWidth="3.5" strokeLinecap="round"/>

          <ClusterLayer
            orderedClusters={orderedClusters} project={project} dotScale={dotScale} color={color}
            hover={hover} hoverFixture={hoverFixture} anyLive={anyLive}
            isTouch={isTouch} tappedKey={tappedKey} setHover={setHover} setTappedKey={setTappedKey}
            onPick={onPick} onPickStack={onPickStack}/>

          <rect x={x0 - PT} y={y0 - PT} width={PT} height={MH + PT} fill="url(#gnpost)" rx="2"/>
          <rect x={x1} y={y0 - PT} width={PT} height={MH + PT} fill="url(#gnpost)" rx="2"/>
          <rect x={x0 - PT} y={y0 - PT} width={MW + 2 * PT} height={PT} fill="url(#gnbar)" rx="2"/>
        </svg>

        <StackTooltip hover={hover} tipStyle={tipStyle} isTouch={isTouch} onPickStack={onPickStack}
          setHover={setHover} setTappedKey={setTappedKey}/>
        <GoalTooltip hover={hover} tipStyle={tipStyle} isTouch={isTouch} onPick={onPick}
          setHover={setHover} setTappedKey={setTappedKey} extra={heightRow}/>
      </div>
    </div>
  );
}

window.GoalNet = GoalNet;
