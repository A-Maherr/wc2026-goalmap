function GoalTable({ data, open, setOpen, onPick }) {
  const [sortKey, setSortKey] = React.useState('date');
  const [sortDir, setSortDir] = React.useState('desc');
  const [page, setPage] = React.useState(0);
  const [q, setQ] = React.useState('');
  const PAGE = 50;

  const filtered = React.useMemo(() => {
    let rows = data;
    if (q.trim()) {
      const Q = q.toLowerCase();
      rows = rows.filter(d =>
        (d.opponent||'').toLowerCase().includes(Q) ||
        (d.stage||'').toLowerCase().includes(Q) ||
        (d.raw_goal_type||'').toLowerCase().includes(Q) ||
        (d.team||'').toLowerCase().includes(Q)
      );
    }
    rows = [...rows].sort((a,b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (typeof av === 'number' && typeof bv === 'number') return sortDir==='desc' ? bv-av : av-bv;
      return sortDir==='desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
    return rows;
  }, [data, sortKey, sortDir, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  React.useEffect(()=>{ setPage(0); }, [q, data]);
  const view = filtered.slice(page*PAGE, (page+1)*PAGE);

  const sort = (k) => {
    if (k === sortKey) setSortDir(d => d==='desc'?'asc':'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  const arrow = (k) => sortKey===k ? (sortDir==='desc' ? ' ↓' : ' ↑') : '';

  return (
    <div className="panel mt-6">
      <button onClick={()=>setOpen(!open)} className="w-full px-6 py-4 flex items-center justify-between">
        <div className="text-left">
          <div className="text-[11px] uppercase tracking-widest" style={{color: COLORS.muted2, letterSpacing:'0.14em'}}>The full list</div>
          <div className="font-serif text-xl mt-1" style={{fontWeight: 600}}>Browse all {data.length.toLocaleString()} goals</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{color: COLORS.muted}}>{open ? 'Hide' : 'Expand'}</span>
          <span className="kbd">{open ? '▴' : '▾'}</span>
        </div>
      </button>
      {open && (
        <div className="border-t" style={{borderColor: COLORS.line}}>
          <div className="px-6 py-3 flex items-center gap-3 border-b" style={{borderColor: COLORS.line}}>
            <input className="search-input max-w-sm" placeholder="Search opponent, stage, type…" value={q} onChange={e=>setQ(e.target.value)}/>
            <span className="text-xs" style={{color: COLORS.muted}}>{filtered.length.toLocaleString()} matches</span>
          </div>
          <div style={{overflow: 'auto', maxHeight: '60vh'}}>
            <table className="gb">
              <thead style={{position:'sticky', top:0, background: COLORS.panel, zIndex: 1}}>
                <tr>
                  <th onClick={()=>sort('date')}>Date{arrow('date')}</th>
                  <th onClick={()=>sort('team')}>Team{arrow('team')}</th>
                  <th onClick={()=>sort('opponent')}>Opponent{arrow('opponent')}</th>
                  <th onClick={()=>sort('stage')}>Stage{arrow('stage')}</th>
                  <th onClick={()=>sort('minute')}>Min{arrow('minute')}</th>
                  <th>Body</th>
                  <th>Situation</th>
                  <th onClick={()=>sort('x')}>x</th>
                  <th onClick={()=>sort('y')}>y</th>
                </tr>
              </thead>
              <tbody>
                {view.map(r => (
                  <tr key={r.match_key} onClick={()=>onPick(r)} className="cursor-pointer">
                    <td className="font-mono">{r.date}</td>
                    <td><span className="flex items-center gap-2"><span className="legend-dot" style={nationDotStyle(r.team)}></span>{r.team}</span></td>
                    <td style={{color: COLORS.ink}}>{r.opponent}</td>
                    <td style={{color: COLORS.muted}}>{r.stage}</td>
                    <td className="font-mono">{r.minute != null ? r.minute + "'" : '—'}</td>
                    <td><span className="legend-dot mr-1.5" style={{background: BODY_COLORS[r.body_part]}}></span>{fmtBodyPart(r.body_part)}</td>
                    <td>{fmtSituation(r.situation)}</td>
                    <td className="font-mono">{r.x != null ? r.x.toFixed(1) : '—'}</td>
                    <td className="font-mono">{r.y != null ? r.y.toFixed(1) : '—'}</td>
                  </tr>
                ))}
                {view.length===0 && (
                  <tr><td colSpan={9} className="text-center py-8" style={{color: COLORS.muted}}>No goals match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 flex items-center justify-between border-t" style={{borderColor: COLORS.line}}>
            <div className="text-xs" style={{color: COLORS.muted}}>
              Page {page+1} of {totalPages} · showing {view.length} of {filtered.length.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page===0} onClick={()=>setPage(p=>Math.max(0,p-1))} className="text-xs px-3 py-1.5 rounded" style={{border:`1px solid ${COLORS.line}`, color: page===0?COLORS.muted2:COLORS.ink, opacity: page===0?0.4:1}}>← Prev</button>
              <button disabled={page>=totalPages-1} onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} className="text-xs px-3 py-1.5 rounded" style={{border:`1px solid ${COLORS.line}`, color: page>=totalPages-1?COLORS.muted2:COLORS.ink, opacity: page>=totalPages-1?0.4:1}}>Next →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.GoalTable = GoalTable;
