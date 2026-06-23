// Holds the pitch (top-down) and the goal-net (front-on) views and animates a
// "camera landing" between them: the pitch dives away and tilts, the goal rises
// up to face you — and the reverse on the way back.
function PitchNetStage({ data, color, setColor, onPick, onPickStack, hover, setHover }) {
  const [view, setView] = React.useState('pitch');
  const [tf, setTf] = React.useState('none');
  const [op, setOp] = React.useState(1);
  const [trans, setTrans] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const innerRef = React.useRef(null);
  const [h, setH] = React.useState(undefined);
  const DUR = 480;

  // each view's tilt/zoom pose — used both as its exit and its enter-start pose,
  // so the motion is continuous in either direction.
  const pose = (v) => v === 'pitch'
    ? 'rotateX(54deg) translateZ(90px)'
    : 'rotateX(-46deg) translateZ(-40px) translateY(8px)';

  React.useLayoutEffect(() => {
    if (innerRef.current) {
      const nh = innerRef.current.offsetHeight;
      setH(p => (p !== nh ? nh : p));
    }
  });

  const go = (next) => {
    if (busy || next === view) return;
    setBusy(true);
    setTrans(true); setTf(pose(view)); setOp(0);          // dive the current view away
    window.setTimeout(() => {
      setView(next);
      setTrans(false); setTf(pose(next)); setOp(0);       // place the next view at its enter pose (no transition)
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setTrans(true); setTf('none'); setOp(1);          // settle it to face the camera
        window.setTimeout(() => setBusy(false), DUR);
      }));
    }, DUR);
  };

  // perspective / will-change create a containing block that hijacks fixed-position
  // tooltips — keep them OFF except during the animation (you never hover mid-flip).
  const innerStyle = {
    transformOrigin: '50% 100%',
    transform: tf,
    opacity: op,
    transition: trans ? `transform ${DUR}ms cubic-bezier(.42,0,.2,1), opacity ${DUR}ms ease` : 'none',
    willChange: busy ? 'transform, opacity' : 'auto',
  };
  const isNet = view === 'net';
  const toggle = () => go(isNet ? 'pitch' : 'net');
  const lbl = (on) => ({ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: on ? COLORS.gold2 : COLORS.muted2, transition: 'color .2s' });

  const toggleEl = (
    <button onClick={toggle} aria-label="Toggle pitch and goal-net view"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 11, cursor: busy ? 'default' : 'pointer',
        background: COLORS.panel2, border: `1px solid ${COLORS.line2}`, borderRadius: 999, padding: '6px 12px' }}>
      <span className="font-mono" style={lbl(!isNet)}>Pitch</span>
      <span style={{ position: 'relative', width: 42, height: 22, borderRadius: 999,
        background: isNet ? 'rgba(205,163,73,0.30)' : 'rgba(255,255,255,0.10)', transition: 'background .25s' }}>
        <span style={{ position: 'absolute', top: 3, left: isNet ? 23 : 3, width: 16, height: 16, borderRadius: '50%',
          background: COLORS.gold2, boxShadow: '0 1px 3px rgba(0,0,0,0.5)', transition: 'left .28s cubic-bezier(.4,0,.2,1)' }}/>
      </span>
      <span className="font-mono" style={lbl(isNet)}>Goal net</span>
    </button>
  );

  return (
    <div style={{ perspective: busy ? '1500px' : 'none', overflow: 'visible', height: h, transition: `height ${DUR}ms cubic-bezier(.42,0,.2,1)` }}>
      <div ref={innerRef} style={innerStyle}>
        {view === 'pitch'
          ? <Pitch data={data} color={color} setColor={setColor} onPick={onPick} onPickStack={onPickStack} hover={hover} setHover={setHover} headerCenter={toggleEl}/>
          : <GoalNet data={data} color={color} setColor={setColor} onPick={onPick} onPickStack={onPickStack} hover={hover} setHover={setHover} headerCenter={toggleEl}/>}
      </div>
    </div>
  );
}

window.PitchNetStage = PitchNetStage;
