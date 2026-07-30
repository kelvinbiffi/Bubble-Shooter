// T-10 — Ícones pixel art dos bubbles (3 mundos x 6 slots), Replicate rd-plus.
// Uso: node tools/gen-icons.js [chave ...]  (sem args = todos os 18)
// Pós-processo pixel-safe: trim + resize nearest pra 48x48 com transparência.
const fs = require('fs'), path = require('path'), https = require('https');
const sharp = require('C:/K3Games/gate-of-the-dead/node_modules/sharp');

const RDPLUS = '60eb48db78cbd38cc6473d309a311db08244ed021567a9234970af971bab0d87';
const OUT = 'assets/sprites';
const RAW = 'assets/ai-raw/icons';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

function token(){const c=JSON.parse(fs.readFileSync('C:/K3Games/.mcp.json','utf8'));for(const[n,s]of Object.entries(c.mcpServers)){if(!/replicate/i.test(n))continue;if(s.env)for(const[k,v]of Object.entries(s.env))if(/REPLICATE/i.test(k))return v;if(s.args)for(const a of s.args)if(/^r8_/.test(a))return a;}throw'no token';}
const T = token();
function post(body){return new Promise((res,rej)=>{const d=JSON.stringify(body);const r=https.request({hostname:'api.replicate.com',path:'/v1/predictions',method:'POST',headers:{Authorization:'Bearer '+T,'Content-Type':'application/json',Prefer:'wait','Content-Length':Buffer.byteLength(d)}},x=>{let b='';x.on('data',c=>b+=c);x.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(b.slice(0,300))}})});r.on('error',rej);r.write(d);r.end();});}
function dl(url,dest){return new Promise((res,rej)=>{https.get(url,r=>{if(r.statusCode!==200)return rej('http '+r.statusCode);const f=fs.createWriteStream(dest);r.pipe(f);f.on('finish',()=>f.close(res));}).on('error',rej);});}

// Sufixo do estúdio adaptado ao tom neon arcade do jogo
const SUF = ', clean crisp pixel art, vibrant saturated colors, dark outline, plain background, simple bold game icon, centered';

// Slots -> cor da bolha (COLORS em js/constants.js):
// 0 red #ff3366, 1 blue #00ccff, 2 yellow #ffcc00, 3 green #00ffaa, 4 orange #ff6600, 5 purple #cc44ff
// Paleta de cada ícone escolhida pra CONTRASTAR com a cor da bolha do slot.
const JOBS = [
  // World 0 — Dinosaur Valley (🦕🦖🦎🐊🦴🌿)
  { key: 'world0-slot0', prompt: 'cute teal brontosaurus dinosaur with long neck, full body side view' },
  { key: 'world0-slot1', prompt: 'fierce green t-rex dinosaur head roaring with white teeth, side view' },
  { key: 'world0-slot2', prompt: 'small green gecko lizard with curled tail, top down view' },
  { key: 'world0-slot3', prompt: 'dark olive brown crocodile head with open jaw and white teeth, side view' },
  { key: 'world0-slot4', prompt: 'single white dinosaur femur bone with two knobs on each end' },
  { key: 'world0-slot5', prompt: 'bright green prehistoric fern leaf, single frond' },
  // World 1 — Kaiju Island (🐉🦑🔥⚡🌋🦂)
  { key: 'world1-slot0', prompt: 'green eastern dragon head with teal mane and white horns, side view' },
  { key: 'world1-slot1', prompt: 'purple kraken squid monster with curling tentacles and big eyes' },
  { key: 'world1-slot2', prompt: 'red and orange fire flame with darker red core' },
  { key: 'world1-slot3', prompt: 'bright yellow lightning bolt with white highlight' },
  { key: 'world1-slot4', prompt: 'dark gray volcano mountain erupting red lava and smoke' },
  { key: 'world1-slot5', prompt: 'golden yellow scorpion with raised stinger tail and pincers, top view' },
  // World 2 — Deep Ocean (🐙🦈🐠🐳🐚🦀)
  { key: 'world2-slot0', prompt: 'light purple octopus with big cute eyes and curly tentacles, front view' },
  { key: 'world2-slot1', prompt: 'dark navy blue shark with white belly, sharp dorsal fin and open mouth with teeth, side view' },
  { key: 'world2-slot2', prompt: 'blue and white striped tropical fish, side view' },
  { key: 'world2-slot3', prompt: 'friendly dark blue whale with light belly spouting water, side view' },
  { key: 'world2-slot4', prompt: 'pink and cream scallop seashell, fan shaped shell with ridges, pointed hinge at bottom, side view' },
  { key: 'world2-slot5', prompt: 'red crab with big raised claws, front view' },
];

async function gen(job, attempt = 1) {
  const input = { prompt: job.prompt + SUF, width: 256, height: 256, remove_bg: true };
  const p = await post({ version: RDPLUS, input });
  if (p.status !== 'succeeded' || !p.output) {
    if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); return gen(job, attempt + 1); }
    throw new Error('status=' + p.status + ' err=' + (p.error || ''));
  }
  const url = Array.isArray(p.output) ? p.output[0] : p.output;
  const raw = path.join(RAW, job.key + '.png');
  await dl(url, raw);
  // pixel-safe: trim das bordas transparentes + nearest pra 48x48 centrado
  await sharp(raw)
    .trim({ threshold: 10 })
    .resize(48, 48, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, job.key + '.png'));
  return url;
}

async function main() {
  const only = process.argv.slice(2);
  const jobs = only.length ? JOBS.filter(j => only.includes(j.key)) : JOBS;
  let ok = 0, fail = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    process.stdout.write(`[${i + 1}/${jobs.length}] ${job.key} ... `);
    try { await gen(job); ok++; console.log('ok'); }
    catch (e) { fail.push(job.key); console.log('ERRO ' + (e.message || e)); }
  }
  console.log(`concluido: ${ok} ok, ${fail.length} falhas${fail.length ? ' (' + fail.join(', ') + ')' : ''}`);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
