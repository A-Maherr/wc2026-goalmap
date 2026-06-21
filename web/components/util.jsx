const COLORS = {
  bg0: '#0a121c', bg1: '#0f1c2b', panel: '#11202f', panel2: '#16293b',
  line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.14)',
  ink: '#f3f7f4', muted: '#94a3b3', muted2: '#65788a',
  grass: '#1f6f3a', grass2: '#2a8a4c', gold: '#cda349', gold2: '#e6c167',
  rf: '#cda349', lf: '#5dade2', hd: '#e74c3c', ot: '#9b59b6',
  navy: '#1a3a5c', navy2: '#234b75', red: '#c8102e', red2: '#e03a52',
};

// Keys match the stage labels in data.json.
const STAGE_COLORS = {
  'Group stage': '#2a8a4c', 'Round of 32': '#5dade2', 'Round of 16': '#3b82f6',
  'Quarter-final': '#9b59b6', 'Semi-final': '#e6a23c', 'Third place': '#6b736e',
  'Final': '#c8102e',
};
const STAGE_ORDER = ['Group stage','Round of 32','Round of 16','Quarter-final','Semi-final','Third place','Final'];
const FIFA3_TO_ISO2 = {
  USA:'US', CAN:'CA', MEX:'MX', ARG:'AR', BRA:'BR', URU:'UY', COL:'CO', ECU:'EC',
  PAR:'PY', PER:'PE', CHI:'CL', BOL:'BO', VEN:'VE', FRA:'FR', ESP:'ES', GER:'DE',
  POR:'PT', NED:'NL', ITA:'IT', BEL:'BE', CRO:'HR', SUI:'CH', DEN:'DK', AUT:'AT',
  UKR:'UA', SRB:'RS', POL:'PL', SWE:'SE', NOR:'NO', TUR:'TR', CZE:'CZ', HUN:'HU',
  ROU:'RO', GRE:'GR', SVK:'SK', SVN:'SI', IRL:'IE', ISL:'IS', FIN:'FI', JPN:'JP',
  KOR:'KR', IRN:'IR', KSA:'SA', AUS:'AU', QAT:'QA', UAE:'AE', IRQ:'IQ', JOR:'JO',
  UZB:'UZ', CHN:'CN', OMA:'OM', SYR:'SY', IND:'IN', SEN:'SN', MAR:'MA', TUN:'TN',
  ALG:'DZ', EGY:'EG', NGA:'NG', CMR:'CM', GHA:'GH', CIV:'CI', RSA:'ZA', MLI:'ML',
  BFA:'BF', CGO:'CG', CPV:'CV', ANG:'AO', ZAM:'ZM', GAB:'GA', GUI:'GN', NZL:'NZ',
  CRC:'CR', PAN:'PA', HON:'HN', JAM:'JM', HAI:'HT', SLV:'SV', GUA:'GT', CUW:'CW',
  TRI:'TT', SUR:'SR', BIH:'BA', COD:'CD', CGO:'CG',
};
// Flag emoji don't render on Windows/Chrome (fall back to "KR"/"MX" text), so
// use flagcdn SVGs. England/Scotland/Wales use flagcdn's GB-subdivision codes.
const FLAG_SUBDIV = { ENG: 'gb-eng', SCO: 'gb-sct', WAL: 'gb-wls' };
function flagUrl(abbr) {
  if (!abbr) return '';
  const a = String(abbr).toUpperCase();
  const code = FLAG_SUBDIV[a] || (FIFA3_TO_ISO2[a] || '').toLowerCase();
  return code ? `https://flagcdn.com/${code}.svg` : '';
}

function FlagImg({ abbr, size = 18, style = {} }) {
  const url = flagUrl(abbr);
  if (!url) {
    return (
      <span className="font-mono" style={{ fontSize: Math.round(size * 0.6), color: COLORS.muted2, ...style }}>
        {abbr || ''}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={abbr || ''}
      loading="lazy"
      style={{
        width: size, height: Math.round(size * 0.75), objectFit: 'cover',
        borderRadius: 2, display: 'inline-block', verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.12)', ...style,
      }}
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  );
}

