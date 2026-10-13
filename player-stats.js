/* Standings are read independently of the ranking: missing data is never a loss. */
(function(root){
  const number = value => value == null || String(value).trim() === '' ? null : Number(value);
  function parse(rows, tournaments) {
    const result = new Map();
    for (const row of rows) {
      const week = number(row[0]), name = row[1]?.trim();
      if (!name || !Number.isInteger(week) || week < 1 || week > 14) continue;
      const settings = tournaments.find(r => number(r[0]) === week) || [];
      if (!result.has(name)) result.set(name, []);
      for (const day of [1, 2]) {
        const start = day === 1 ? 2 : 5;
        const wins = number(row[start]), losses = number(row[start+1]);
        if (wins === null && losses === null) continue;
        const complete = [wins, losses].every(v => Number.isInteger(v) && v >= 0);
        const participants = number(settings[day === 1 ? 2 : 5]);
        const championName = settings[day === 1 ? 3 : 6]?.trim() || '';
        const pdl = number(row[day === 1 ? 4 : 7]);
        const selected = row[9]?.trim();
        result.get(name).push({week, day, wins, losses, complete, participants,
          valid: participants !== null && participants >= 6,
          date: settings[day === 1 ? 1 : 4] || '',
          champion: championName === name, championPending: !championName,
          pdl: Number.isFinite(pdl) ? pdl : null,
          counted: selected === `Dia ${day}`, tied: selected === 'Empate'});
      }
    }
    return result;
  }
  function summary(events) {
    const complete = events.filter(e => e.complete);
    const wins = complete.reduce((n,e) => n+e.wins, 0);
    const losses = complete.reduce((n,e) => n+e.losses, 0);
    return {wins, losses, rate:wins+losses ? wins/(wins+losses)*100 : null,
      tournaments:complete.length, titles:complete.filter(e=>e.champion).length};
  }
  const api = {parse, summary};
  if (typeof module !== 'undefined') module.exports = api;
  else root.PlayerStats = api;
})(typeof window === 'undefined' ? globalThis : window);
