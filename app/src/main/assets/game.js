const SUITS = ["♠", "♥", "♣", "♦"];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const NAMES = ["你", "西家 AI", "北家 AI（队友）", "东家 AI"];
const TEAM_NAMES = ["我方", "对方"];

let players = [];
let level = [2, 2];
let current = 0;
let leader = 0;
let lastPlay = null;
let passCount = 0;
let finishOrder = [];
let selected = new Set();
let locked = false;

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const teamOf = player => player % 2;

function rankName(rank) {
  return ({11: "J", 12: "Q", 13: "K", 14: "A", 15: "小王", 16: "大王"})[rank] || String(rank);
}

function strength(rank, player = current) {
  if (rank === 15) return 15;
  if (rank === 16) return 16;
  const currentLevel = level[teamOf(player)];
  return rank === currentLevel ? 14.5 : rank;
}

function makeDeck() {
  const deck = [];
  let id = 0;
  for (let copy = 0; copy < 2; copy++) {
    for (const rank of RANKS) {
      for (const suit of SUITS) deck.push({id: id++, rank, suit});
    }
    deck.push({id: id++, rank: 15, suit: "J"});
    deck.push({id: id++, rank: 16, suit: "J"});
  }
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function sortHand(hand, player) {
  hand.sort((a, b) => strength(a.rank, player) - strength(b.rank, player) || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit));
}

function groupByRank(cards) {
  const groups = new Map();
  cards.forEach(card => {
    if (!groups.has(card.rank)) groups.set(card.rank, []);
    groups.get(card.rank).push(card);
  });
  return groups;
}

function evaluate(cards, player = current) {
  if (!cards.length) return null;
  const sorted = [...cards].sort((a, b) => a.rank - b.rank);
  const groups = groupByRank(sorted);
  const counts = [...groups.values()].map(g => g.length).sort((a, b) => b - a);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const n = cards.length;

  if (n === 4 && cards.every(c => c.rank >= 15)) return combo("jokerBomb", 100, 4, cards);
  if (groups.size === 1 && n >= 4) return combo("bomb", strength(ranks[0], player), n, cards);
  if (n === 1) return combo("single", strength(cards[0].rank, player), 1, cards);
  if (n === 2 && groups.size === 1) return combo("pair", strength(ranks[0], player), 2, cards);
  if (n === 3 && groups.size === 1) return combo("triple", strength(ranks[0], player), 3, cards);
  if (n === 5 && counts.join(",") === "3,2") {
    const tripleRank = [...groups].find(([, g]) => g.length === 3)[0];
    return combo("fullHouse", strength(tripleRank, player), 5, cards);
  }

  if (n === 5 && groups.size === 5 && ranks.every(r => r <= 14) && isConsecutive(ranks)) {
    const flush = cards.every(c => c.suit === cards[0].suit);
    return combo(flush ? "straightFlush" : "straight", ranks[4], 5, cards);
  }
  if (n === 6 && groups.size === 3 && counts.every(c => c === 2) && isConsecutive(ranks)) {
    return combo("pairRun", ranks[2], 6, cards);
  }
  if (n === 6 && groups.size === 2 && counts.every(c => c === 3) && isConsecutive(ranks)) {
    return combo("tripleRun", ranks[1], 6, cards);
  }
  return null;
}

function combo(type, value, size, cards) {
  const labels = {
    single: "单张", pair: "对子", triple: "三张", fullHouse: "三带二",
    straight: "顺子", pairRun: "三连对", tripleRun: "钢板",
    bomb: `${size}张炸弹`, straightFlush: "同花顺", jokerBomb: "四王炸"
  };
  return {type, value, size, cards: [...cards], label: labels[type]};
}

function isConsecutive(ranks) {
  return ranks.every((rank, i) => i === 0 || rank === ranks[i - 1] + 1);
}

function bombPower(play) {
  if (play.type === "jokerBomb") return 10000;
  if (play.type === "straightFlush") return 8000 + play.value;
  if (play.type === "bomb") return play.size * 100 + play.value;
  return 0;
}

function beats(play, previous) {
  if (!previous) return true;
  const aBomb = bombPower(play);
  const bBomb = bombPower(previous);
  if (aBomb || bBomb) return aBomb > bBomb;
  return play.type === previous.type && play.size === previous.size && play.value > previous.value;
}

function cardHTML(card, selectable = false) {
  const red = card.suit === "♥" || card.suit === "♦" || card.rank === 16;
  const joker = card.rank >= 15;
  const levelCard = card.rank === level[0] || card.rank === level[1];
  return `<div class="card ${red ? "red" : ""} ${joker ? "joker" : ""} ${levelCard ? "level" : ""} ${selected.has(card.id) ? "selected" : ""}"
    ${selectable ? `data-id="${card.id}"` : ""}>
    <span class="rank">${rankName(card.rank)}</span>
    ${joker ? "" : `<span class="suit">${card.suit}</span><span class="big-suit">${card.suit}</span>`}
  </div>`;
}