const BODY_COLORS = {
  right_foot: COLORS.rf, left_foot: COLORS.lf, header: COLORS.hd, other: COLORS.ot, unknown: '#5b6560'
};
const SITUATION_COLORS = {
  open_play: '#cda349', penalty: '#e74c3c', counterattack: '#5dade2',
  direct_free_kick: '#9b59b6', corner: '#2a8a4c', set_piece: '#e6a23c', unknown: '#5b6560'
};
const FINISH_COLORS = {
  normal_shot: '#cda349', penalty: '#e74c3c', header: '#e67e22', free_kick: '#9b59b6',
  tap_in: '#5dade2', rebound: '#2a8a4c', volley: '#f39c12', unknown: '#5b6560'
};
const PRECISION_COLORS = {
  exact_event_data: '#2a8a4c', zone_estimate: '#e6a23c', unavailable: '#5b6560'
};

// Populated on window.NATION_COLORS by app.jsx before first render; empty
// default lets earlier readers degrade gracefully instead of throwing.
let NATION_COLORS = {};

function _luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Deterministic per-team fallback colour, stable across reloads.
function _hashColor(team) {
  const s = String(team || '');
  if (!s) return COLORS.muted;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

function lookupNationColor(team) {
  if (!team) return COLORS.muted;
  const overrides = window.NATION_COLORS || NATION_COLORS;
  const o = overrides[team];
  if (o) {
    if (typeof o === 'string') return o;
    if (typeof o === 'object') return o.primary || o.color || o.hex || _hashColor(team);
  }
  return _hashColor(team);
}

// Thin outline keeps very-dark / very-light fills visible against the bg.
function nationDotStyle(team) {
  const bg = lookupNationColor(team);
  const lum = _luminance(bg);
  let border = 'none';
  if (lum < 0.18) border = '1px solid rgba(255,255,255,0.55)';
  else if (lum > 0.82) border = '1px solid rgba(0,0,0,0.45)';
  return { background: bg, border };
}

// Very-dark fills are unreadable as text on the dark bg; swap for light grey.
function nationTextColor(team) {
  const c = lookupNationColor(team);
  return _luminance(c) < 0.20 ? '#e2e2e2' : c;
}

function distFromGoal(x, y) {
  if (x == null || y == null) return null;
  const dx = 120 - x, dy = 40 - y;
  return Math.sqrt(dx*dx + dy*dy);
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtBodyPart(b) {
  return ({right_foot:'Right foot', left_foot:'Left foot', header:'Header', other:'Other', unknown:'Unknown'})[b] || b;
}
function fmtSituation(s) {
  return ({open_play:'Open play', penalty:'Penalty', counterattack:'Counter', direct_free_kick:'Direct FK', corner:'Corner', set_piece:'Set piece', unknown:'Unknown'})[s] || s;
}
function fmtFinish(f) {
  return ({normal_shot:'Normal', penalty:'Penalty', header:'Header', free_kick:'Free kick', tap_in:'Tap-in', rebound:'Rebound', volley:'Volley', unknown:'Unknown'})[f] || f;
}
function fmtPrecision(p) {
  return ({exact_event_data:'Exact', zone_estimate:'Zone', unavailable:'No location'})[p] || p;
}

// Own goals read as "Own Goal" everywhere a scorer would show, regardless of
// how the source tagged the conceding player. Non-own-goals are unchanged, so
// the "other" body-part/finish category still applies to genuine cases.
function scorerLabel(goal) {
  if (goal && goal.own_goal) return 'Own Goal';
  return (goal && goal.scorer) || '';
}

Object.assign(window, {
  COLORS, BODY_COLORS, SITUATION_COLORS, FINISH_COLORS, PRECISION_COLORS,
  STAGE_COLORS, STAGE_ORDER, FIFA3_TO_ISO2, flagUrl, FlagImg,
  NATION_COLORS, distFromGoal,
  fmtDate, fmtBodyPart, fmtSituation, fmtFinish, fmtPrecision, scorerLabel,
  nationDotStyle, nationTextColor, lookupNationColor,
});
