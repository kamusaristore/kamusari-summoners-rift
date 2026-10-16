const ranks=['Ferro','Bronze','Prata','Ouro','Platina','Esmeralda','Diamante','Mestre','Grão-Mestre','Desafiante'];
const colors=['#b8a49f','#d5957d','#b5cafa','#edc76a','#45d9ea','#69df9b','#8ba4ff','#dc8df1','#ff7e75','#65eaf2'];
const $=s=>document.querySelector(s);let players=[],active=0,requestId=0,hasData=false;
function elo(total){const p=Math.max(0,total),i=Math.min(9,Math.floor(p/100));return {name:ranks[i],i,points:i===9?p-900:p%100,color:colors[i]};}
function csv(text){const result=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell);cell='';}else if(c==='\n'&&!q){row.push(cell.replace(/\r$/,''));result.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell.replace(/\r$/,''));result.push(row);}return result;}
function parsePlayers(rows){if(!rows.length||rows[0][0]?.replace(/^\uFEFF/,'').trim()!=='Jogador'||rows[0][1]?.trim()!=='PDL total')throw new Error('format');return rows.slice(1).filter(r=>r[0]?.trim()).map((r,i)=>{const total=Number(r[1]);if(!Number.isFinite(total)||r[1]==='')throw new Error('invalid points');return {id:i,name:r[0].trim(),total,history:r.slice(4).map((v,j)=>({week:rows[0][j+4]||`Semana ${j+1}`,value:v.trim()===''?null:Number(v)}))};}).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));}
function node(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
function playerButton(p){const b=node('button',p.name,'player-button');b.type='button';b.addEventListener('click',()=>showHistory(p));return b;}
function render(){const term=$('#search').value.trim().toLocaleLowerCase('pt-BR'),filtered=players.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(term));$('#players').replaceChildren();filtered.forEach(p=>{const rank=elo(p.total),pos=players.findIndex(x=>x.total===p.total)+1,tie=players.filter(x=>x.total===p.total).length>1;const tr=node('tr');tr.style.setProperty('--rank-color',rank.color);tr.append(node('td',`${pos}${tie?' =':''}`,'position'));const name=node('td');name.append(playerButton(p));tr.append(name,node('td',rank.name,'badge'),node('td',`${p.total.toLocaleString('pt-BR')} PDL`,'total'));const progress=node('td'),wrap=node('div',undefined,'progress');wrap.append(node('small',rank.i===9?`+${rank.points} no Desafiante`:`${rank.points}/100 PDL`));const track=node('div',undefined,'track'),bar=node('i');bar.style.width=`${rank.i===9?100:rank.points}%`;track.append(bar);wrap.append(track);progress.append(wrap);tr.append(progress);$('#players').append(tr);});$('#empty').hidden=filtered.length>0;if(hasData)$('#empty-text').textContent=players.length?'Nenhum jogador encontrado com esse nome.':'Os primeiros jogadores aparecem aqui assim que os resultados forem registrados.';$('#count').textContent=`${players.length} jogadores · PDL acumulados na temporada${players.some((p,i)=>i&&p.total===players[i-1].total)?' · = indica empate; desempate sujeito à organização.':''}`;const leaders=$('#leaders');leaders.replaceChildren();leaders.hidden=!players.length;players.slice(0,3).forEach(p=>{const e=elo(p.total),pos=players.findIndex(x=>x.total===p.total)+1,card=node('article',undefined,'leader');card.style.setProperty('--rank-color',e.color);card.append(node('small',`POSIÇÃO ${String(pos).padStart(2,'0')}`));const h=node('h3');h.append(playerButton(p));card.append(h,node('strong',`${e.name} · ${p.total} PDL`));leaders.append(card);});}
let details = new Map(), detailsState = 'loading', selectedPlayer = null;
async function sheetRows(gid) {
  // CSV export includes filtered-out weeks; gviz only returns the visible filter.
  const url = new URL(`https://docs.google.com/spreadsheets/d/${encodeURIComponent(RIFT_CONFIG.sheetId)}/export`);
  url.search = new URLSearchParams({format:'csv', gid:String(gid), t:String(Date.now())});
  const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('standings unavailable');
  const text = await response.text();
  if (text.trimStart().startsWith('<')) throw new Error('standings unavailable');
  return csv(text);
}
async function refreshDetails(season, mine) {
  if (season.resultsGid == null) { details = new Map(); detailsState = 'unavailable'; return; }
  try {
    const all = await sheetRows(season.resultsGid);
    if (mine !== requestId) return;
    const header = all.findIndex(r=>r[0]==='Semana' && r[1]==='Jogador');
    if (header < 0 || all[0]?.[2]!=='Participantes dia 1') throw new Error('format');
    const rows = all.slice(header+1), settings = all.slice(1,15);
    details = PlayerStats.parse(rows, settings); detailsState = 'ready';
  } catch (error) {
    if (mine !== requestId) return;
    detailsState = details.size ? 'stale' : 'unavailable';
  }
  if ($('#history').open && selectedPlayer) {
    const current = players.find(p=>p.name===selectedPlayer);
    if (current) showHistory(current);
  }
}
function metric(label, value, className='') {
  const card = node('div', undefined, 'stat-card '+className);
  card.append(node('strong', value), node('span', label)); return card;
}
function showHistory(p) {
  selectedPlayer = p.name;
  const e=elo(p.total), events=details.get(p.name)||[], stats=PlayerStats.summary(events);
  const available = detailsState==='ready'||detailsState==='stale';
  const hasMatches = available && stats.tournaments>0;
  const dialog=$('#history');dialog.style.setProperty('--rank-color',e.color);
  $('#player-name').textContent=p.name;
  $('#player-emblem').src=`elo-${e.i}.png`;
  $('#player-emblem').alt=`Emblema de ${e.name}`;
  $('#player-summary').textContent=`${e.name} · ${p.total} PDL · ${RIFT_CONFIG.seasons[active].label}`;
  $('#player-progress').textContent=e.i===9?`${e.points} PDL no Desafiante`:`${100-e.points} PDL para ${ranks[e.i+1]}`;
  $('#player-stats').replaceChildren(
    metric('Taxa de vitória',hasMatches&&stats.rate!==null?stats.rate.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—','win-rate'),
    metric('Vitórias',hasMatches?String(stats.wins):'—','wins'),
    metric('Derrotas',hasMatches?String(stats.losses):'—','losses'),
    metric('Torneios registrados',available?String(stats.tournaments):'—'),
    metric('Títulos registrados',available?String(stats.titles):'—')
  );
  const notes = {loading:'Carregando resultados dos torneios…',unavailable:'Resultados detalhados indisponíveis. O histórico de PDL continua disponível.',stale:'Não foi possível atualizar os torneios. Exibindo os últimos resultados carregados.',ready:'Vitórias e derrotas incluem os dois dias com resultados completos. Apenas o melhor torneio válido da semana soma PDL ao ranking.'};
  $('#stats-note').textContent=notes[detailsState]+(events.some(e=>!e.complete)?' Há resultados incompletos, ainda fora das estatísticas.':'')+(events.some(e=>e.championPending)?' Títulos e bônus aguardam o cadastro de alguns campeões.':'');
  const weeks=p.history.filter(h=>h.value!==null&&Number.isFinite(h.value));
  const list=$('#history-list');list.replaceChildren();
  if(!weeks.length)list.append(node('p','Nenhum resultado semanal registrado.','stats-note'));
  weeks.forEach(h=>{const row=node('div',undefined,'history-row');row.append(node('span',h.week),node('strong',`${h.value>0?'+':''}${h.value} PDL`));list.append(row);});
  const chart=$('#player-chart');chart.replaceChildren();
  if(weeks.length){
    let total=0;const points=[{week:'Início',total:0},...weeks.map(h=>({week:h.week,total:(total=Math.max(0,total+h.value))}))];
    const max=Math.max(100,...points.map(p=>p.total)), ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 150');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Evolução de PDL: ${points.map(p=>p.week+': '+p.total).join('; ')}`);
    const line=document.createElementNS(ns,'polyline');line.setAttribute('points',points.map((p,i)=>`${18+i*604/(points.length-1)},${126-p.total/max*100}`).join(' '));line.setAttribute('class','evolution-line');svg.append(line);
    points.forEach((p,i)=>{const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',18+i*604/(points.length-1));dot.setAttribute('cy',126-p.total/max*100);dot.setAttribute('r','4');const title=document.createElementNS(ns,'title');title.textContent=`${p.week}: ${p.total} PDL`;dot.append(title);svg.append(dot);});chart.append(svg);
    const labels=node('div',undefined,'chart-labels');labels.append(node('span','Início · 0 PDL'),node('span',`${points.at(-1).week} · ${points.at(-1).total} PDL`));chart.append(labels);
  }else chart.append(node('p','A evolução aparece após o primeiro resultado.','stats-note'));
  const tournaments=$('#tournament-list');tournaments.replaceChildren();
  if(!available)tournaments.append(node('p',detailsState==='loading'?'Carregando…':'Tente atualizar o ranking para consultar os torneios.','stats-note'));
  else if(!events.length)tournaments.append(node('p','Nenhum confronto lançado para este jogador.','stats-note'));
  [...events].sort((a,b)=>b.week-a.week||b.day-a.day).forEach(event=>{
    const card=node('article',undefined,'tournament-card'+(event.counted||event.tied?' counted':''));
    const head=node('div',undefined,'tournament-head');head.append(node('strong',`Semana ${event.week} · Dia ${event.day}`),node('span',event.champion?'♛ Campeão':event.date));
    const score=node('div',undefined,'tournament-score');score.append(node('b',event.complete?`${event.wins}V — ${event.losses}D`:'Resultado incompleto'),node('strong',event.pdl===null?'—':`${event.pdl>0?'+':''}${event.pdl} PDL`));
    const status=!event.complete?'Aguardando resultado completo':event.participants===null?'Participantes ainda não informados':!event.valid?'Não vale para o ranking · menos de 6 participantes':event.tied?'Melhor PDL empatado · conta uma vez na semana':event.counted?'Melhor resultado · vale para o ranking':'Resultado adicional · não soma PDL na semana';
    card.append(head,score,node('small',status));tournaments.append(card);
  });
  if(!dialog.open)dialog.showModal();
}

async function refresh(){const mine=++requestId,season=RIFT_CONFIG.seasons[active];$('#refresh').disabled=true;$('#status').textContent='Consultando resultados…';try{const url=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(RIFT_CONFIG.sheetId)}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(season.tab)}&headers=1&t=${Date.now()}`;const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('unavailable');const text=await response.text();const fresh=parsePlayers(csv(text));if(mine!==requestId)return;players=fresh;hasData=true;render();refreshDetails(season,mine);$('#status').textContent=`Atualizado às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · a cada minuto`;}catch(err){if(mine!==requestId)return;$('#status').textContent=hasData?'Atualização indisponível · últimos dados mantidos':'Aguardando conexão com a planilha';if(!hasData){$('#empty-text').textContent='O ranking será exibido quando a planilha estiver disponível para leitura. Nenhum resultado foi publicado aqui ainda.';}}finally{if(mine===requestId)$('#refresh').disabled=false;}}
RIFT_CONFIG.seasons.forEach((s,i)=>{const o=node('option',s.label);o.value=i;$('#season').append(o);});$('#season').addEventListener('change',e=>{active=Number(e.target.value);$('#history').close();details=new Map();detailsState="loading";players=[];hasData=false;render();refresh();});$('#search').addEventListener('input',render);$('#refresh').addEventListener('click',refresh);$('#history .close').addEventListener('click',()=>$('#history').close());$('#history').addEventListener('click',e=>{if(e.target===$('#history')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
ranks.forEach((name,i)=>{const card=node('div',undefined,'rank-card');card.style.setProperty('--rank-color',colors[i]);const img=node('div',undefined,'emblem');img.setAttribute('role','img');img.setAttribute('aria-label',`Emblema de ${name}`);img.style.backgroundPosition=`${(i%5)*25}% ${i<5?0:100}%`;card.append(img,node('strong',name),node('small',`${i*100}${i===9?'+':`–${i*100+99}`} PDL`));$('#rank-grid').append(card);});refresh();setInterval(()=>{if(!document.hidden)refresh();},RIFT_CONFIG.refreshMs);