function render() {
  players.forEach((p, i) => {
    const finished = finishOrder.indexOf(i);
    $(`player${i}`).className = `seat ${i === 0 ? "human-seat" : ["", "west", "north", "east"][i]} ${i === current ? "active" : ""} ${finished >= 0 ? "finished" : ""}`;
    $(`player${i}`).innerHTML = `<div class="name">${NAMES[i]}</div>
      <div class="meta">${finished >= 0 ? `第 ${finished + 1} 名` : `剩余 ${p.hand.length} 张`} · ${TEAM_NAMES[teamOf(i)]}</div>`;
  });

  $("hand").innerHTML = players[0].hand.map(c => cardHTML(c, true)).join("");
  document.querySelectorAll("#hand .card").forEach(el => {
    el.addEventListener("click", () => {
      if (locked || current !== 0 || finishOrder.includes(0)) return;
      const id = Number(el.dataset.id);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      render();
    });
  });

  if (lastPlay) {
    $("lastPlay").innerHTML = `<span class="last-label">${NAMES[lastPlay.player]}：${lastPlay.label}</span>` +
      lastPlay.cards.map(c => cardHTML(c)).join("");
  } else {
    $("lastPlay").innerHTML = "";
  }

  const canAct = !locked && current === 0 && !finishOrder.includes(0);
  $("playBtn").disabled = !canAct;
  $("hintBtn").disabled = !canAct;
  $("passBtn").disabled = !canAct || !lastPlay || leader === 0;
  $("roundInfo").textContent = `我方级别：${rankName(level[0])}　对方级别：${rankName(level[1])}`;
}

function startGame(resetLevels = false) {
  if (resetLevels) level = [2, 2];
  const deck = makeDeck();
  players = Array.from({length: 4}, (_, i) => ({hand: deck.slice(i * 27, i * 27 + 27)}));
  players.forEach((p, i) => sortHand(p.hand, i));
  selected.clear();
  finishOrder = [];
  lastPlay = null;
  passCount = 0;
  leader = Math.floor(Math.random() * 4);
  current = leader;
  locked = false;
  setStatus(`${NAMES[current]}先出`);
  render();
  if (current !== 0) scheduleAI();
}

function setStatus(text) {
  $("status").textContent = text;
}

function removeCards(player, cards) {
  const ids = new Set(cards.map(c => c.id));
  players[player].hand = players[player].hand.filter(c => !ids.has(c.id));
}

async function submitPlay(player, cards) {
  const play = evaluate(cards, player);
  if (!play) {
    setStatus("所选牌不能组成有效牌型");
    return false;
  }
  if (!beats(play, lastPlay)) {
    setStatus(`需要压过${lastPlay.label}`);
    return false;
  }

  removeCards(player, cards);
  play.player = player;
  lastPlay = play;
  leader = player;
  passCount = 0;
  selected.clear();
  setStatus(`${NAMES[player]}出了${play.label}`);

  if (players[player].hand.length === 0 && !finishOrder.includes(player)) {
    finishOrder.push(player);
    setStatus(`${NAMES[player]}获得第 ${finishOrder.length} 名`);
  }
  render();
  await sleep(550);
  return advance();
}

async function pass(player) {
  if (!lastPlay || player === leader) return;
  passCount++;
  setStatus(`${NAMES[player]}选择不出`);
  render();
  await sleep(420);

  const activeCount = 4 - finishOrder.length;
  if (passCount >= Math.max(1, activeCount - 1)) {
    lastPlay = null;
    passCount = 0;
    current = finishOrder.includes(leader) ? nextActive(leader) : leader;
    setStatus(`${NAMES[current]}获得新一轮出牌权`);
    render();
    if (current !== 0) scheduleAI();
    return;
  }
  advance();
}

function nextActive(from) {
  let next = from;
  for (let i = 0; i < 4; i++) {
    next = (next + 1) % 4;
    if (!finishOrder.includes(next)) return next;
  }
  return -1;
}

function advance() {
  if (finishOrder.length >= 3) return endRound();
  current = nextActive(current);
  setStatus(`轮到${NAMES[current]}`);
  render();
  if (current !== 0) scheduleAI();
}

function pick(groups, rank, count) {
  return groups.get(rank).slice(0, count);
}

