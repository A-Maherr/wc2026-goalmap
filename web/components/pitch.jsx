function Pitch({ data, color, setColor, onPick, onPickStack, hover, setHover, headerCenter }) {
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

  const W = isMobile ? 600 : size.w;
  const H = isMobile ? ((600 - 2*PAD) * fifaRatio + 2*PAD) : size.h;
  const dotScale = isMobile ? 1 : Math.max(0.6, Math.min(1, W / 520));
  const sx = data_y => PAD + (data_y / VIEW_W_M) * (W - PAD*2);
  const sy = data_x => PAD + ((X_MAX - data_x) / VIEW_H_M) * (H - PAD*2);

  // ── shared engine wiring ──────────────────────────────────────────────────
  const project = (d) => [sx(d.y), sy(d.x)];
  const clusterKey = React.useCallback((d) => `${d.x.toFixed(1)}|${d.y.toFixed(1)}`, []);
  const { anyLive, orderedClusters } = sfUseClusters(dotsData, clusterKey);
  const hoverFixture = hover && hover.match_key ? sfFixtureKey(hover) : null;
  const tipStyle = sfMakeTipStyle(project, dotsData);
  const stackInfo = (lead) => {
    // penalties all project to (108, 40)
    const isPen = lead && Math.abs((lead.x ?? 0) - 108) < 0.5 && Math.abs((lead.y ?? 0) - 40) < 0.5;
    return isPen
      ? { title: 'Penalty spot', subtitle: 'goals from the penalty spot' }
      : { title: 'Stacked goals', subtitle: 'goals at this exact spot' };
  };

  // background geometry
  const boxLeft = sx(18), boxRight = sx(62), boxBottom = sy(102), boxTop = sy(120);
  const sixLeft = sx(30), sixRight = sx(50), sixBottom = sy(114), sixTop = sy(120);
  const arcRadiusY = (10 / VIEW_H_M) * (H - PAD*2);
  const arcRadiusX = (10 / VIEW_W_M) * (W - PAD*2);

  return (
    <div className="panel p-6">
      <FieldHeader title="The shot map" dotsData={dotsData} headerCenter={headerCenter}/>
      <FieldControls color={color} setColor={setColor} dotsData={dotsData}/>

      <div className="flex gap-4 items-stretch">
        <div className="flex-1 relative flex justify-center" style={{minWidth: 0}}>
          <svg ref={ref}
            {...(isMobile
              ? { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet',
                  style: { display: 'block', width: '100%', height: 'auto', maxWidth: 640, margin: '0 auto' } }
              : { width: W, height: H, style: { display: 'block' } })}
            onClick={()=>{ if (isTouch) { setHover(null); setTappedKey(null); } }}>
            <PitchBackdrop W={W} H={H} xMin={X_MIN}/>

            <ClusterLayer
              orderedClusters={orderedClusters} project={project} dotScale={dotScale} color={color}
              hover={hover} hoverFixture={hoverFixture} anyLive={anyLive}
              isTouch={isTouch} tappedKey={tappedKey} setHover={setHover} setTappedKey={setTappedKey}
              onPick={onPick} onPickStack={onPickStack}/>
          </svg>

          <StackTooltip hover={hover} tipStyle={tipStyle} isTouch={isTouch} onPickStack={onPickStack}
            setHover={setHover} setTappedKey={setTappedKey} stackInfo={stackInfo}/>
          <GoalTooltip hover={hover} tipStyle={tipStyle} isTouch={isTouch} onPick={onPick}
            setHover={setHover} setTappedKey={setTappedKey}/>
        </div>
      </div>
    </div>
  );
}

window.Pitch = Pitch;
