# PUBLISH — BUBBLE BLASTER · checklist de publicação itch.io

## Estado: PUBLICADO 28/09/2026 · https://k3-games-studio.itch.io/bubble-blaster (id 5070331)
OK do Kelvin dado 28/09 ("faz pra nós tudo"). Ranking deployado, GitHub pushado, página pública com tema neon. Pendente: devlog (trava de posts da conta) e divulgação.

## O pacote
- Zip web: `C:\K3Games\bubble-shooter\bubble-blaster-web.zip` (10.3 MB, gerado com 7za, testado do dist)
- Build: Vite prod, self-contained, index.html na raiz do zip ✓
- Viewport itch sugerido: 640 x 940 (canvas 420x540 + HUD; mobile-friendly ✓)

## Página itch (proposta de copy)
**Título:** Bubble Blaster
**Tagline:** Neon bubble popping arcade. Pop your way through dino, kaiju and deep-ocean worlds.
**Descrição curta:**
Aim, shoot, match 3. Chain reactions drop whole clusters in slow motion.
24 handcrafted levels across 3 neon worlds: Dinosaur Valley, Kaiju Island and Deep Ocean.
Original synthwave soundtrack for each world. Free to play, works on mobile.

**Bullets:**
- 24 levels, 3 worlds, star ratings and a winding journey map
- Smart color system: you never draw a dead bubble
- Chain-reaction drops with slow-mo (clip it!)
- Original music per world + juicy SFX
- Plays in the browser, desktop and mobile

**Preço:** $0 or donate (name your price), sugestão $2 — mesmo modelo validado no Hollow Fields.
**Tags:** bubble-shooter, arcade, casual, neon, pixel-art, singleplayer, html5, mobile
**Classificação:** Everyone

## Assets da página (PENDENTE, game-artist)
- [ ] Thumbnail 630x500 (bolhas neon + dino sprite + logo)
- [ ] Screenshots: mapa jornada, gameplay dino com combo, kaiju world, deep ocean
- [ ] GIF do momento clipável (chain drop em slow-mo)

## Checklist pré-upload
- [x] Console limpo (0 erros) desktop e mobile
- [x] QA-01..03 + code review + regressões verdes
- [x] UX média ~8, onboarding com hint, mute/map no HUD
- [x] Balance simulado (SIM-01): curva 97%→25% sem parede
- [x] Copy sem "portfolio demo"
- [x] Zip 7za (nunca Compress-Archive) testado localmente
- [ ] OK explícito do Kelvin
- [ ] Upload na conta k3-games-studio (login via Playwright: Cloudflare + 2FA email)
- [ ] Marcar "This file will be played in the browser" + mobile friendly
- [ ] Devlog inicial com screenshots de STUDIO/screenshots/

## Pós-launch (backlog)
- Leaderboard via api.k3gamesstudio.com (adicionar slug bubble-blaster no GAMES)
- Push do código pro GitHub (origin kelvinbiffi/Bubble-Shooter: 2 commits locais prontos, aguardando OK)
- Espelho/link no hub k3gamesstudio.com
