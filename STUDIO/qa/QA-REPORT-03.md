# QA-REPORT-03 — Bubble Blaster · 02/08/2026 · escopo: passada integrada (arte + áudio + balance + VFX + smart-colors)

## Veredito: APROVADO (0 blockers, 0 majors)

Setup: localhost:5199, desktop 1280x800 e mobile 390x844 touch (CDP). Partida completa real vencida no 1-1 novo + regressões pontuais. Console: zero erros em todas as cargas.

## Testado nesta passada
| Item | Status | Evidência |
|---|---|---|
| Arte: 18 sprites pixel art carregam e desenham dentro das bolhas (nítidos, sem blur) | OK | screenshots 2026-07-30-arte-integrada.png e mobile-arte.png |
| Fundo neon de volta (tint 0.07, marrom eliminado) | OK | mesmos screenshots |
| Música por mundo toca após primeiro clique, loop, sem erro | OK | musicPlaying true, world 0 |
| SFX carregados (6 buffers) e tocando (shoot/pop escadinha) | OK | probe de buffers + voices |
| Smart-colors: sorteio só de cores vivas | OK | fim de nível só com vermelhas restantes, tiro veio vermelho |
| Tabela nova (SIM-01): 1-1 com 3 fileiras/2 cores/30 tiros | OK | vitória REAL: LEVEL 1 CLEAR, 8.300 pts, 1 estrela salva, Next Level habilitado |
| Bônus de clear somando no score | OK | 8.300 final |
| VFX: screenshake dispara em cluster grande (pico 6.9) e decai | OK | probe de shake |
| VFX: trail/squash visíveis, slow-mo em drop ≥4 | OK | visual nos screenshots |
| Mobile 390x844: touch atira, layout 1 linha de título, sem overflow | OK | mobile-arte.png |
| Regressão QA-01/02 (canhão, dt, overwrite, favicon) | SEGUE CORRIGIDO | reloads limpos, probes repetidos |

## Observações não-bug (pro UX)
- Bot de linha reta consegue perder por danger zone empilhando erros no mesmo corredor; jogador humano dificilmente faz isso, mas se o UX achar cruel dá pra subir a danger line.
- Overlay guarda o HTML anterior escondido (não é bug funcional, mas leitura de innerText de overlay oculto confunde automação; documentado pra QA futuro).
- Nível com poucos singles no fim vira exercício de "empilhar 3": funcional, mas o UX pode avaliar se diverte.
