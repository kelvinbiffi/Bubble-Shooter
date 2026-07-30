# QA-REPORT-02 — Bubble Blaster · 30/07/2026 · escopo: regressão do QA-REPORT-01 (T-03..T-08)

## Veredito: APROVADO (0 blockers, 0 majors)

Setup: reload limpo em http://localhost:5199, desktop 1280x800 + checagens headless (STUDIO/qa/headless-check.mjs, 7/7 PASS). 27 tiros de gameplay real pós-fix. Console monitorado: ZERO erros (nem o favicon).

## Regressão (bugs do QA-01)
| Bug | Status | Evidência |
|---|---|---|
| QA-01-01 bolha invisível no canhão | CORRIGIDO | currentBubble desenhada na base; screenshot STUDIO/screenshots/2026-07-30-fixes-round1.png |
| QA-01-02 física por frame | CORRIGIDO | headless: voo idêntico 0.750s em 60fps e 120fps; live: 595ms num tiro de ~340px (600px/s), máquina rodando a 108fps |
| QA-01-03 overwrite de célula | CORRIGIDO | repro original: placeBubble(0,0 ocupada) agora 43→44 vivas, snap vai pra (4,0); headless 4 casos PASS incl. grid denso |
| QA-01-04 bônus de clear ausente | CORRIGIDO | clear validado: score 7100 = 1200 pops + 5900 bônus (27 tiros × 200 + nível 1 × 500), FloatText "BONUS +5900" |
| QA-01-05 favicon 404 | CORRIGIDO | console limpo em 3 reloads |
| QA-01-06 título mobile | CORRIGIDO | viewport 390: só "BUBBLE BLASTER", 104px, 1 linha |

## Gameplay pós-fix (anti-regressão)
- 27 tiros reais: matching, combo, drop e danger zone seguem funcionando; nenhum comportamento novo estranho no snap (bolhas grudam na célula livre mais próxima do impacto, visualmente correto).
- Partida terminou em game over por danger zone com 8 tiros sobrando: reforça a observação de BALANCE do QA-01 (nível 1 punitivo). Segue aberta pro game-balance.

## Observações não-bug
- Com o overwrite corrigido, os erros acumulam bolha de verdade no grid, então a danger zone chega mais rápido pra jogador ruim. É o comportamento correto, mas aumenta a urgência do rebalanceamento dos níveis iniciais.
