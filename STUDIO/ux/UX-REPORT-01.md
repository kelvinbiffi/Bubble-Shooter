# UX-REPORT-01 — Bubble Blaster · 02/08/2026 · jogador novo, build remasterizada

Joguei como jogador novo (desktop e mobile touch), do splash à primeira vitória, mais game over e navegação de mapa.

## Notas por dimensão (0-10)
| Dimensão | Nota | Comentário |
|---|---|---|
| Onboarding | 8 | Hint "AIM WITH MOUSE · CLICK TO SHOOT / MATCH 3..." na primeira partida (some no 1º tiro), 1-1 com 2 cores é vitória quase garantida (97% no sim): primeira sessão ensina sozinha. Antes era 5 (zero instrução + nível impossível) |
| Diversão do core loop | 8 | Com smart-colors o jogo respeita o jogador; pop em escadinha + drop com slow-mo dão o "só mais uma" |
| Game feel / juice | 8.5 | Shake calibrado, trail, squash, escadinha de pitch nos pops, ducking da música no clear. Momento clipável (chain drop ≥4 com slow-mo + shake) presente e gostoso |
| Legibilidade | 8 | Sprites pixel art nítidos e com contraste por slot; anel de hint pulsando nas cores compatíveis; danger line agora pulsa vermelho quando a pilha desce (aviso antes da morte) |
| Coerência de arte/tema | 8 | Neon de volta (tint 0.07), 3 mundos com identidade própria (ícones, música, gradiente). Emojis flutuantes de fundo combinam |
| Mobile | 8 | Touch direto, alvos ≥32px, título 1 linha, sem overflow; tap atira na hora (sem drag-aim, aceitável pro casual) |
| Retenção (por que volta) | 7 | 24 níveis, 3 estrelas por nível, 3 mundos destraváveis. Sem leaderboard/daily ainda (T-14 backlog: API k3gamesstudio) |

**Média: 7.9~8.1** · nenhuma dimensão < 6 → gate de UX OK

## Os 3 porquês
- **Por que abre:** thumbnail neon + "bubble shooter com dinos/kaijus/oceano" é gênero-conforto com tema charmoso.
- **Por que volta:** completar estrelas e destravar Kaiju Island / Deep Ocean; finais de mundo com 5 cores são desafio real (25%).
- **Por que paga:** name-your-price; a doação vem do capricho (arte + trilha própria). Sem IAP.

## Melhorias aplicadas nesta rodada (quick wins do UX)
1. Instrução de primeira partida no canvas (desktop e touch variantes).
2. Botões de HUD durante a partida: mute (persistente) e voltar ao mapa.
3. Danger line pulsa vermelho quando a pilha chega a 2 fileiras dela.

## Backlog P2 sugerido (pós-launch)
- Leaderboard via api.k3gamesstudio.com (retention).
- Drag-to-aim opcional no mobile (precisão).
- i18n PT/EN das strings de UI (hoje EN only; itch page bilíngue cobre a loja).
- Confirmação ao sair pro mapa no meio da partida (hoje sai direto e perde o progresso do nível).