function allCandidates(hand, player, target = null) {
  const groups = groupByRank(hand);
  const ranks = [...groups.keys()].sort((a, b) => strength(a, player) - strength(b, player));
  const result = [];
  const add = cards => {
    const play = evaluate(cards, player);
    if (play && (!target || beats(play, target))) result.push(play);
  };

  for (const rank of ranks) {
    const g = groups.get(rank);
    add(g.slice(0, 1));
    if (g.length >= 2) add(g.slice(0, 2));
    if (g.length >= 3) add(g.slice(0, 3));
    if (g.length >= 4) for (let n = 4; n <= g.length; n++) add(g.slice(0, n));
  }

  const tripleRanks = ranks.filter(r => groups.get(r).length >= 3);
  const pairRanks = ranks.filter(r => groups.get(r).length >= 2);
  for (const t of tripleRanks) {
    for (const p of pairRanks) if (p !== t) add([...pick(groups, t, 3), ...pick(groups, p, 2)]);
  }

  const naturalRanks = [...groups.keys()].filter(r => r <= 14).sort((a, b) => a - b);
  for (let start = 0; start <= naturalRanks.length - 5; start++) {
    const seq = naturalRanks.slice(start, start + 5);
    if (isConsecutive(seq)) {
      add(seq.map(r => groups.get(r)[0]));
      for (const suit of SUITS) {
        const suited = seq.map(r => groups.get(r).find(c => c.suit === suit));
        if (suited.every(Boolean)) add(suited);
      }
    }
  }
  for (let start = 0; start <= pairRanks.length - 3; start++) {
    const seq = [...pairRanks].sort((a,b) => a-b).slice(start, start + 3);
    if (seq.every(r => r <= 14) && isConsecutive(seq)) add(seq.flatMap(r => pick(groups, r, 2)));
  }
  for (let start = 0; start <= tripleRanks.length - 2; start++) {
    const seq = [...tripleRanks].sort((a,b) => a-b).slice(start, start + 2);
    if (seq.every(r => r <= 14) && isConsecutive(seq)) add(seq.flatMap(r => pick(groups, r, 3)));
  }

  const jokers = hand.filter(c => c.rank >= 15);
  if (jokers.length === 4) add(jokers);

  const key = p => p.cards.map(c => c.id).sort((a,b) => a-b).join("-");
  return [...new Map(result.map(p => [key(p), p])).values()];
}

function chooseAIPlay(player) {
  const candidates = allCandidates(players[player].hand, player, lastPlay);
  if (!candidates.length) return null;
  const teammateLeading = lastPlay && teamOf(lastPlay.player) === teamOf(player);
  if (teammateLeading && players[lastPlay.player].hand.length <= 5 && Math.random() < .8) return null;

  candidates.sort((a, b) => {
    const aBomb = bombPower(a), bBomb = bombPower(b);
    if (!!aBomb !== !!bBomb) return aBomb ? 1 : -1;
    if (!lastPlay && a.size !== b.size) return b.size - a.size;
    return a.value - b.value || a.size - b.size;
  });
  return candidates[0];
}

async function scheduleAI() {
  locked = true;
  render();
  await sleep(650 + Math.random() * 500);
  if (current === 0 || finishOrder.includes(current)) {
    locked = false;
    render();
    return;
  }
  const player = current;
  const play = chooseAIPlay(player);
  locked = false;
  if (play) await submitPlay(player, play.cards);
  else await pass(player);
}

function endRound() {
  const last = [0,1,2,3].find(p => !finishOrder.includes(p));
  finishOrder.push(last);
  const winner = finishOrder[0];
  const teammatePlace = finishOrder.indexOf((winner + 2) % 4) + 1;
  const gain = teammatePlace === 2 ? 3 : teammatePlace === 3 ? 2 : 1;
  const winningTeam = teamOf(winner);
  level[winningTeam] = Math.min(14, level[winningTeam] + gain);
  setStatus(`${TEAM_NAMES[winningTeam]}获胜，升 ${gain} 级！2秒后开始下一局`);
  locked = true;
  render();
  setTimeout(() => startGame(false), 2300);
}

function hint() {
  const candidates = allCandidates(players[0].hand, 0, lastPlay);
  if (!candidates.length) {
    setStatus("没有能压过的牌，可以选择不出");
    return;
  }
  candidates.sort((a,b) => !!bombPower(a) - !!bombPower(b) || a.value - b.value);
  selected = new Set(candidates[0].cards.map(c => c.id));
  setStatus(`提示：${candidates[0].label}`);
  render();
}

$("playBtn").addEventListener("click", async () => {
  if (current !== 0 || locked) return;
  const cards = players[0].hand.filter(c => selected.has(c.id));
  if (!cards.length) return setStatus("请先选择要出的牌");
  locked = true;
  render();
  const ok = await submitPlay(0, cards);
  if (!ok) {
    locked = false;
    render();
  }
});

$("passBtn").addEventListener("click", () => pass(0));
$("hintBtn").addEventListener("click", hint);
$("newBtn").addEventListener("click", () => startGame(true));
$("helpBtn").addEventListener("click", () => $("helpDialog").showModal());
$("closeHelp").addEventListener("click", () => $("helpDialog").close());

startGame(true);
