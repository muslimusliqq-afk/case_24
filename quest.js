(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('node:crypto').webcrypto);
  else root.Quest = factory(root.crypto);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (crypto) {
  'use strict';
  const HASHES = {
    timestamp: '5151ef6dd54e6695a485a12fafb5d367801d0eff83d1c57fd6df1524d4ee7821',
    wallet: '737c978e96f4867e8af73f32177fa598abc1aa46b3db0afdb2ce230de2acd3fd',
    location: '7104741a92e73eb6c5d69cd04cf0afbe50a8796a010d8fa25daaf79e5e173bf3',
    final: '58f88830b9f0fc9ae68b9fc5321c4a71f6824b90e09b74c400e4c0f203362e8f'
  };
  const WALLETS = Object.freeze([
    {id:'w0', address:'0x7b51e9…e42a', kind:'math', question:'8 × 8 = ?', answer:'64'},
    {id:'w1', address:'0x91cf26…110d', kind:'capital', question:'CAPITAL OF MADAGASCAR?', answer:'antananarivo'},
    {id:'w2', address:'0xa880b4…673b', kind:'power', question:'2^5 = ?', answer:'32'},
    {id:'w3', address:'0x32de08…f941', kind:'trap'},
    {id:'w4', address:'0xf5ac5a…c0ee', kind:'real'}
  ]);
  function shuffle(items, rng = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {const j = Math.floor(rng() * (i + 1)); [result[i],result[j]] = [result[j],result[i]];}
    return result;
  }
  function rearrange(previous, rng = Math.random) {
    for(let i=0;i<40;i++){const next=shuffle(previous,rng);if(next.every((id,j)=>id!==previous[j]))return next;}
    return [...previous.slice(1),previous[0]];
  }
  const solvedTiles=()=>Array.from({length:16},(_,i)=>(i+1)%16);
  const adjacent=(a,b)=>Math.abs(Math.floor(a/4)-Math.floor(b/4))+Math.abs(a%4-b%4)===1;
  const puzzleSolved=tiles=>tiles.every((tile,i)=>tile===(i+1)%16);
  function validPuzzle(tiles) {
    if(!Array.isArray(tiles)||tiles.length!==16||new Set(tiles).size!==16||!tiles.every(n=>Number.isInteger(n)&&n>=0&&n<16))return false;
    let inversions=0;
    for(let i=0;i<16;i++)for(let j=i+1;j<16;j++)if(tiles[i]&&tiles[j]&&tiles[i]>tiles[j])inversions++;
    return (inversions+4-Math.floor(tiles.indexOf(0)/4))%2===1;
  }
  function createPuzzle(rng=Math.random) {
    let best=solvedTiles(),bestDistance=-1;
    for(let attempt=0;attempt<12;attempt++){
      const tiles=solvedTiles();let blank=15,previous=-1;
      for(let n=0;n<120;n++){
        const moves=tiles.map((_,i)=>i).filter(i=>i!==previous&&adjacent(blank,i));
        const next=moves[Math.floor(rng()*moves.length)];
        [tiles[blank],tiles[next]]=[tiles[next],tiles[blank]];previous=blank;blank=next;
      }
      const distance=tiles.reduce((sum,tile,i)=>sum+(tile?Math.abs(Math.floor(i/4)-Math.floor((tile-1)/4))+Math.abs(i%4-(tile-1)%4):0),0);
      if(distance>bestDistance){best=tiles;bestDistance=distance;}
      if(distance>=28)break;
    }
    if(puzzleSolved(best))[best[14],best[15]]=[best[15],best[14]];
    return {tiles:best,moves:0};
  }
  function initial(rng) {return {version:2,stage:0,view:0,order:shuffle(WALLETS.map(w=>w.id),rng),scanned:[],active:null,corrupted:false,fragments:[],puzzle:null};}
  function restore(raw) {
    try {
      const s=JSON.parse(raw);
      if(!s || ![1,2].includes(s.version) || !Number.isInteger(s.stage) || s.stage<0 || s.stage>(s.version===1?6:7)) return initial();
      const ids=WALLETS.map(w=>w.id);
      if(!Array.isArray(s.order)||s.order.length!==5||new Set(s.order).size!==5||!s.order.every(id=>ids.includes(id)))return initial();
      if(!Array.isArray(s.scanned)||!s.scanned.every(id=>ids.includes(id)))return initial();
      if(!Array.isArray(s.fragments)||s.fragments.length!==Math.max(0,Math.min(s.stage-2,3))||!s.fragments.every(f=>typeof f==='string'&&/^\d+$/.test(f)))return initial();
      if(s.active && (s.stage!==3||!ids.includes(s.active.id)||!Number.isInteger(s.active.step)||s.active.step<0||s.active.step>3))return initial();
      const view=Number.isInteger(s.view)&&s.view>0&&s.view<=s.stage?s.view:s.stage;
      let puzzle=s.stage>=6&&s.puzzle&&validPuzzle(s.puzzle.tiles)?s.puzzle:s.stage>=6?createPuzzle():null;
      if(puzzle&&(!Number.isInteger(puzzle.moves)||puzzle.moves<0))puzzle.moves=0;
      let stage=s.stage;
      if(stage===7&&!puzzleSolved(puzzle.tiles))stage=6;
      if(stage===6&&puzzleSolved(puzzle.tiles))stage=7;
      const restored={...s,version:2,stage,view:Math.min(view,stage),corrupted:s.stage===3&&!!s.corrupted,puzzle};
      if(restored.active||restored.corrupted)restored.view=3;
      return restored;
    } catch {return initial();}
  }
  function begin(s) {if(s.stage===0)s.view=s.stage=1;}
  function recoverEvidence(s) {if(s.stage===1)s.view=s.stage=2;}
  function canNavigate(s,view) {return !s.active&&!s.corrupted&&Number.isInteger(view)&&view>=1&&view<=s.stage;}
  function navigate(s,view) {if(!canNavigate(s,view))return false;s.view=view;return true;}
  function movePuzzle(s,index) {
    if(s.stage!==6||s.view!==6||!s.puzzle||!Number.isInteger(index)||index<0||index>15)return false;
    const tiles=s.puzzle.tiles,blank=tiles.indexOf(0);
    if(!adjacent(blank,index))return false;
    [tiles[blank],tiles[index]]=[tiles[index],tiles[blank]];s.puzzle.moves++;
    if(puzzleSolved(tiles))s.view=s.stage=7;
    return true;
  }
  async function digest(value) {
    if(!crypto?.subtle)throw new Error('CRYPTO_UNAVAILABLE');
    const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
    return {bytes,hex:Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')};
  }
  async function submit(s, value) {
    const input=String(value).trim();
    const before=s.stage;
    const key=({2:'timestamp',4:'location',5:'final'})[before];
    if(!key||s.view!==before||!/^\d+$/.test(input)||(before===2&&input.length!==6))return false;
    if((await digest(input)).hex!==HASHES[key]||s.stage!==before||s.view!==before)return false;
    if(before!==5)s.fragments.push(input);
    s.view=++s.stage;
    if(s.stage===6)s.puzzle=createPuzzle();
    return true;
  }
  function openWallet(s,id) {
    if(s.stage!==3||s.view!==3||s.active||s.corrupted||s.scanned.includes(id)||!WALLETS.some(w=>w.id===id))return false;
    s.active={id,step:0};return true;
  }
  function confirmWallet(s,rng) {
    if(s.stage!==3||!s.active)return false;
    const wallet=WALLETS.find(w=>w.id===s.active.id);
    if(wallet.kind==='trap') {
      s.active.step++;
      if(s.active.step===3){s.order=rearrange(s.order,rng);s.scanned=[];s.active=null;s.corrupted=true;}
    } else if(s.active.step===0)s.active.step=1;
    return true;
  }
  async function answerWallet(s,value) {
    if(s.stage!==3||!s.active||s.active.step!==1)return false;
    const active=s.active;
    const wallet=WALLETS.find(w=>w.id===active.id);
    const input=String(value).trim().toLowerCase();
    if(wallet.kind==='trap')return false;
    if(wallet.kind==='real') {
      if(!/^0x[0-9a-f]{40}$/.test(input))return false;
      const d=await digest(input);
      if(d.hex!==HASHES.wallet||s.active!==active||s.stage!==3)return false;
      s.fragments.push(String.fromCharCode(...[75,68,166,184].map((b,i)=>b^d.bytes[i])));
      s.scanned.push(wallet.id);s.active=null;s.view=s.stage=4;return true;
    }
    if(input!==wallet.answer && !(wallet.kind==='capital'&&['антананариву','антананариво'].includes(input)))return false;
    s.scanned.push(wallet.id);s.active.step=2;return true;
  }
  function returnToScan(s) {
    if(s.corrupted){s.corrupted=false;return true;}
    if(!s.active)return false;
    const wallet=WALLETS.find(w=>w.id===s.active.id);
    if((wallet.kind!=='trap'&&s.active.step===2)||(wallet.kind==='real'&&s.active.step===1)){s.active=null;return true;}
    return false;
  }
  return {WALLETS,initial,restore,begin,recoverEvidence,submit,openWallet,confirmWallet,answerWallet,returnToScan,canNavigate,navigate,createPuzzle,validPuzzle,movePuzzle,puzzleSolved};
});
