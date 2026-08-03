# SIM-01 — Rebalanceamento da curva · 30/07/2026

Simulador: tools/sim/run.js (Node puro, usa BubbleGrid/themes/constants do próprio jogo). Bot "jogador decente": avalia 51 ângulos por tiro com marcha de trajetória (bounces inclusos), prioriza pop imediato > montar par > attach alto, ruído de mira ~1.5 graus. 150-200 runs seedadas por nível.

## Diagnóstico (tabela original, bot SEM smart-colors)
Win rate 0-6% em TODOS os 24 níveis. Matematicamente injusto: sorteio de cor ignorava o grid (tiro morto com cor extinta) e miss adiciona bolha, exigindo ~50% de aproveitamento constante.

## Mudança de mecânica (validada)
smart-colors (sorteio só entre cores vivas no grid): nível 4r3c30 sai de 6% pra 66% com o MESMO bot. Adotada em Shooter.getNewBubble.

## Descobertas estruturais
- 4 cores precisa de ~40+ tiros pra ficar na faixa 35-55%.
- 5 cores em grid alto (6-8 rows) é parede: 7-13% mesmo com 50-54 tiros (escassez de cluster, não falta de tiro). 5 cores SÓ funciona em grid curto: 4-5 rows = ~25%.
- 6 cores: injogável, removida.
- Perda por danger zone: 0% em todas as configs com o bot (danger só pune jogador fraco, ok).

## Tabela final aplicada (js/themes.js) com win% simulado
| Mundo | Níveis (rows/cores/tiros → win%) |
|---|---|
| 1 Dinosaur Valley | 3/2/30→97 · 3/3/32→83 · 4/3/32→77 · 4/3/30→69 · 5/3/32→75 · 5/3/30→70 · 4/4/42→53 · 5/4/44→52 |
| 2 Kaiju Island | 5/3/32→73 · 5/3/30→65 · 5/4/44→48 · 5/4/42→41 · 6/4/46→44 · 6/4/44→47 · 6/4/42→37 · 7/4/44→35 |
| 3 Deep Ocean | 6/4/46→49 · 6/4/44→45 · 7/4/46→40 · 7/4/44→38 · 8/4/48→35 · 8/4/46→35 · 4/5/46→25 · 5/5/50→25 |

Curva: 97% de onboarding caindo até finais de 25% (boss fair). Sem parede, sem vale.
Fontes: runs seed-base 1000/2000/3000 (proposta-v1.json, proposta-v2.json, teste-finais.json e saídas nos logs da sessão).

## Pendências
- Revisão de área (modo revisar) com outras seeds: agendar pro PM.
- Playtest humano (2 runs Playwright feitos pelo PM/QA; palavra final de diversão é do game-ux).
- Estrelas: threshold de 3 estrelas (40% de tiros sobrando) ficou mais fácil com tiros generosos; se o UX reclamar de 3 estrelas fácil, subir pra 50%.
