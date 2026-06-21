function StageProgression({ data, onPickDate, activeDate }) {
  const meta = window.TOURNAMENT_CONFIG || {};

  const byDate = React.useMemo(() => {
    const m = {};
    for (const d of data) {
      if (!d.date) continue;
      const k = String(d.date).slice(0, 10);
      if (!m[k]) m[k] = { total: 0, byStage: {} };
      m[k].total++;
      const s = d.stage || 'Group stage';
      m[k].byStage[s] = (m[k].byStage[s] || 0) + 1;
    }
    return m;
  }, [data]);

  const matchDays = React.useMemo(() => {
    if (Array.isArray(meta.match_days) && meta.match_days.length) return meta.match_days;
    return Object.keys(byDate).sort().map(date => ({ date, matches: null, stage: null }));
  }, [meta.match_days, byDate]);

  // UTC so the calendar day never shifts under a local tz.
  const _dt = (iso) => new Date(iso + 'T00:00:00Z');
  const fmtWeekday = (iso) => _dt(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const fmtMonthDay = (iso) => _dt(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const fmtFull = (iso) => _dt(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const fmtMonth = (ym) => _dt(ym + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const dom = (iso) => parseInt(iso.slice(8, 10), 10);

  const stageGroups = React.useMemo(() => {
    const g = {};
    for (const d of matchDays) {
      const s = d.stage || 'Group stage';
      (g[s] = g[s] || []).push(d);
    }
    const ordered = STAGE_ORDER.filter(s => g[s]);
    for (const s of Object.keys(g)) if (!ordered.includes(s)) ordered.push(s);
    return ordered.map(s => ({ stage: s, days: g[s] }));
  }, [matchDays]);

  const max = Math.max(1, ...matchDays.map(d => (byDate[d.date]?.total || 0)));
  const [hover, setHover] = React.useState(null);

  const stageTotals = {};
  for (const rec of Object.values(byDate)) {
    for (const [s, n] of Object.entries(rec.byStage)) stageTotals[s] = (stageTotals[s] || 0) + n;
  }
  const legendStages = STAGE_ORDER.filter(s => stageTotals[s]);

  const activeMeta = hover ? matchDays.find(d => d.date === hover) : null;
  const active = hover && (byDate[hover] || activeMeta) ? hover : null;
  const panel = active
    ? { kind: 'day', date: active, meta: activeMeta, rec: byDate[active] }
    : { kind: 'all' };

  const rangeLabel = matchDays.length
    ? `${matchDays.length} match days · ${fmtMonthDay(matchDays[0].date)} → ${fmtMonthDay(matchDays[matchDays.length - 1].date)}`
    : '';

  return (
    <div className="panel p-6 mt-6">
      <div className="flex items-end justify-between mb-4 gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>Stage progression</div>
          <div className="font-serif text-lg sm:text-2xl mt-1" style={{fontWeight: 600}}>Goals by matchday</div>
          <div className="text-[11px] mt-1 font-mono" style={{color: COLORS.muted2}}>{rangeLabel}</div>
        </div>
        <div className="text-xs" style={{color: COLORS.muted}}>Hover a day for detail · click to filter the page</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-5 w-full">
          {stageGroups.map(({ stage, days }) => {
            const color = STAGE_COLORS[stage] || COLORS.gold;
            const stageGoals = days.reduce((a, d) => a + (byDate[d.date]?.total || 0), 0);
            return (
              <div key={stage}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="legend-dot" style={{background: color, width: 9, height: 9}}></span>
                  <span className="text-[11px] uppercase tracking-widest" style={{color: COLORS.ink, letterSpacing: '0.12em'}}>{stage}</span>
                  <span className="text-[11px] font-mono" style={{color: COLORS.muted2}}>
                    {days.length} day{days.length === 1 ? '' : 's'} · {stageGoals} goal{stageGoals === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {days.map(d => {
                    const rec = byDate[d.date];
                    const goals = rec?.total || 0;
                    const intensity = goals ? 0.34 + 0.66 * (goals / max) : 1;
                    const isHover = active === d.date;
                    const isPinned = activeDate === d.date;
                    const tip = `${fmtFull(d.date)}`
                      + (d.matches != null ? ` · ${d.matches} match${d.matches === 1 ? '' : 'es'}` : '')
                      + ` · ${goals} goal${goals === 1 ? '' : 's'}`;
                    return (
                      <div key={d.date} className="flex flex-col items-center" style={{width: 44}}>
                        <span className="font-mono" style={{fontSize: 9.5, lineHeight: 1.1, color: isHover || isPinned ? COLORS.ink : COLORS.muted2, marginBottom: 4, whiteSpace: 'nowrap'}}>
                          {fmtMonthDay(d.date)}
                        </span>
                        <button
                          onMouseEnter={() => setHover(d.date)}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => onPickDate && onPickDate(d.date)}
                          title={tip}
                          style={{
                            width: 44, height: 44, borderRadius: 8,
                            background: goals ? color : 'rgba(255,255,255,0.035)',
                            opacity: goals ? intensity : 1,
                            border: `1px solid ${isPinned ? COLORS.gold2 : (isHover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.07)')}`,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'border-color .12s',
                          }}>
                          <span className="font-serif num-tabular" style={{fontSize: 20, lineHeight: 1, fontWeight: 700, color: goals ? '#0a121c' : COLORS.muted2}}>
                            {goals || '·'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel-2 p-4 text-xs w-full lg:w-[230px]" style={{flexShrink: 0, alignSelf: 'flex-start'}}>
          {panel.kind === 'day' ? (
            <>
              <div className="text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing: '0.12em'}}>Matchday</div>
              <div className="font-serif text-xl mt-1" style={{fontWeight: 600, color: COLORS.gold2, lineHeight: 1.1}}>{fmtFull(panel.date)}</div>
              <div className="text-[11px] mt-0.5 font-mono" style={{color: COLORS.muted2}}>2026</div>
              <div className="divider" style={{margin: '10px 0'}}></div>
              <div className="flex justify-between py-0.5" style={{color: COLORS.muted}}>
                <span>Fixtures</span>
                <span className="font-mono" style={{color: COLORS.ink}}>{panel.meta && panel.meta.matches != null ? panel.meta.matches : '—'}</span>
              </div>
              <div className="flex justify-between py-0.5" style={{color: COLORS.muted}}>
                <span>Goals</span>
                <span className="font-mono" style={{color: COLORS.ink}}>{panel.rec?.total || 0}</span>
              </div>
              {(panel.meta?.stage || (panel.rec && Object.keys(panel.rec.byStage)[0])) && (
                <div className="flex justify-between py-0.5" style={{color: COLORS.muted}}>
                  <span>Stage</span>
                  <span className="flex items-center gap-1.5" style={{color: COLORS.ink}}>
                    <span className="legend-dot" style={{background: STAGE_COLORS[panel.meta?.stage || Object.keys(panel.rec.byStage)[0]] || COLORS.gold}}></span>
                    {panel.meta?.stage || Object.keys(panel.rec.byStage)[0]}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="font-serif text-2xl" style={{fontWeight: 600, color: COLORS.gold2, lineHeight: 1}}>Tournament</div>
              <div className="mt-1" style={{color: COLORS.ink}}>{data.length.toLocaleString()} goals</div>
              <div className="divider" style={{margin: '10px 0'}}></div>
              {(legendStages.length ? legendStages : ['Group stage']).map(s => (
                <div key={s} className="flex justify-between items-center py-0.5" style={{opacity: stageTotals[s] ? 1 : 0.35}}>
                  <span className="flex items-center gap-2" style={{color: COLORS.muted}}>
                    <span className="legend-dot" style={{background: STAGE_COLORS[s] || COLORS.muted}}></span>{s}
                  </span>
                  <span className="font-mono num-tabular" style={{color: stageTotals[s] ? COLORS.ink : COLORS.muted2}}>{stageTotals[s] || 0}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.StageProgression = StageProgression;
