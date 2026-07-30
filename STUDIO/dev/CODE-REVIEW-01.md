# CODE-REVIEW-01 — Bubble Blaster · 30/07/2026 · rodada 1 de correções (QA-REPORT-01, T-03..T-08)

## Veredito: APROVADO

Revisão de olhos frescos do diff da rodada (working tree vs HEAD), estática + validação headless. Playwright não usado nesta revisão (browser ocupado por outro especialista); em compensação rodei o `STUDIO/qa/headless-check.mjs` oficial (7/7 PASS) e escrevi um probe extra de bordas do BFS com 11 casos (11/11 PASS, script no scratchpad da sessão, casos listados abaixo).

## Arquivos revisados
| Arquivo | Tarefa | Resultado |
|---|---|---|
| js/entities/Shooter.js | T-03 (bolha no canhão) | OK |
| js/constants.js | T-04 (SHOOT_SPEED 600 px/s) | OK |
| js/entities/Projectile.js | T-04 (update(dt)) | OK |
| js/Game.js | T-04 (substeps) + T-06 (bônus) | OK |
| js/systems/BubbleGrid.js | T-05 (_nearestFreeCell) | OK |
| index.html | T-07 (favicon) + T-08 (título) | OK |
| css/style.css | T-08 (media query mobile) | OK |

## O que foi checado a fundo

### T-05 — BFS do _nearestFreeCell (BubbleGrid.js:248-284)
- Direções even/odd idênticas às do `getNeighbors` (fonte da verdade do grid), então a vizinhança do BFS é consistente com o resto do jogo.
- Limites: `c >= maxC(r)` com maxC = COLS (par) / COLS-1 (ímpar) confere com o storage (par 0..10, ímpar 0..9). `r > this.grid.length` permite exatamente UMA fileira nova abaixo do grid, que é o comportamento físico certo (bolha encosta por baixo numa coluna cheia) e o `placeBubble` cria a fileira com `if (!this.grid[row]) this.grid[row] = []` sem deixar buraco no array (r nunca pula índice).
- Clamps de entrada: row negativa vira 0, col absurda clampada pela parity da row. Free cells do primeiro anel são ordenadas por distância euclidiana ao ponto de impacto real (pos), então o snap fica visualmente honesto.
- Probes extras que rodei (todos PASS): canto (0,0) ocupado; última coluna de fileira ímpar (borda direita, spot devolvido respeita maxC da fileira destino); col=99 clampada; row == grid.length direto (fileira nova); row negativa com (0,0) ocupada; grid denso 4 e 10 fileiras (spot vai pra fileira nova); varredura completa do getNeighbors confirmando que nenhum vizinho declarado sai dos limites de coluna.
- Fallback `{row: grid.length, col: 0}` (linha 283) é praticamente inalcançável (a fileira r == grid.length está sempre livre e é alcançada pelo BFS através das ocupadas), fica só como cinto de segurança. OK.

### T-04 — delta time + substeps (Game.js:515-522, Projectile.js:63-82, constants.js:22)
- dt clampado em 0.05 no _loop → pior caso SHOOT_SPEED*dt = 30px → steps = 3 → cada substep move ≤ 13.5px (BUBBLE_R*0.75), bem abaixo do raio de colisão de 34px (1.9R). Sem tunneling nem no clamp máximo.
- Loop de substeps respeita `this.projectile.active` na condição: quando `_snapBubble` desativa o projétil no meio, os substeps restantes não rodam e não há update em bubble já entregue pro grid. Correto.
- Bounce nas paredes preservam |vel| (abs/neg do componente X), então o `steps` calculado pela constante continua válido após ricochete.
- Headless oficial: voo de 0.750s idêntico em 60fps e 120fps, velocidade validada contra 450px/600px·s, bounce inverte X. Confere com a nota do BOARD.
- Primeiro frame (`_loop(0)` com lastTime 0): dt=0 → steps = max(1, 0) = 1, update(0) é no-op. Sem NaN, sem divisão por zero.

### T-03 — bolha no canhão (Shooter.js:135-140)
- Checado o risco de vazamento de estado por pos compartilhada: NÃO há aliasing. `getNewBubble` faz `b.pos = this.pos.clone()` (Vec2 novo por bolha) e `_shoot` faz `b.pos = shooter.pos.clone()` antes do launch e troca `currentBubble = nextBubble` no mesmo bloco síncrono, então o draw nunca reposiciona a bolha que está voando. A mutação de pos no draw escreve no Vec2 próprio da bolha, nunca no `shooter.pos`.

### T-06 — bônus de clear (Game.js:367-370, 377)
- `shots*200 + (currentLevel+1)*500` bate com o GDD §3.3 ("shots × 200 + level × 500") com level 1-based, consistente com o display "LEVEL N". `shots` já está decrementado no tiro final, então é de fato "tiros restantes". Bônus entra antes do `progress.addScore(this.score)` (sem contagem dupla) e o HUD atualiza. FloatText de BONUS posicionado sem sobrepor o CLEAR!.

### T-07/T-08 — favicon + título
- Data URI SVG com `#` escapado como %23 (o único caractere que quebraria), aspas simples dentro de atributo com aspas duplas. Válido, mata o 404 do QA-01-05.
- `.title-sub` some abaixo de 480px e `white-space: nowrap` + letter-spacing 2px seguram "BUBBLE BLASTER" numa linha no 390px. Media query depois da regra base (especificidade OK).

## Notas não bloqueantes (registrar, não travar a rodada)
1. **[pré-existente, vale tarefa P3] Pool é só fábrica: `pool.release()` nunca é chamado em nenhum lugar do js/.** A bolha do projétil após o snap (o `placeBubble` clona pra uma bolha nova do pool e abandona a original), as bolhas estouradas (ficam com alive=false no array até o init do próximo nível) e o grid inteiro descartado no `init()` viram garbage. O QA-01-03 citava o leak do overwrite, esse caso o BFS matou, mas o leak estrutural do pool continua. Não é regressão da rodada e o heap medido pelo QA está estável (5MB), então só registrar no backlog.
2. **Game.js:517** — `steps` usa a constante SHOOT_SPEED e não a magnitude real de `projectile.vel`. Hoje são idênticas (launch faz cos/sin * SHOOT_SPEED e os bounces preservam módulo), mas se um dia entrar powerup de velocidade variável o anti-tunneling descalibra em silêncio. Sugestão futura: `this.projectile.vel.magnitude()` ou um comentário amarrando os dois.
3. **BubbleGrid.js:283** — o fallback devolve sempre col 0, ignorando `pos`. Inalcançável na prática (ver análise), só ficar ciente se alguém mexer no bound do BFS.
4. **Doc velho (pré-existente):** o cabeçalho do BubbleGrid.js ainda descreve o grid com 7 colunas e o comentário de constants.js já diz 11. Cosmético.

## Casos de teste rodados
- `node STUDIO/qa/headless-check.mjs` → 7/7 PASS (T-04 e T-05).
- Probe extra de bordas do BFS → 11/11 PASS (casos descritos na seção T-05).
- `node --check` nos 5 arquivos JS mexidos → sem erro de sintaxe.

Revisor: game-dev (modo revisar), sem código próprio nesta rodada.
