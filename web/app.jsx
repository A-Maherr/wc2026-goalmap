const { useState, useEffect, useMemo } = React;

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    console.error('[ErrorBoundary] React error:', err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{padding:24, color:'#f3f7f4', fontFamily:'monospace', whiteSpace:'pre-wrap'}}>
          <div style={{color:'#cda349', fontSize:18, marginBottom:12}}>Render error</div>
          <div style={{color:'#e74c3c'}}>{String(this.state.err && this.state.err.stack || this.state.err)}</div>
          <button onClick={()=>this.setState({err:null})}
            style={{marginTop:16, padding:'6px 14px', background:'#cda349', color:'#0a0f0d', border:'none', borderRadius:6, cursor:'pointer'}}>
            Recover
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* Raw stage labels from the data feed don't always match these 7 buckets
 * (knockout fixtures are often labelled "Group stage" until the brackets
 * settle), so canonicalStageId() maps each raw label onto one of the ids below. */
const STAGE_STRIP = [
  { id: 'group', short: 'Groups',   meta: '11–27 Jun', match: /group|tournament|first round/i },
  { id: 'r32',   short: 'R32',      meta: '28 Jun–1 Jul', match: /round of 32|r32/i },
  { id: 'r16',   short: 'R16',      meta: '4–7 Jul', match: /round of 16|r16|last 16/i },
  { id: 'qf',    short: 'QF',       meta: '9–11 Jul', match: /quarter[- ]?final|qf/i },
  { id: 'sf',    short: 'SF',       meta: '14–15 Jul', match: /semi[- ]?final|sf/i },
  { id: 'third', short: '3rd',      meta: '18 Jul', match: /third[- ]?place|3rd/i },
  { id: 'final', short: 'Final',    meta: '19 Jul', match: /^final$/i },
];

function canonicalStageId(stage) {
  const s = String(stage || '').trim();
  if (!s) return null;
  for (const x of STAGE_STRIP) {
    if (x.match.test(s)) return x.id;
  }
  return null;
}

