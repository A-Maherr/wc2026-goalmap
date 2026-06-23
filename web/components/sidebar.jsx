function Sidebar({ data, filters, setFilters, counts, goalsInMatchStats, open, onClose }) {
  const update = (key, value) => setFilters(f => ({...f, [key]: value}));
  const toggleSet = (key, value) => {
    setFilters(f => {
      const s = new Set(f[key]);
      if (s.has(value)) s.delete(value); else s.add(value);
      return {...f, [key]: s};
    });
  };
  const has = (set, val) => set instanceof Set && set.has(val);

  const bodyParts = ['right_foot','left_foot','header','other','own_goal'];
  const situations = ['open_play','penalty','counterattack','direct_free_kick','corner','set_piece','own_goal'];
  const finishes = ['normal_shot','penalty','header','free_kick','rebound','volley','own_goal'];

  // Full-data tallies decide which buckets show and their order: a bucket only
  // appears once it has goals, sorted most-scored first (stable under filtering).
  const tallies = React.useMemo(() => {
    const t = { body: {}, sit: {}, fin: {} };
    for (const d of (data || [])) {
      if (d.body_part) t.body[d.body_part] = (t.body[d.body_part] || 0) + 1;
      if (d.situation) t.sit[d.situation] = (t.sit[d.situation] || 0) + 1;
      if (d.finish_style) t.fin[d.finish_style] = (t.fin[d.finish_style] || 0) + 1;
    }
    return t;
  }, [data]);
  const present = (list, totals) =>
    list.filter(k => (totals[k] || 0) > 0).sort((a, b) => (totals[b] || 0) - (totals[a] || 0));

  const activeCount =
    (filters.nation ? filters.nation.size : 0) +
    (filters.stage ? filters.stage.size : 0) +
    (filters.scorer != null ? 1 : 0) +
    (filters.date ? 1 : 0) +
    (filters.position ? filters.position.size : 0) +
    (filters.match ? filters.match.size : 0) +
    filters.bodyPart.size +
    filters.situation.size + filters.finish.size +
    (filters.opponent ? filters.opponent.size : 0) +
    (filters.goalsInMatch ? filters.goalsInMatch.size : 0) +
    (filters.minMin > 0 || filters.maxMin < 120 ? 1 : 0) +
    (filters.minDist > 0 || filters.maxDist < 999 ? 1 : 0) +
    ((filters.minXg ?? 0) > 0 || (filters.maxXg ?? 1) < 1 ? 1 : 0) +
    (filters.search && filters.search.trim() ? 1 : 0) +
    (filters.zone ? 1 : 0);

  const clearAll = () => setFilters({
    bodyPart: new Set(),
    situation: new Set(), finish: new Set(),
    minMin: 0, maxMin: 120,
    minDist: 0, maxDist: 999,
    search: '',
    goalsInMatch: new Set(),
    opponent: new Set(),
    zone: null,
    nation: new Set(), stage: new Set(), scorer: null, date: null,
    position: new Set(), minXg: 0, maxXg: 1, match: new Set(),
  });

  const abbr = (window.TOURNAMENT_CONFIG && window.TOURNAMENT_CONFIG.abbr) || {};
  const nations = Object.keys(counts.byNation || {})
    .sort((a, b) => (counts.byNation[b] - counts.byNation[a]) || a.localeCompare(b));
  const _stageOrder = Object.keys(STAGE_COLORS);
  const stages = _stageOrder.filter(s => (counts.byStage || {})[s])
    .concat(Object.keys(counts.byStage || {}).filter(s => !_stageOrder.includes(s)));

  return (
    <aside
      className={`panel flex-shrink-0 overflow-y-auto fixed top-0 left-0 z-50 h-full w-[86vw] max-w-[330px] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} lg:static lg:z-auto lg:h-auto lg:w-[300px] lg:translate-x-0 lg:sticky lg:top-4 lg:self-start`}
      style={{maxHeight: 'calc(100vh - 32px)'}}
    >
      <div className="px-5 py-4 border-b flex items-center justify-between gap-2" style={{borderColor: COLORS.line}}>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Filters</div>
          <div className="text-sm mt-1" style={{color: COLORS.ink}}>{counts.shown.toLocaleString()} <span style={{color: COLORS.muted}}>of {counts.total.toLocaleString()} goals</span></div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-xs px-2 py-1 rounded hover:text-white" style={{color: COLORS.gold2, border:`1px solid ${COLORS.line}`}}>Clear ({activeCount})</button>
          )}
          <button onClick={onClose} className="lg:hidden text-lg leading-none px-2 py-1 rounded" style={{color: COLORS.muted, border:`1px solid ${COLORS.line}`}} aria-label="Close filters">✕</button>
        </div>
      </div>

      <div className="px-5 py-4">

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search scorer, nation or goal #"
          value={filters.search || ''}
          onChange={(e) => update('search', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${COLORS.line}`,
            borderRadius: 6,
            color: COLORS.ink,
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = COLORS.gold2}
          onBlur={(e) => e.target.style.borderColor = COLORS.line}
        />
      </div>


      <Section title="Nation">
        {nations.length === 0 ? (
          <div className="text-[11px] py-1" style={{color: COLORS.muted2}}>No goals yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {nations.map(nat => {
              const active = has(filters.nation, nat);
              // Selected pills share one accent so a multi-nation pick reads as
              // a single selection, not a rainbow of kit colours.
              return (
                <button key={nat}
                  onClick={() => toggleSet('nation', nat)}
                  title={`${nat} · ${counts.byNation[nat]} goal${counts.byNation[nat] === 1 ? '' : 's'}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition flex-shrink-0"
                  style={{
                    border: `1px solid ${active ? COLORS.gold : COLORS.line}`,
                    background: active ? 'rgba(205,163,73,0.16)' : 'rgba(255,255,255,0.03)',
                    color: active ? COLORS.ink : COLORS.muted,
                  }}>
                  <FlagImg abbr={abbr[nat]} size={16}/>
                  <span style={{whiteSpace: 'nowrap', color: COLORS.ink, fontSize: 13}}>{nat}</span>
                  <span className="font-mono" style={{color: active ? COLORS.gold2 : COLORS.muted2}}>{counts.byNation[nat]}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Stage">
        {stages.length === 0 ? (
          <div className="text-[11px] py-1" style={{color: COLORS.muted2}}>No goals yet.</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {stages.map(s => {
              const active = has(filters.stage, s);
              const c = STAGE_COLORS[s] || COLORS.gold;
              return (
                <button key={s}
                  onClick={() => toggleSet('stage', s)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition"
                  style={{
                    border: `1px solid ${active ? c : COLORS.line}`,
                    background: active ? `${c}26` : 'rgba(255,255,255,0.03)',
                    color: active ? COLORS.ink : COLORS.muted,
                  }}>
                  <span className="legend-dot" style={{background: c}}></span>
                  {s}
                  <span className="font-mono" style={{color: active ? c : COLORS.muted2}}>{counts.byStage[s]}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Body part">
        {present(bodyParts, tallies.body).map(b => (
          <CheckRow key={b} label={fmtBodyPart(b)} count={counts.byBody[b]||0} on={has(filters.bodyPart, b)} onClick={()=>toggleSet('bodyPart', b)} />
        ))}
      </Section>

      <Section title="Situation">
        {present(situations, tallies.sit).map(b => (
          <CheckRow key={b} label={fmtSituation(b)} count={counts.bySit[b]||0} on={has(filters.situation, b)} onClick={()=>toggleSet('situation', b)} />
        ))}
      </Section>

      <Section title="Finish style">
        {present(finishes, tallies.fin).map(b => (
          <CheckRow key={b} label={fmtFinish(b)} count={counts.byFinish[b]||0} on={has(filters.finish, b)} onClick={()=>toggleSet('finish', b)} />
        ))}
      </Section>

      <Section title="Goals in match">
        <div className="text-[11px] mb-2" style={{color: COLORS.muted}}>
          Matches with exactly N goals by one nation. Pick multiple to combine.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[1,2,3,4,5,6].map(n => {
            const active = filters.goalsInMatch && filters.goalsInMatch.has(n);
            const matchCount = (goalsInMatchStats && goalsInMatchStats[n]) || 0;
            const label = n === 6 ? '6+' : String(n);
            return (
              <button key={n}
                onClick={()=>{
                  setFilters(f => {
                    const s = new Set(f.goalsInMatch || []);
                    if (s.has(n)) s.delete(n); else s.add(n);
                    return {...f, goalsInMatch: s};
                  });
                }}
                disabled={matchCount === 0}
                className="text-xs font-mono px-2.5 py-1.5 rounded transition"
                title={`${matchCount} match${matchCount===1?'':'es'} with ${label} goal${label==='1'?'':'s'} by one nation`}
                style={{
                  border: `1px solid ${active ? COLORS.gold : COLORS.line}`,
                  background: active ? 'rgba(205,163,73,0.14)' : 'transparent',
                  color: active ? COLORS.gold2 : (matchCount === 0 ? COLORS.muted2 : COLORS.ink),
                  opacity: matchCount === 0 ? 0.4 : 1,
                  cursor: matchCount === 0 ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.04em',
                }}>
                <span className="num-tabular">{label}</span>
                <span className="ml-1.5 text-[10px]" style={{color: COLORS.muted2}}>{matchCount}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Minute">
        <MinuteRangeInputs filters={filters} update={update} />
      </Section>

      <Section title="xG">
        <div className="text-[11px] mb-2" style={{color: COLORS.muted}}>
          Filter by expected-goals value of the shot (0.00 = near-impossible, 1.00 = certain).
        </div>
        <XgRangeInputs filters={filters} update={update} />
      </Section>

      <ActiveFilters filters={filters} setFilters={setFilters} />

      </div>
    </aside>
  );
}

function ActiveFilters({ filters, setFilters }) {
  const BODY_PART_LABELS = { right_foot: 'Right foot', left_foot: 'Left foot', header: 'Header', other: 'Other' };
  const SITUATION_LABELS = { open_play: 'Open play', penalty: 'Penalty', counterattack: 'Counterattack', direct_free_kick: 'Direct free kick', corner: 'Corner', set_piece: 'Set piece' };
  const FINISH_LABELS = { normal_shot: 'Normal shot', penalty: 'Penalty', header: 'Header', free_kick: 'Free kick', rebound: 'Rebound', volley: 'Volley' };
  const POSITION_LABELS = { GK: 'Goalkeepers', DEF: 'Defenders', MID: 'Midfielders', FWD: 'Forwards' };
  const ZONE_LABELS = { '6yd': 'Inside 6-yard box', '18yd': 'Inside 18-yard box', 'outside18yd': 'Outside 18-yard box' };
  const PRECISION_LABELS = { exact_event_data: 'Exact event coords', manual_override: 'Manual override', manual_video_estimate: 'Video estimate', zone_estimate: 'Zone estimate' };

  const TEAM_DOT = '#ffffff';
  const ACCENT_DOT = COLORS.gold2;
  const BODY_DOTS = { right_foot: COLORS.rf, left_foot: COLORS.lf, header: COLORS.hd, other: COLORS.ot };

  const removeFromSet = (key, val) => setFilters(f => {
    const s = new Set(f[key]);
    s.delete(val);
    return { ...f, [key]: s };
  });
  const setScalar = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  // Chip order mirrors the sidebar sections top-to-bottom.
  const chips = [];

  if (filters.search && filters.search.trim()) {
    chips.push({ label: `Search · ${filters.search.trim()}`, dot: TEAM_DOT, onClear: () => setScalar('search', '') });
  }
  for (const nat of filters.nation || []) {
    chips.push({ label: nat, dot: lookupNationColor(nat), onClear: () => removeFromSet('nation', nat) });
  }
  for (const st of filters.stage || []) {
    chips.push({ label: st, dot: (STAGE_COLORS[st] || ACCENT_DOT), onClear: () => removeFromSet('stage', st) });
  }
  if (filters.scorer != null) {
    chips.push({ label: 'Scorer selected', dot: ACCENT_DOT, onClear: () => setScalar('scorer', null) });
  }
  if (filters.date) {
    chips.push({ label: `Day · ${filters.date}`, dot: TEAM_DOT, onClear: () => setScalar('date', null) });
  }
  if (filters.match && filters.match.size) {
    chips.push({ label: `${filters.match.size} match${filters.match.size === 1 ? '' : 'es'}`, dot: ACCENT_DOT, onClear: () => setScalar('match', new Set()) });
  }
  for (const o of filters.opponent || []) {
    chips.push({ label: `vs ${o}`, dot: ACCENT_DOT, onClear: () => removeFromSet('opponent', o) });
  }
  for (const b of filters.bodyPart || []) {
    chips.push({ label: BODY_PART_LABELS[b] || b, dot: BODY_DOTS[b] || ACCENT_DOT, onClear: () => removeFromSet('bodyPart', b) });
  }
  for (const s of filters.situation || []) {
    chips.push({ label: SITUATION_LABELS[s] || s, dot: ACCENT_DOT, onClear: () => removeFromSet('situation', s) });
  }
  for (const fnsh of filters.finish || []) {
    chips.push({ label: FINISH_LABELS[fnsh] || fnsh, dot: ACCENT_DOT, onClear: () => removeFromSet('finish', fnsh) });
  }
  for (const p of filters.position || []) {
    chips.push({ label: POSITION_LABELS[p] || p, dot: ACCENT_DOT, onClear: () => removeFromSet('position', p) });
  }
  for (const n of filters.goalsInMatch || []) {
    chips.push({ label: n >= 6 ? '6+ goals in match' : `${n} goal${n === 1 ? '' : 's'} in match`, dot: ACCENT_DOT, onClear: () => removeFromSet('goalsInMatch', n) });
  }
  if (filters.zone) {
    chips.push({ label: ZONE_LABELS[filters.zone] || filters.zone, dot: ACCENT_DOT, onClear: () => setScalar('zone', null) });
  }
  if ((filters.minMin ?? 0) > 0 || (filters.maxMin ?? 120) < 120) {
    chips.push({
      label: `${filters.minMin}'–${filters.maxMin}'`,
      dot: ACCENT_DOT,
      onClear: () => setFilters(f => ({ ...f, minMin: 0, maxMin: 120 })),
    });
  }
  if ((filters.minDist ?? 0) > 0 || (filters.maxDist ?? 999) < 999) {
    chips.push({
      label: `${filters.minDist}–${filters.maxDist} yd`,
      dot: ACCENT_DOT,
      onClear: () => setFilters(f => ({ ...f, minDist: 0, maxDist: 999 })),
    });
  }
  if ((filters.minXg ?? 0) > 0 || (filters.maxXg ?? 1) < 1) {
    chips.push({
      label: `xG ${Number(filters.minXg).toFixed(1)}–${Number(Math.min(filters.maxXg, 1)).toFixed(1)}`,
      dot: ACCENT_DOT,
      onClear: () => setFilters(f => ({ ...f, minXg: 0, maxXg: 1 })),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t" style={{ borderColor: COLORS.line }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: COLORS.muted, letterSpacing: '0.14em' }}>
        Active filters
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <button
            key={i}
            onClick={c.onClear}
            title="Click to remove this filter"
            className="group inline-flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full text-xs transition"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${COLORS.line}`,
              color: COLORS.ink,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(205,163,73,0.10)'; e.currentTarget.style.borderColor = COLORS.gold2; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = COLORS.line; }}
          >
            <span className="legend-dot" style={{ background: c.dot, width: 6, height: 6 }}></span>
            <span style={{ lineHeight: 1 }}>{c.label}</span>
            <span className="opacity-0 group-hover:opacity-100 transition" style={{ color: COLORS.muted, fontSize: 10, marginLeft: 2 }}>×</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function XgRangeInputs({ filters, update }) {
  const fmt = (v) => Number(v).toFixed(2);
  const [minDraft, setMinDraft] = React.useState(fmt(filters.minXg));
  const [maxDraft, setMaxDraft] = React.useState(fmt(filters.maxXg));
  React.useEffect(() => { setMinDraft(fmt(filters.minXg)); }, [filters.minXg]);
  React.useEffect(() => { setMaxDraft(fmt(filters.maxXg)); }, [filters.maxXg]);

  const commitMin = () => {
    const n = parseFloat(minDraft);
    if (!Number.isFinite(n)) { setMinDraft(fmt(filters.minXg)); return; }
    const c = Math.max(0, Math.min(1, Math.min(n, filters.maxXg)));
    update('minXg', c); setMinDraft(fmt(c));
  };
  const commitMax = () => {
    const n = parseFloat(maxDraft);
    if (!Number.isFinite(n)) { setMaxDraft(fmt(filters.maxXg)); return; }
    const c = Math.min(1, Math.max(0, Math.max(n, filters.minXg)));
    update('maxXg', c); setMaxDraft(fmt(c));
  };
  const onInputChange = (setter) => (e) => setter(e.target.value.replace(/[^0-9.]/g, ''));
  const numInputStyle = {
    width: 52, padding: '4px 0',
    background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.line}`,
    borderRadius: 4, color: COLORS.ink, fontSize: 12,
    fontFamily: 'JetBrains Mono, monospace', textAlign: 'center',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2 gap-2">
        <input
          type="text" inputMode="decimal"
          value={minDraft}
          onChange={onInputChange(setMinDraft)}
          onBlur={commitMin}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          style={numInputStyle}
          aria-label="Minimum xG"
        />
        <span className="text-xs" style={{color: COLORS.muted2}}>to</span>
        <input
          type="text" inputMode="decimal"
          value={maxDraft}
          onChange={onInputChange(setMaxDraft)}
          onBlur={commitMax}
          onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
          style={numInputStyle}
          aria-label="Maximum xG"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min="0" max="1" step="0.05"
          value={filters.minXg}
          onChange={e => update('minXg', Math.min(+e.target.value, filters.maxXg))}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="range" min="0" max="1" step="0.05"
          value={filters.maxXg}
          onChange={e => update('maxXg', Math.max(+e.target.value, filters.minXg))}
          className="flex-1"
        />
      </div>
    </>
  );
}

// Inputs hold local string state while editing so the value doesn't snap back
// on every keystroke; clamp/commit happens on blur or Enter.
function MinuteRangeInputs({ filters, update }) {
  const [minDraft, setMinDraft] = React.useState(String(filters.minMin));
  const [maxDraft, setMaxDraft] = React.useState(String(filters.maxMin));
  // Re-sync when the filter changes from outside (card click, Clear All).
  React.useEffect(() => { setMinDraft(String(filters.minMin)); }, [filters.minMin]);
  React.useEffect(() => { setMaxDraft(String(filters.maxMin)); }, [filters.maxMin]);

  const commitMin = () => {
    const n = parseInt(minDraft, 10);
    if (!Number.isFinite(n)) { setMinDraft(String(filters.minMin)); return; }
    const clamped = Math.max(0, Math.min(120, Math.min(n, filters.maxMin)));
    update('minMin', clamped);
    setMinDraft(String(clamped));
  };
  const commitMax = () => {
    const n = parseInt(maxDraft, 10);
    if (!Number.isFinite(n)) { setMaxDraft(String(filters.maxMin)); return; }
    const clamped = Math.min(120, Math.max(0, Math.max(n, filters.minMin)));
    update('maxMin', clamped);
    setMaxDraft(String(clamped));
  };

  // text + inputMode="numeric": clean box, no spinner buttons, mobile keypad.
  // Strip non-digits so the draft stays parseable (empty allowed mid-typing).
  const onInputChange = (setter) => (e) => {
    const v = e.target.value.replace(/[^0-9]/g, '');
    setter(v);
  };
  const numInputStyle = {
    width: 46, padding: '4px 0',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${COLORS.line}`,
    borderRadius: 4,
    color: COLORS.ink,
    fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
    textAlign: 'center',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-baseline gap-0.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={minDraft}
            onChange={onInputChange(setMinDraft)}
            onBlur={commitMin}
            onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            style={numInputStyle}
            aria-label="Minimum minute"
          />
          <span className="text-xs font-mono" style={{color: COLORS.muted2}}>'</span>
        </div>
        <span className="text-xs" style={{color: COLORS.muted2}}>to</span>
        <div className="flex items-baseline gap-0.5">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={maxDraft}
            onChange={onInputChange(setMaxDraft)}
            onBlur={commitMax}
            onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            style={numInputStyle}
            aria-label="Maximum minute"
          />
          <span className="text-xs font-mono" style={{color: COLORS.muted2}}>'</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range" min="0" max="120"
          value={filters.minMin}
          onChange={e=>update('minMin', Math.min(+e.target.value, filters.maxMin))}
          className="flex-1"
        />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="range" min="0" max="120"
          value={filters.maxMin}
          onChange={e=>update('maxMin', Math.max(+e.target.value, filters.minMin))}
          className="flex-1"
        />
      </div>
    </>
  );
}

function Section({ title, defaultOpen, children }) {
  return (
    <details open={defaultOpen} className="border-b py-3" style={{borderColor: COLORS.line}}>
      <summary className="flex items-center justify-between accordion-head text-xs uppercase tracking-widest" style={{color: COLORS.muted, letterSpacing: '0.14em'}}>
        <span>{title}</span>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M 2 4 L 5 7 L 8 4" stroke="currentColor" fill="none" strokeWidth="1.4"/></svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function CheckRow({ label, count, on, dot, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-1.5 text-left group">
      <span className="flex items-center gap-2 min-w-0">
        <span className={"chk " + (on ? 'on' : '')}></span>
        {dot && <span className="legend-dot" style={{background: dot}}></span>}
        <span className="text-xs truncate" style={{color: on ? COLORS.ink : COLORS.muted}}>{label}</span>
      </span>
      <span className="text-[11px] font-mono" style={{color: COLORS.muted2}}>{count.toLocaleString()}</span>
    </button>
  );
}

window.Sidebar = Sidebar;
