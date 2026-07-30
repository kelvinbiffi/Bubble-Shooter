# QA-REPORT-01 — Bubble Blaster · 30/07/2026 · escopo: baseline completo do jogo original (desktop + mobile)

## Veredito: REPROVADO (0 blockers, 4 majors)

Setup: dev server vite em http://localhost:5199, Playwright real mouse/touch (touch via CDP dispatchTouchEvent). Aprox. 80 tiros reais em 3 partidas desktop + 1 mobile. Console monitorado o tempo todo.

## Bugs

### QA-01-01 [MAJOR] Bolha atual não aparece no canhão
- Onde: gameplay, launcher · Plataforma: ambas
- Passos: 1. Entrar em qualquer nível 2. Olhar o canhão antes de atirar
- Esperado (GDD §5.1/Shooter.js docstring: "current bubble" no launcher; padrão do gênero): ver a bolha carregada com a cor/emoji
- Observado: canhão vazio; só o anel de hint pulsando nas bolhas do grid indica a cor. Causa: `Shooter.draw()` nunca chama `drawBubble(this.currentBubble)` (js/entities/Shooter.js, método draw)
- Evidência: STUDIO/screenshots/2026-07-30-original-gameplay.png e qa/evidencias/2026-07-30-mobile-390x844.png

### QA-01-02 [MAJOR] Física do projétil depende do frame rate
- Onde: gameplay, tiro · Plataforma: ambas (pior em monitores 120Hz+)
- Passos: 1. Rodar em monitor high-refresh 2. Comparar velocidade do tiro com 60Hz
- Esperado: velocidade constante em px/segundo (GDD §3.5 fala em "12 px per frame", mas o resto do jogo usa delta time)
- Observado: `Projectile.update()` soma `vel` por FRAME sem dt (js/entities/Projectile.js). Medi 108fps na minha máquina: tiro ~80% mais rápido que num 60Hz. Grid/partículas usam dt, projétil não.

### QA-01-03 [MAJOR] placeBubble sobrescreve célula ocupada (bolha some + leak no pool)
- Onde: gameplay, snap do projétil · Plataforma: ambas
- Passos (reproduzido 2x via console, no gameplay acontece quando worldToGrid arredonda pra célula cheia): 1. `g.grid.placeBubble(bolhaNova, 0, 0)` com célula 0,0 ocupada 2. `countAlive()` antes e depois
- Esperado: recusar a célula e achar vizinha livre (busca de célula vazia mais próxima)
- Observado: contagem fica igual (30→30), a bolha antiga é substituída silenciosamente e nunca volta pro pool. Em jogo real isso é bolha "mudando de cor" do nada e corrupção lenta do estado.

### QA-01-04 [MAJOR] Bônus de fim de nível do GDD não existe
- Onde: level clear · Plataforma: ambas
- Passos: 1. Fechar um nível com tiros sobrando 2. Comparar score
- Esperado (GDD §3.3): bônus = tiros restantes × 200 + level × 500
- Observado: score fica só nos pops (fechei nível com 1.200 = 12 bolhas × 100, zero bônus). `_levelClear()` em js/Game.js não soma nada.

### QA-01-05 [MINOR] favicon.ico 404 em toda carga
- Console: `Failed to load resource: 404 @ /favicon.ico` (único erro de console do jogo inteiro)

### QA-01-06 [MINOR] Título quebra em 2 linhas no mobile 390px
- "Bubble Blaster — Canvas2D Architecture Demo" não cabe, quebra feio no topo (evidência mobile png)

## Conformidade GDD
| Item (GDD) | Status | Nota |
|---|---|---|
| Core loop aim→shoot→match→score (§2.1) | OK | validado com ~80 tiros |
| Match 3+ com BFS (§3.2) | OK | pops de 3 a 8+ bolhas vistos |
| Drop de flutuantes +50 (§3.3) | OK | "DROP! +300" observado (6 bolhas) |
| Combo multiplicador (§3.3) | OK | x2 visto, reset em miss confirmado |
| Score pop = cluster×100×combo (§3.3) | OK | 300 = 3×100×1 |
| Bônus level clear (§3.3) | DIVERGENTE | QA-01-04 |
| Tabela de níveis (§3.4: 20 shots fixos, 5-8 rows) | DIVERGENTE (doc velho) | código usa themes.js: 3 mundos × 8 níveis, 18-30 shots. O GDD precisa de atualização, o jogo tá mais rico que o doc |
| Projétil 12px/frame, 1 por vez (§3.5) | PARCIAL | 1 por vez OK (spam de 12 cliques só gastou 2 tiros); velocidade é 10 e por frame (QA-01-02) |
| Danger zone 100px (§3.6) | OK | game over disparou quando a pilha desceu |
| Controles mouse (§2.3) | OK+ | touch também funciona (não documentado no GDD) |
| Win/lose (§2.2) | OK | clear→stars→next; shots=0→game over; retry OK |

## Regressão
n/a (baseline, primeiro report)

## Performance e estabilidade
- 108fps sustentado (monitor high-refresh), heap 5MB estável, 4 partidas seguidas sem reload, zero erro de console além do favicon.
- Resize no meio da partida: sem quebra. Spam de clique: sem tiro duplo.

## Observações não-bug (pro UX/PM)
- Fundo fora do canvas fica MARROM lamacento: o StarField pinta a viewport com starTint rgba(255,180,60,0.4), muito forte, mata o tema neon (pior no mobile). Pro UX avaliar.
- Não existe pause nem "voltar pro mapa" durante a partida; fechou a aba, perdeu o progresso do nível.
- Touch: tap atira NA HORA (sem arrastar pra mirar e soltar); funciona mas mira de precisão no dedo é difícil.
- Balance: nível 1-1 (43 bolhas, 30 tiros) tá punitivo: 2 runs de bot mirando decentemente terminaram em game over (1 por tiros, 1 por danger zone). Pro game-balance simular.
- Copy inteira é de portfólio ("Portfolio Demo", badge "GAME DEVELOPMENT PORTFOLIO"): precisa virar copy de jogo publicado (game-writer).
- Sons são WebAudio sintetizado; sem erro no console, não avaliei qualidade (game-audio).
