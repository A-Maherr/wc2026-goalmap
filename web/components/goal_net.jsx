// Front-on goal-net view: every goal plotted by its FotMob goal-line crossing
// point. All interaction (clustering, stacks, hover/sibling/live/dim, tooltips,
// touch) comes from shot_field.jsx — only the background + projection differ.
function GoalNet({ data, color, setColor, onPick, onPickStack, hover, setHover, headerCenter }) {
  const { W, H } = NET_GEOM;

  const [tappedKey, setTappedKey] = React.useState(null);
  const isTouch = React.useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    []
  );

  const dotsData = React.useMemo(
    () => data.filter(d => d.goal_mouth_y != null && d.goal_mouth_z != null),
    [data]
  );

  const project = netProject;
  const clusterKey = React.useCallback((d) => `${d.goal_mouth_y.toFixed(2)}|${d.goal_mouth_z.toFixed(2)}`, []);
  const { anyLive, orderedClusters } = sfUseClusters(dotsData, clusterKey);
  const hoverFixture = hover && hover.match_key ? sfFixtureKey(hover) : null;
  const tipStyle = sfMakeTipStyle(project, dotsData);
  const dotScale = 1.13;  // matches the pitch's on-screen dot size in this viewBox

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
          <NetBackdrop/>

          <ClusterLayer
            orderedClusters={orderedClusters} project={project} dotScale={dotScale} color={color}
            hover={hover} hoverFixture={hoverFixture} anyLive={anyLive}
            isTouch={isTouch} tappedKey={tappedKey} setHover={setHover} setTappedKey={setTappedKey}
            onPick={onPick} onPickStack={onPickStack}/>

          <NetFrame/>
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
