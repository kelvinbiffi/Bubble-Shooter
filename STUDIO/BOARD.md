# BOARD — BUBBLE BLASTER (remaster)
> GDD: docs/GDD.md (herdado do repo original, v1.0) · Stack: Vanilla JS Canvas2D + Vite (mantida, jogo já pronto) · Iteração atual: 4 · Estado: PRONTO, aguardando OK do Kelvin pra publicar (ver STUDIO/PUBLISH.md)

Origem: https://github.com/kelvinbiffi/Bubble-Shooter (clonado 30/07/2026). Jogo já funcional com 3 mundos temáticos (Dinosaur Valley, Kaiju Island, Deep Ocean), 8 níveis por mundo, estrelas, progresso em localStorage, som WebAudio sintetizado, touch básico.

Missão desta produção: modernizar com os MCPs do estúdio (arte real no lugar de emoji, trilha/SFX reais, juice) e publicar no itch.io.

## Quality gates (o contrato de "pronto")
- [ ] Core loop validado: mirar, atirar, match 3+, drop de flutuantes, clear, game over
- [ ] QA: 0 blockers, 0 majors abertos, console limpo
- [ ] UX: média ≥ 8/10, nenhuma dimensão < 6
- [ ] Mobile: jogável de verdade em viewport 390x844 com touch
- [ ] Momento clipável: chain reaction com drop grande (tela cheia de partículas + slow-mo)
- [ ] Devlog: screenshots de todos os marcos em STUDIO/screenshots/
- [ ] Zip web via 7za pronto pro itch (nunca Compress-Archive)

## Backlog
- T-20 (P3, dev) CODE-REVIEW-01 nota 1: object pool nunca faz release (leak estrutural pré-existente, bolhas viram garbage)
- T-21 (P3, dev) CODE-REVIEW-01 nota 2: substeps usam SHOOT_SPEED fixo em vez de vel.magnitude() (descalibra se houver powerup de velocidade)
- T-22 (P3, dev) CODE-REVIEW-01 notas 3-4: fallback de _nearestFreeCell e docstring de 7 colunas desatualizada
- T-12 (P1, vfx) Juice: screenshake em combo grande, slow-mo no chain reaction, trail no projétil, squash no encaixe
- T-13 (P1, writer) Strings PT/EN + nome/copy da página itch
- T-14 (P2, dev) High score / integração com API unificada api.k3gamesstudio.com (adicionar slug no GAMES)
- T-15 (P2, artist) Thumbnail + banner + screenshots pra página itch
- T-16 (P2, dev) PWA/manifest + ícone

## Em produção
(vazio)

## Em teste
> Code review da rodada 1: APROVADO (STUDIO/dev/CODE-REVIEW-01.md, 30/07). Headless 7/7 + 11 probes de borda do BFS PASS. 1 nota pro backlog: pool.release nunca é chamado (leak estrutural pré-existente, sugerir tarefa P3).
- T-03 (P0, dev) QA-01-01 bolha atual no canhão: Shooter.draw agora desenha currentBubble na posição do launcher. Auto-teste: screenshot fixes-round1.png
- T-04 (P0, dev) QA-01-02 delta time: SHOOT_SPEED 600 px/s, Projectile.update(dt), substeps anti-tunneling em Game._update. Auto-teste: headless-check (voo 0.750s em 60 e 120fps) + tiro live
- T-05 (P0, dev) QA-01-03 overwrite: BubbleGrid._nearestFreeCell (BFS por vizinhos, escolhe célula livre mais perto do impacto). Auto-teste: headless-check 4 casos + live
- T-06 (P1, dev) QA-01-04 bônus de clear: _levelClear soma shots×200+(level+1)×500, FloatText BONUS. Auto-teste: clear com score 7100 = 1200 pops + 5900 bônus
- T-07 (P2, dev) favicon SVG inline data URI. Auto-teste: console zero erros
- T-08 (P2, dev) título mobile: span .title-sub escondido <480px. Auto-teste: viewport 390 mostra só BUBBLE BLASTER, 104px de largura
- T-11 (P1, audio) ENTREGUE 30/07: 3 trilhas Suno em assets/audio/music/world0-2.mp3 (2:51 / 3:55 / 2:08, loudnorm -16 LUFS, pontas sem silêncio) + 6 SFX ElevenLabs em assets/audio/sfx/ (shoot 0.60s, pop 0.19s, combo 1.20s, drop 0.64s, clear 1.58s, gameover 1.63s, peak -1dB). Contrato de integração: assets/audio/AUDIO-MAP.md (volumes, ducking, pitch var, mapeado 1:1 nos métodos do SoundSystem). Integração é do game-dev (código NÃO tocado). Pendências no AUDIO-MAP: loop não sample-perfect (sugerido crossfade 1s), world1 acima de 2min (cortável se pesar no zip). Aguarda revisão do modo revisar + integração.
- T-10 (P1, artist) ENTREGUE 30/07: 18 ícones pixel art (3 mundos x 6 slots) via Replicate rd-plus em assets/sprites/world<N>-slot<M>.png (48x48, fundo transparente, ~19KB no total). Paleta de cada ícone escolhida pra contrastar com a cor da bolha do slot. Manifesto completo com mapeamento mundo/slot/cor: assets/sprites/MANIFEST.md. Raws 256x256 em assets/ai-raw/icons/, script reproduzível tools/gen-icons.cjs. 16/18 aprovados de primeira; tubarão (world2-slot1) e concha (world2-slot4) refeitos com prompt ajustado e aprovados. Integração é do game-dev (código NÃO tocado, desenhar com imageSmoothingEnabled=false). Aguarda revisão do modo revisar + integração.