function StageStrip({ data, filters, setFilters }) {
  const stageRaw = React.useMemo(() => {
    const m = {};
    (data || []).forEach(d => {
      const id = canonicalStageId(d.stage);
      if (id) m[id] = (m[id] || 0) + 1;
    });
    return m;
  }, [data]);
  const currentStageId = React.useMemo(() => {
    for (let i = STAGE_STRIP.length - 1; i >= 0; i--) {
      if (stageRaw[STAGE_STRIP[i].id]) return STAGE_STRIP[i].id;
    }
    return 'group';
  }, [stageRaw]);

  // filters.stage holds raw `d.stage` strings (the predicate compares string-equal).
  const toggleStage = (id) => {
    setFilters(f => {
      const next = new Set(f.stage);
      const seenRaw = new Set();
      (data || []).forEach(d => { if (canonicalStageId(d.stage) === id && d.stage) seenRaw.add(d.stage); });
      // No data yet for this stage: store the canonical token so the filter still
      // expresses intent (no rows match → empty pitch).
      if (!seenRaw.size) seenRaw.add(STAGE_STRIP.find(x => x.id === id).short);
      const allOn = [...seenRaw].every(s => next.has(s));
      if (allOn) seenRaw.forEach(s => next.delete(s));
      else seenRaw.forEach(s => next.add(s));
      return { ...f, stage: next };
    });
  };
  const isActive = (id) => {
    const raws = (data || []).filter(d => canonicalStageId(d.stage) === id).map(d => d.stage);
    if (!raws.length) return filters.stage.has(STAGE_STRIP.find(x => x.id === id).short);
    return raws.some(r => filters.stage.has(r));
  };

  return (
    <div className="px-6 pt-4">
      <div className="panel" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="font-mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'var(--muted-2)', textTransform: 'uppercase', padding: '0 12px 0 6px', whiteSpace: 'nowrap' }}>
          Stage
        </div>
        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
          {STAGE_STRIP.map(s => {
            const active = isActive(s.id);
            const isCurrent = s.id === currentStageId;
            const count = stageRaw[s.id] || 0;
            let bg = 'transparent', col = 'var(--muted-2)', bd = '1px solid transparent';
            if (active) {
              bg = 'linear-gradient(160deg, var(--gold), #b88c33)';
              col = 'var(--bg-1)';
            } else if (isCurrent) {
              bg = 'rgba(31,111,58,.25)';
              col = '#7fe0a0';
              bd = '1px solid rgba(42,143,74,.5)';
            } else {
              col = '#cdd6e4';
            }
            return (
              <button
                key={s.id}
                onClick={() => toggleStage(s.id)}
                title={`${s.short} · ${count} goal${count === 1 ? '' : 's'}`}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '9px 4px', borderRadius: 10, border: bd, cursor: 'pointer',
                  background: bg, color: col, transition: 'all .15s',
                }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  {s.short}
                  {count > 0 && <span className="font-mono" style={{ fontSize: 9.5, opacity: .8, marginLeft: 6 }}>· {count}</span>}
                </span>
                <span className="font-mono" style={{ fontSize: 9.5, opacity: .8 }}>{s.meta}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* fixtureKey is the stable cross-source join: cached tournament.json and the ESPN
 * scoreboard assign different event IDs to the same fixture, but date+abbr+abbr matches. */
function fixtureKey(m) {
  const date = String(m.date || '').slice(0, 10);
  const ha = m.home && m.home.abbreviation;
  const aa = m.away && m.away.abbreviation;
  return `${date}|${ha}|${aa}`;
}

function MomentStrip({ tournament, liveOverlay, todayISO }) {
  const [todayOpen, setTodayOpen] = React.useState(false);
  const [liveOpen, setLiveOpen] = React.useState(false);
  // On touch there's no hover, and a tap fires a synthetic mouseenter THEN a
  // click — which would open the popover then immediately toggle it shut. So we
  // drive these popovers by hover on desktop and by click on touch, never both.
  const isTouch = React.useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia
      && window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    []
  );

  const matches = React.useMemo(() => {
    if (!tournament || !Array.isArray(tournament.matches)) return [];
    const overlay = liveOverlay || {};
    return tournament.matches.map(m => {
      const ov = overlay[fixtureKey(m)];
      if (!ov) return m;
      // Overlay only patches mutable fields; venue/stage/etc. stay as cached.
      return {
        ...m,
        status_state: ov.status_state || m.status_state,
        status_detail: ov.status_detail || m.status_detail,
        home_score: ov.home_score != null ? ov.home_score : m.home_score,
        away_score: ov.away_score != null ? ov.away_score : m.away_score,
        clock: ov.clock || m.clock,
      };
    });
  }, [tournament, liveOverlay]);

  // Multiple games run concurrently, so the LIVE card surfaces the first and
  // drops the rest into a popover.
  const liveMatches = matches
    .filter(m => m.status_state === 'in')
    .sort((a, b) => (a.kickoff_iso || '').localeCompare(b.kickoff_iso || ''));
  const live = liveMatches[0] || null;
  const upcoming = matches
    .filter(m => m.status_state === 'pre')
    .sort((a, b) => (a.kickoff_iso || '').localeCompare(b.kickoff_iso || ''));
  const next = upcoming[0];
  const todays = matches.filter(m =>
    String(m.date || '').slice(0, 10) === todayISO &&
    (!next || m.id !== next.id) &&
    !liveMatches.some(l => l.id === m.id)
  );

  if (!matches.length) return null;

  const fmtKickoff = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const day = d.toLocaleDateString(undefined, { weekday: 'short' });
      const hm = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${day} · ${hm}`;
    } catch { return ''; }
  };
  const fmtTimeOnly = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };
  const fmtDateLabel = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch { return iso; }
  };
  const tzAbbr = (() => {
    try {
      const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
      const tz = parts.find(p => p.type === 'timeZoneName');
      return tz ? tz.value : '';
    } catch { return ''; }
  })();
  const todaysAll = matches
    .filter(m => String(m.date || '').slice(0, 10) === todayISO)
    .sort((a, b) => (a.kickoff_iso || '').localeCompare(b.kickoff_iso || ''));

  // Not-yet-drawn knockout slots (abbr like "1A") have no flag and fall back to
  // the coloured abbr chip.
  const Crest = ({ team }) => {
    const abbr = team && team.abbreviation;
    const url = (abbr && window.flagUrl) ? window.flagUrl(abbr) : '';
    if (url) {
      return (
        <img src={url} alt={abbr} title={(team && team.name) || abbr}
          style={{
            width: 28, height: 21, objectFit: 'cover', borderRadius: 4,
            border: '1px solid rgba(255,255,255,.18)', flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,.35)',
          }}/>
      );
    }
    const color = team && team.color ? `#${team.color}` : 'var(--panel-2)';
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 6,
        background: color, color: '#fff',
        fontSize: 10, fontWeight: 800, letterSpacing: '.05em',
        border: '1px solid rgba(255,255,255,.12)', flexShrink: 0,
      }}>{abbr || '—'}</span>
    );
  };

  const Card = ({ label, accent, m, sub, isLive }) => (
    <div className="panel" style={{
      padding: '12px 14px', minWidth: 230, flex: '1 1 230px',
      borderColor: isLive ? 'rgba(200,16,46,.55)' : 'var(--line)',
      background: isLive
        ? 'linear-gradient(135deg, rgba(200,16,46,.10), rgba(11,30,55,1))'
        : 'var(--panel)',
    }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="font-mono" style={{
          fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
          color: accent, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          {isLive && (
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: 'var(--wc-red)',
              animation: 'wcLivePulse 1.6s ease-in-out infinite',
            }}/>
          )}
          {label}
        </span>
        {sub && <span className="font-mono" style={{ fontSize: 10, color: 'var(--muted-2)' }}>{sub}</span>}
      </div>
      {m ? (
        <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
          <Crest team={m.home}/>
          <span style={{ fontSize: 13, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.home && m.home.short_name}
          </span>
          <span className="font-mono num-tabular" style={{
            fontSize: 16, fontWeight: 700,
            color: isLive ? '#ff8d99' : 'var(--ink)',
            padding: '0 6px',
          }}>
            {m.home_score != null ? m.home_score : '—'}
            <span style={{ color: 'var(--muted-2)', margin: '0 4px' }}>v</span>
            {m.away_score != null ? m.away_score : '—'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.away && m.away.short_name}
          </span>
          <Crest team={m.away}/>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--muted-2)', padding: '6px 0' }}>
          No fixture
        </div>
      )}
      {m && (
        <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{m.venue || m.stage || ''}</span>
        </div>
      )}
    </div>
  );

  const PopoverRow = ({ m }) => {
    const hasScore = m.home_score != null && m.away_score != null;
    const stateLabel = m.status_state === 'in'
      ? `LIVE${m.status_detail ? ' · ' + m.status_detail : ''}`
      : m.status_state === 'post'
        ? (m.status_detail || 'FT')
        : fmtTimeOnly(m.kickoff_iso);
    const stateColor = m.status_state === 'in' ? '#ff8d99'
      : m.status_state === 'post' ? 'var(--muted)'
      : 'var(--gold-2)';
    return (
      <div className="flex items-center" style={{
        gap: 10, padding: '8px 4px', borderBottom: '1px solid var(--line)',
      }}>
        <Crest team={m.home}/>
        <span style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {(m.home && m.home.short_name) || '—'}
        </span>
        <span className="font-mono num-tabular" style={{
          fontSize: 13, fontWeight: 700, color: hasScore ? 'var(--ink)' : 'var(--muted-2)',
          minWidth: 56, textAlign: 'center',
        }}>
          {hasScore
            ? `${m.home_score} – ${m.away_score}`
            : 'vs'}
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
          {(m.away && m.away.short_name) || '—'}
        </span>
        <Crest team={m.away}/>
        <span className="font-mono" style={{ fontSize: 10.5, color: stateColor, minWidth: 86, textAlign: 'right', fontWeight: 600 }}>
          {stateLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="px-6 pt-4">
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div
          style={{ position: 'relative', flex: '1 1 230px', minWidth: 230, display: 'flex' }}
          onMouseEnter={() => !isTouch && liveMatches.length > 1 && setLiveOpen(true)}
          onMouseLeave={() => !isTouch && setLiveOpen(false)}
          onClick={() => isTouch && liveMatches.length > 1 && setLiveOpen(o => !o)}
        >
          <Card
            label={live ? `LIVE · ${live.status_detail || ''}`.trim() : 'NO MATCH LIVE'}
            accent={live ? '#ff8d99' : 'var(--muted-2)'}
            m={live}
            sub={liveMatches.length > 1 ? `${liveMatches.length} live now · tap for all` : (live && live.stage)}
            isLive={!!live}
          />
          {liveOpen && liveMatches.length > 1 && (
            <div className="wc-toast" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              minWidth: 'min(300px, calc(100vw - 48px))', maxWidth: 'min(520px, calc(100vw - 48px))', zIndex: 60,
              padding: '10px 14px', borderRadius: 12,
              background: '#0d1a2e', border: '1px solid var(--line-2)',
              boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            }}>
              <div className="font-mono" style={{
                fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#ff8d99', marginBottom: 6,
              }}>
                Live now · {liveMatches.length} matches
              </div>
              {liveMatches.map(m => (
                <PopoverRow key={fixtureKey(m)} m={m}/>
              ))}
            </div>
          )}
        </div>
        <Card
          label="NEXT UP"
          accent="var(--gold-2)"
          m={next}
          sub={next ? `${fmtKickoff(next.kickoff_iso)}${tzAbbr ? ' · ' + tzAbbr : ''}` : ''}
        />
        <div
          style={{ position: 'relative', flex: '1 1 230px', minWidth: 230, display: 'flex' }}
          onMouseEnter={() => !isTouch && setTodayOpen(true)}
          onMouseLeave={() => !isTouch && setTodayOpen(false)}
          onClick={() => isTouch && todaysAll.length > 0 && setTodayOpen(o => !o)}
        >
          <Card
            label={`TODAY · ${fmtDateLabel(todayISO)}`}
            accent="#7fc7ff"
            m={todays[0] || null}
            sub={
              todaysAll.length === 0
                ? 'No fixtures'
                : todaysAll.length > 1
                  ? `${todaysAll.length} fixtures · tap for all`
                  : (todays[0] ? `${fmtKickoff(todays[0].kickoff_iso)}${tzAbbr ? ' · ' + tzAbbr : ''}` : '')
            }
          />
          {todayOpen && todaysAll.length > 0 && (
            <div className="wc-toast" style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              minWidth: 'min(300px, calc(100vw - 48px))', maxWidth: 'min(520px, calc(100vw - 48px))', zIndex: 60,
              padding: '10px 14px', borderRadius: 12,
              background: '#0d1a2e', border: '1px solid var(--line-2)',
              boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
            }}>
              <div className="font-mono flex items-center justify-between" style={{
                fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase',
                color: 'var(--muted)', marginBottom: 6,
              }}>
                <span>Today's slate · {todaysAll.length} fixtures</span>
                {tzAbbr && <span style={{ color: 'var(--muted-2)' }}>{tzAbbr}</span>}
              </div>
              {todaysAll.map(m => (
                <PopoverRow key={fixtureKey(m)} m={m}/>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtAgo(d) {
  if (!d) return '—';
  const s = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m ago` : `${h}h ago`;
}

function makeDefaultFilters() {
  return {
    bodyPart: new Set(), situation: new Set(), finish: new Set(), precision: new Set(),
    minMin: 0, maxMin: 120, minDist: 0, maxDist: 999,
    search: '',
    nation: new Set(), stage: new Set(), scorer: null, date: null,
    position: new Set(), match: new Set(),
    minXg: 0, maxXg: 1, goalsInMatch: new Set(), opponent: new Set(), zone: null,
  };
}

function activeFilterCount(f) {
  return (f.nation ? f.nation.size : 0)
    + (f.stage ? f.stage.size : 0)
    + (f.scorer != null ? 1 : 0)
    + (f.date ? 1 : 0)
    + (f.position ? f.position.size : 0)
    + (f.match ? f.match.size : 0)
    + f.bodyPart.size + f.situation.size + f.finish.size
    + (f.opponent ? f.opponent.size : 0)
    + (f.goalsInMatch ? f.goalsInMatch.size : 0)
    + ((f.minMin > 0 || f.maxMin < 120) ? 1 : 0)
    + ((f.minDist > 0 || f.maxDist < 999) ? 1 : 0)
    + (((f.minXg ?? 0) > 0 || (f.maxXg ?? 1) < 1) ? 1 : 0)
    + ((f.search && f.search.trim()) ? 1 : 0)
    + (f.zone ? 1 : 0);
}

function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [liveOverlay, setLiveOverlay] = useState({});
  const [refreshNote, setRefreshNote] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    bodyPart: new Set(),
    situation: new Set(), finish: new Set(),
    minMin: 0, maxMin: 120,
    minDist: 0, maxDist: 999,
    search: '',
    nation: new Set(), stage: new Set(), scorer: null, date: null,
    position: new Set(),
    match: new Set(),
    minXg: 0, maxXg: 1,
    // Set of integers; chip 6 means "6 or more".
    goalsInMatch: new Set(),
    opponent: new Set(),
    // One of: null, '6yd' (x∈[114,120], y∈[30,50]), '18yd' (x∈[102,120], y∈[18,62]), 'outside18yd'.
    zone: null,
  });
  const clearAllFilters = () => setFilters(makeDefaultFilters());
  const nActiveFilters = activeFilterCount(filters);
  const [color, setColor] = useState('body');
  const [picked, setPicked] = useState(null);
  const [pickedStack, setPickedStack] = useState(null);
  const [hover, setHover] = useState(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [dataMtime, setDataMtime] = React.useState(null);

  useEffect(() => {
    setRefreshing(true);
    setLoadError(null);
    const fetchJSON = (url) =>
      fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);

    const DB = (window.WC_DATA_BASE || '').replace(/\/$/, '');
    Promise.all([
      // Cache-bust so the CDN can't serve a stale copy after a cron rebuild.
      fetch(`${DB}/data.json?v=${Date.now()}`.replace(/^\//, '')).then(async r => {
        if (!r.ok) throw new Error(`data.json ${r.status}`);
        const rows = await r.json();
        if (!Array.isArray(rows)) throw new Error('data.json is not an array');
        return { lm: r.headers.get('Last-Modified'), rows };
      }),
      fetchJSON(`${DB}/tournament.json?v=${Date.now()}`.replace(/^\//, '')),
    ]).then(([dataResp, tour]) => {
      if (dataResp.lm) {
        const d = new Date(dataResp.lm);
        if (!isNaN(d.getTime())) setDataMtime(d);
      }

      if (tour) {
        setTournament(tour);
        window.TOURNAMENT_CONFIG = tour;
        window.NATION_COLORS = tour.clubs || {};
      }

      const processed = dataResp.rows.map(g => {
        const out = {...g};
        if (out.finish_style === 'tap_in') out.finish_style = 'normal_shot';
        return out;
      });
      setData(processed);
      setRefreshing(false);
    }).catch(err => {
      setRefreshing(false);
      // The error screen only shows when there's no data yet, so a failed
      // background refresh never replaces goals the user is already viewing.
      setLoadError(err);
    });
  }, [refreshKey]);

  useEffect(() => {
    const id = setInterval(() => setRefreshKey(k => k + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Poll ESPN every 40s to patch live scores between cron rebuilds. On a new goal
  // we re-fetch data.json early (bump refreshKey) rather than wait for the 60s timer:
  // ESPN gives the *when*, the republished data the *where* (coords).
  const lastGoalTotalRef = React.useRef(null);
  const lastCoordsAtRef = React.useRef(0);
  useEffect(() => {
    let cancelled = false;
    const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const refreshSoon = () => {
      lastCoordsAtRef.current = Date.now();
      if (!cancelled) setRefreshKey(k => k + 1);
    };
    const poll = async () => {
      try {
        const now = new Date();
        const yest = new Date(now.getTime() - 24 * 3600 * 1000);
        const tom = new Date(now.getTime() + 24 * 3600 * 1000);
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${ymd(yest)}-${ymd(tom)}`;
        const r = await fetch(url);
        if (!r.ok || cancelled) return;
        const events = ((await r.json()) || {}).events || [];
        const overlay = {};
        let total = 0, liveCount = 0;
        events.forEach(e => {
          const comps = (e.competitions || [])[0] || {};
          const status = (e.status || {}).type || {};
          const cs = comps.competitors || [];
          const home = cs.find(c => c.homeAway === 'home') || {};
          const away = cs.find(c => c.homeAway === 'away') || {};
          const date = (e.date || '').slice(0, 10);
          const ha = (home.team && home.team.abbreviation) || '';
          const aa = (away.team && away.team.abbreviation) || '';
          overlay[`${date}|${ha}|${aa}`] = {
            status_state: status.state || null,
            status_detail: status.shortDetail || status.detail || '',
            home_score: home.score != null ? home.score : null,
            away_score: away.score != null ? away.score : null,
            clock: (e.status && e.status.displayClock) || '',
          };
          const hs = parseInt(home.score, 10), as = parseInt(away.score, 10);
          if (Number.isFinite(hs)) total += hs;
          if (Number.isFinite(as)) total += as;
          if (status.state === 'in') liveCount++;
        });
        if (cancelled) return;
        setLiveOverlay(prev => ({ ...prev, ...overlay }));
        const prev = lastGoalTotalRef.current;
        const firstPoll = prev === null;
        lastGoalTotalRef.current = total;
        if (liveCount > 0) {
          const stale = Date.now() - lastCoordsAtRef.current > 45000;
          if (firstPoll || total > prev || stale) refreshSoon();
        }
      } catch (_) { /* best-effort */ }
    };
    poll();
    const id = setInterval(poll, 40000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // "Today" in the user's local timezone, recomputed each render so a session
  // left open across midnight rolls over without a reload.
  const todayISO = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();


  const matchKey = (d) => d.date ? `${d.date}|${d.team}|${d.opponent}` : null;

  // matchKey → goal count in that match. Drives the "Goals in match" chip filter.
  const { goalsPerMatch, goalsInMatchStats } = useMemo(() => {
    if (!data) return { goalsPerMatch: new Map(), goalsInMatchStats: {} };
    const counts = new Map();
    for (const d of data) {
      const k = matchKey(d);
      if (!k) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    // 6+ collapses everything ≥ 6 into one bucket.
    const stats = {};
    for (const n of counts.values()) {
      const bucket = n >= 6 ? 6 : n;
      stats[bucket] = (stats[bucket] || 0) + 1;
    }
    return { goalsPerMatch: counts, goalsInMatchStats: stats };
  }, [data]);

  // `skipKey` skips one filter section, for exclude-self facet counts: ticking
  // "right_foot" shouldn't zero out the other body-part rows.
  const passes = useMemo(() => (d, skipKey) => {
    if (skipKey !== 'nation' && filters.nation && filters.nation.size && !filters.nation.has(d.team)) return false;
    if (skipKey !== 'stage' && filters.stage && filters.stage.size && !filters.stage.has(d.stage)) return false;
    if (skipKey !== 'scorer' && filters.scorer != null && String(d.scorer_id || d.scorer) !== String(filters.scorer)) return false;
    if (skipKey !== 'date' && filters.date && String(d.date).slice(0, 10) !== filters.date) return false;
    if (skipKey !== 'position' && filters.position && filters.position.size && !filters.position.has(d.scorer_role)) return false;
    if (skipKey !== 'match' && filters.match && filters.match.size && !filters.match.has(String(d.match_key || '').split('-')[0])) return false;
    if (skipKey !== 'xg' && (filters.minXg > 0 || filters.maxXg < 1)) {
      if (d.xg == null || d.xg < filters.minXg || d.xg > filters.maxXg) return false;
    }
    if (skipKey !== 'search' && filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const isNumeric = /^\d+$/.test(q);
      if (isNumeric) {
        const qn = parseInt(q, 10);
        const gn = d.goal_number;
        if (gn == null || Number(gn) !== qn) return false;
      } else {
        const hay = [
          d.scorer, d.team, d.opponent, d.team_abbr, d.opponent_abbr,
        ].map(v => (v || '').toLowerCase());
        if (!hay.some(v => v.includes(q))) return false;
      }
    }
    if (skipKey !== 'opponent' && filters.opponent && filters.opponent.size && !filters.opponent.has(d.opponent)) return false;
    if (skipKey !== 'bodyPart' && filters.bodyPart.size && !filters.bodyPart.has(d.body_part)) return false;
    if (skipKey !== 'situation' && filters.situation.size && !filters.situation.has(d.situation)) return false;
    if (skipKey !== 'finish' && filters.finish.size && !filters.finish.has(d.finish_style)) return false;
    if (skipKey !== 'minute') {
      if (d.minute != null) {
        if (d.minute < filters.minMin || d.minute > filters.maxMin) return false;
      } else if (filters.minMin > 0 || filters.maxMin < 120) {
        return false;
      }
    }
    if (skipKey !== 'distance' && (filters.minDist > 0 || filters.maxDist < 999)) {
      const dist = distFromGoal(d.x, d.y);
      if (dist == null || dist < filters.minDist || dist > filters.maxDist) return false;
    }
    if (skipKey !== 'zone' && filters.zone) {
      if (d.x == null || d.y == null) return false;
      const inBox18 = d.x >= 102 && d.x <= 120 && d.y >= 18 && d.y <= 62;
      const inBox6 = d.x >= 114 && d.x <= 120 && d.y >= 30 && d.y <= 50;
      if (filters.zone === '6yd' && !inBox6) return false;
      if (filters.zone === '18yd' && !inBox18) return false;
      if (filters.zone === 'outside18yd' && inBox18) return false;
    }
    if (skipKey !== 'goalsInMatch' && filters.goalsInMatch && filters.goalsInMatch.size > 0) {
      const k = matchKey(d);
      const n = k ? (goalsPerMatch.get(k) || 0) : 0;
      const bucket = n >= 6 ? 6 : n;
      if (!filters.goalsInMatch.has(bucket)) return false;
    }
    return true;
  }, [filters, goalsPerMatch]);

  // Derived live status (tournament.json + ESPN liveOverlay), not a flag baked
  // into the goal — so a goal stops flashing the instant its match reads finished,
  // before the next data rebuild lands.
  const liveMatchIds = useMemo(() => {
    const ids = new Set();
    const ms = (tournament && tournament.matches) || [];
    const overlay = liveOverlay || {};
    for (const m of ms) {
      const ov = overlay[fixtureKey(m)];
      const status = (ov && ov.status_state) || m.status_state;
      if (status === 'in') ids.add(String(m.id));
    }
    return ids;
  }, [tournament, liveOverlay]);
  const _withLive = (d) => ({ ...d, live: liveMatchIds.has(String(d.match_key || '').split('-')[0]) });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(d => passes(d, null)).map(_withLive);
  }, [data, passes, liveMatchIds]);

  // Like `filtered` but ignoring the match filter (exclude-self facet), so every
  // fixture stays toggleable in the Matches card even after one is selected.
  const filteredNoMatch = useMemo(() => {
    if (!data) return [];
    return data.filter(d => passes(d, 'match')).map(_withLive);
  }, [data, passes, liveMatchIds]);

  // Exclude-self counts: ticking "right_foot" doesn't zero out "left_foot"'s count.
  const counts = useMemo(() => {
    if (!data) return {
      shown: 0, total: 0,
      byBody:{}, bySit:{}, byFinish:{},
      byNation:{}, byStage:{},
    };
    const c = {
      shown: filtered.length,
      total: data.length,
      byBody:{}, bySit:{}, byFinish:{},
      byNation:{}, byStage:{},
    };
    for (const d of data) {
      if (passes(d, 'bodyPart')) c.byBody[d.body_part] = (c.byBody[d.body_part]||0)+1;
      if (passes(d, 'situation')) c.bySit[d.situation] = (c.bySit[d.situation]||0)+1;
      if (passes(d, 'finish')) c.byFinish[d.finish_style] = (c.byFinish[d.finish_style]||0)+1;
      if (d.team && passes(d, 'nation')) c.byNation[d.team] = (c.byNation[d.team]||0)+1;
      if (d.stage && passes(d, 'stage')) c.byStage[d.stage] = (c.byStage[d.stage]||0)+1;
    }
    return c;
  }, [data, filtered, passes]);

  const goalsInMatchStatsLive = useMemo(() => {
    const stats = {};
    if (!data) return stats;
    const matchGoals = new Map();
    for (const d of data) {
      if (!passes(d, 'goalsInMatch')) continue;
      const k = matchKey(d);
      if (!k) continue;
      matchGoals.set(k, (matchGoals.get(k) || 0) + 1);
    }
    for (const n of matchGoals.values()) {
      const bucket = n >= 6 ? 6 : n;
      stats[bucket] = (stats[bucket] || 0) + 1;
    }
    return stats;
  }, [data, passes]);

  if (!data && loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="panel text-center" style={{ padding: '28px 32px', maxWidth: 440 }}>
          <div className="font-serif text-2xl" style={{ color: COLORS.gold2, marginBottom: 10 }}>
            Couldn't load goal data
          </div>
          <div className="text-sm" style={{ color: COLORS.muted, marginBottom: 20 }}>
            The live data source may be temporarily unavailable. Check your connection and try again.
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={refreshing}
            className="font-mono"
            style={{
              padding: '8px 22px', borderRadius: 8, border: 'none', cursor: refreshing ? 'default' : 'pointer',
              background: 'linear-gradient(160deg, var(--gold), #b88c33)', color: COLORS.bg1,
              fontWeight: 700, letterSpacing: '.04em', opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-3xl gold-shimmer">Loading goals…</div>
        </div>
      </div>
    );
  }

  // From HTTP Last-Modified; falls back to today when the header is absent
  // (e.g. served from a file:// URL).
  const updatedDate = dataMtime || new Date();
  const updatedISO = `${updatedDate.getFullYear()}-${String(updatedDate.getMonth() + 1).padStart(2, '0')}-${String(updatedDate.getDate()).padStart(2, '0')}`;

  const stats = (() => {
    const meta = tournament || window.TOURNAMENT_CONFIG || {};
    const totalGoals = data.length;

    // Overlay-aware so "matches played" flips the instant a match goes final.
    const overlay = liveOverlay || {};
    let matchesPlayed = 0;
    for (const m of (meta.matches || [])) {
      const ov = overlay[fixtureKey(m)];
      const status = (ov && ov.status_state) || m.status_state;
      if (status === 'post') matchesPlayed++;
    }

    const nationsScored = new Set();
    const byScorer = new Map();
    for (const d of data) {
      if (d.team) nationsScored.add(d.team);
      const id = d.own_goal ? '' : String(d.scorer_id || d.scorer || '');
      if (id) {
        const r = byScorer.get(id) || { scorer: d.scorer, team: d.team, team_abbr: d.team_abbr, goals: 0 };
        if (!r.team_abbr && d.team_abbr) r.team_abbr = d.team_abbr;
        r.goals++;
        byScorer.set(id, r);
      }
    }
    const leaders = [...byScorer.values()].sort((a, b) => b.goals - a.goals);
    const top = leaders[0];

    const fmt = (iso) => iso ? `${iso.slice(8,10)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(iso.slice(5,7),10)-1]}` : '';
    const dateRange = meta.date_from && meta.date_to ? `${fmt(meta.date_from)} → ${fmt(meta.date_to)} 2026` : '';

    // name→abbr map so Hero can render the top scorer's flag.
    const nameToAbbr = {};
    (meta.matches || []).forEach(m => {
      if (m.home && m.home.name && m.home.abbreviation) nameToAbbr[m.home.name] = m.home.abbreviation;
      if (m.away && m.away.name && m.away.abbreviation) nameToAbbr[m.away.name] = m.away.abbreviation;
      if (m.home && m.home.short_name && m.home.abbreviation) nameToAbbr[m.home.short_name] = m.home.abbreviation;
      if (m.away && m.away.short_name && m.away.abbreviation) nameToAbbr[m.away.short_name] = m.away.abbreviation;
    });
    const topScorerAbbr = top ? (top.team_abbr || nameToAbbr[top.team] || '') : '';

    return {
      total: totalGoals,
      withCoord: data.filter(d => d.x != null).length,
      latestDate: updatedISO,
      nationsScored: nationsScored.size,
      topScorer: top ? top.scorer : '—',
      topScorerTeam: top ? top.team : '',
      topScorerAbbr,
      topScorerGoals: top ? top.goals : 0,
      matchesPlayed,
      totalMatches: meta.total_matches || (meta.matches || []).length || 0,
      hosts: (meta.hosts || []).join(' · '),
      dateRange,
    };
  })();

  // Goals whose (x, y) the event feed hasn't published yet — shown as a banner
  // so they read as pending rather than silently missing from the pitch.
  const pendingGoals = data.filter(d => d.coord_status === 'pending' || d.x == null);

  const onPickScorer = (id) => {
    setFilters(f => ({...f, scorer: String(f.scorer) === String(id) ? null : id }));
  };
  const onPickDate = (day) => {
    setFilters(f => ({...f, date: f.date === day ? null : day }));
  };

  // Name for the active scorer filter, for the banner above the pitch.
  const activeScorerName = filters.scorer != null
    ? (data.find(d => String(d.scorer_id || d.scorer) === String(filters.scorer)) || {}).scorer
    : null;

  return (
    <div className="min-h-screen">
      <Hero stats={stats} freshness={dataMtime ? fmtAgo(dataMtime) : null}/>

      <MomentStrip tournament={tournament} liveOverlay={liveOverlay} todayISO={todayISO}/>

      {pendingGoals.length > 0 && (
        <div className="px-6 pt-4">
          <div
            className="panel px-5 py-3 flex items-start gap-3"
            style={{
              borderColor: 'rgba(205,163,73,0.55)',
              background: 'linear-gradient(90deg, rgba(205,163,73,0.10), rgba(205,163,73,0.03))',
            }}
          >
            <div
              className="text-xs font-mono"
              style={{
                color: COLORS.gold2,
                background: 'rgba(205,163,73,0.18)',
                border: '1px solid rgba(205,163,73,0.5)',
                padding: '3px 9px',
                borderRadius: '99px',
                whiteSpace: 'nowrap',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Coords loading
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm" style={{color: COLORS.ink}}>
                <span className="font-serif text-base" style={{color: COLORS.gold2, fontWeight: 700}}>
                  {pendingGoals.length}
                </span>{' '}
                {pendingGoals.length === 1 ? 'goal is' : 'goals are'} waiting for event-data coordinates.
                <> The goal{pendingGoals.length === 1 ? '' : 's'} won't appear on the pitch until the feed publishes the location.</>
              </div>
              <div className="text-xs mt-1 font-mono" style={{color: COLORS.muted}}>
                {pendingGoals.slice(0, 4).map(g => (
                  <span key={g.goal_number} className="mr-3">
                    #{g.goal_number || '—'} vs {g.opponent || '—'}{g.minute ? ` · ${g.minute}'` : ''}{g.date ? ` · ${String(g.date).slice(0, 10)}` : ''}
                  </span>
                ))}
                {pendingGoals.length > 4 && <span style={{color: COLORS.muted2}}>+{pendingGoals.length - 4} more</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop — taps outside the filter drawer to close it. */}
      {filtersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" style={{background: 'rgba(4,10,18,0.6)'}}
             onClick={() => setFiltersOpen(false)} aria-hidden="true"/>
      )}

      <div className="px-4 sm:px-6 pt-6 lg:flex lg:gap-4 lg:items-start">
        <Sidebar
          data={data}
          filters={filters}
          setFilters={setFilters}
          counts={counts}
          goalsInMatchStats={goalsInMatchStatsLive}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        <main className="flex-1 min-w-0 pb-32">
          {(activeScorerName || filters.date) && (
            <div className="mb-3 panel px-4 py-2.5 flex items-center justify-between">
              <div className="text-xs flex items-center gap-2 flex-wrap">
                {activeScorerName && (
                  <>
                    <span style={{color: COLORS.muted}}>Scorer</span>
                    <span className="font-serif text-lg" style={{color: COLORS.gold2}}>{activeScorerName}</span>
                  </>
                )}
                {filters.date && (
                  <>
                    <span style={{color: COLORS.muted}}>Matchday</span>
                    <span className="font-serif text-lg" style={{color: COLORS.gold2}}>{fmtDate(filters.date)}</span>
                  </>
                )}
                <span className="text-[11px] font-mono" style={{color: COLORS.muted2}}>{filtered.length} goals</span>
              </div>
              <button onClick={()=>setFilters(f => ({...f, scorer: null, date: null}))} className="text-xs" style={{color: COLORS.muted}}>Clear ✕</button>
            </div>
          )}
          {/* Tournament stage bracket strip — sits directly above the
              pitch, lets you filter goals to one or more stages.
              The current stage (most-advanced we have any data for) is
              highlighted in green; selected stages render in gold. */}
          <div className="mb-3 -mx-4 sm:-mx-6">
            <StageStrip data={data} filters={filters} setFilters={setFilters}/>
          </div>
          <div className="grid grid-cols-12 gap-4 items-start">
            <div className="col-span-12 xl:col-span-8 min-w-0">
              <Pitch
                data={filtered}
                color={color} setColor={setColor}
                onPick={setPicked}
                onPickStack={setPickedStack}
                hover={hover} setHover={setHover}
              />
            </div>
            <div className="col-span-12 xl:col-span-4 min-w-0">
              <GoldenBoot data={data} activeScorer={filters.scorer} onPickScorer={onPickScorer}/>
            </div>
          </div>
          <StageProgression data={filtered} onPickDate={onPickDate} activeDate={filters.date}/>
          <Cards
            data={filtered}
            matchesData={filteredNoMatch}
            matches={(tournament && tournament.matches) || []}
            onPickGoal={setPicked}
            activeMatches={filters.match}
            onPickMatch={(id) => setFilters(f => {
              const s = new Set(f.match);
              if (s.has(id)) s.delete(id); else s.add(id);
              return {...f, match: s};
            })}
            onSearch={(q) => setFilters(f => ({...f, search: f.search === q ? '' : String(q || '')}))}
            onTimeFilter={(lo, hi) => setFilters(f => {
              const same = f.minMin === lo && f.maxMin === hi;
              return {...f, minMin: same ? 0 : lo, maxMin: same ? 120 : hi};
            })}
            onDistFilter={(lo, hi) => setFilters(f => {
              const same = f.minDist === lo && f.maxDist === hi;
              return {...f, minDist: same ? 0 : lo, maxDist: same ? 999 : hi};
            })}
            onZone={(zone) => setFilters(f => ({...f, zone: f.zone === zone ? null : zone}))}
            activeZone={filters.zone}
            onBodyPart={(key) => setFilters(f => {
              const isOnlyThis = f.bodyPart.size === 1 && f.bodyPart.has(key);
              return {...f, bodyPart: isOnlyThis ? new Set() : new Set([key])};
            })}
            // Match the exact opponent string, not a search substring — otherwise
            // isolating an opponent would also catch goals scored *against* them.
            onOpponent={(opp) => setFilters(f => {
              const isOnlyThis = f.opponent && f.opponent.size === 1 && f.opponent.has(opp);
              return {...f, opponent: isOnlyThis ? new Set() : new Set([opp])};
            })}
            activePositions={filters.position}
            onPosition={(code) => setFilters(f => {
              const s = new Set(f.position);
              if (s.has(code)) s.delete(code); else s.add(code);
              return {...f, position: s};
            })}
            activeXg={[filters.minXg, filters.maxXg]}
            onXgFilter={(lo, hi) => setFilters(f => {
              const same = f.minXg === lo && f.maxXg === hi;
              return {...f, minXg: same ? 0 : lo, maxXg: same ? 1 : hi};
            })}
          />
          <GoalTable data={filtered} open={tableOpen} setOpen={setTableOpen} onPick={setPicked}/>
        </main>
      </div>

      <GoalDrawer goal={picked} onClose={()=>setPicked(null)}/>
      <StackDrawer goals={pickedStack} onClose={()=>setPickedStack(null)} onPickGoal={setPicked}/>

      {/* Mobile-only filter controls — Clear (when filters are active) sits
          above the trigger so it's reachable without opening the drawer. */}
      {!filtersOpen && (
        <div
          className="lg:hidden fixed z-40 flex flex-col items-end gap-2"
          style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', right: 16 }}
        >
          {nActiveFilters > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 rounded-full font-mono"
              style={{
                padding: '8px 14px', fontSize: 12, fontWeight: 600,
                color: COLORS.ink, background: 'rgba(13,26,46,0.95)',
                border: `1px solid ${COLORS.line}`, boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
              }}
              aria-label="Clear all filters"
            >
              ✕ Clear ({nActiveFilters})
            </button>
          )}
          <button
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-2 rounded-full font-mono"
            style={{
              padding: '11px 18px', fontSize: 13, fontWeight: 600,
              color: COLORS.bg0, background: COLORS.gold,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            }}
            aria-label="Open filters"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M1.5 2.5h13l-5 6v5l-3-1.5v-3.5z"/>
            </svg>
            Filters{nActiveFilters > 0 ? ` · ${nActiveFilters}` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App/></ErrorBoundary>
);