## Concluído
- T-01 (P0, pm) Kickoff: clone, install, dev server na 5199, smoke test Playwright OK (tiro, match +300, combo, HUD). Screenshot: STUDIO/screenshots/2026-07-30-original-gameplay.png. Observações pro QA/UX: fundo marrom estranho fora do canvas, bolha atual não visível no canhão no screenshot.

## Decisões
- 30/07/2026: MECÂNICA smart-colors adotada (sorteio do tiro só entre cores vivas no grid, padrão do gênero). Sim provou: nível 3 cores sai de 6% pra 58-66% de win com bot decente. Sem ela o jogo é matematicamente injusto.
- 30/07/2026: 6 cores REMOVIDA da curva (injogável no sim mesmo com 42 tiros); 5 cores só nos níveis finais com 50+ tiros.
- 30/07/2026: starTint dos mundos reduzido de 0.4 pra 0.07 de alpha (fundo marrom lamacento virava a identidade neon; agora é só um matiz).
- 30/07/2026: copy de portfólio trocada por copy de jogo (title bar, badge "A K3 GAMES STUDIO GAME"); página itch fica com o publisher.
- 30/07/2026: Manter stack vanilla JS Canvas2D + Vite. O jogo já é completo e bem arquitetado; reescrever em Phaser seria retrabalho sem ganho. MCPs entram em assets (arte, áudio) e polish.
- 30/07/2026: Repo clonado com histórico git preservado; remote origin aponta pro GitHub pessoal do Kelvin (kelvinbiffi/Bubble-Shooter).

## Custos de créditos (Meshy/Suno/ElevenLabs/Replicate/PixelLab)
- 30/07/2026: checagem de saldo pré-assets: PixelLab 1761 gerações restantes (tier ativo), Suno 9994 créditos, ElevenLabs 87.9k chars no mês. Verde pra rodada de arte+áudio.
- 30/07/2026 (artist, ESTIMATIVA pré-lote T-10): 18 ícones de bubble via Replicate rd-plus (1 piloto + lote), estimado 19-22 predictions pay-per-use (Replicate não tem saldo pré-pago pra checar; custo unitário do rd-plus é centavos de dólar por imagem). Lote pequeno, abaixo do limite de 50.
- 30/07/2026 (audio, ESTIMATIVA pré-lote T-11): Suno 3 gerações de trilha (~10 créditos cada, ~30 total, sobra ~9964). ElevenLabs 6 SFX com duração fixa (~100-200 chars por SFX, ~1.2k chars no total, sobra ~86.7k). Custos reais registrados após o lote.
- 30/07/2026 (audio, REAL pós-lote T-11): Suno 36 créditos (3 gerações x 12, saldo 9994 → 9958). ElevenLabs 84 chars nos 6 SFX (cobrança por duração ficou bem abaixo do estimado, saldo usado 2083 → 2167 de 90k). Total do lote: baratíssimo, verde pra iterar se o revisar pedir refação.
- 30/07/2026 (artist, REAL pós-lote T-10): 20 predictions rd-plus no Replicate (1 piloto + 17 lote + 2 refações), todas succeeded. Pay-per-use em dólar (sem saldo de créditos pra reportar; ordem de grandeza: centavos por imagem, lote inteiro abaixo de ~US$1). Dentro da estimativa (19-22).
