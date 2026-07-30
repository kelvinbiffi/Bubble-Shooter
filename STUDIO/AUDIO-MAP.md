# AUDIO-MAP — BUBBLE BLASTER
> Contrato audio → dev (T-11). Gerado 30/07/2026 pelo game-audio.
> Arquivos em `assets/audio/music/` e `assets/audio/sfx/`. Todos mp3 44.1kHz.
> Mapeia pros métodos existentes de `js/systems/SoundSystem.js` (hoje sintetizados via WebAudio; trocar cada método pra tocar o arquivo correspondente, mantendo a mesma API pública).

## Trilhas (uma por mundo, índice = índice em WORLDS de js/themes.js)

| Mundo | Arquivo | Duração | Volume base | Regra |
|---|---|---|---|---|
| 0 Dinosaur Valley | music/world0.mp3 | ~2:51 | 0.35 | loop; jungle groove chiptune/synthwave |
| 1 Kaiju Island | music/world1.mp3 | ~3:55 | 0.35 | loop; synthwave tenso mas divertido, taiko |
| 2 Deep Ocean | music/world2.mp3 | ~2:08 | 0.30 | loop; chillwave aquático, mais baixa que as outras |

Regras de trilha:
- Loudness normalizado em -16 LUFS nas 3 (mixam igual entre mundos).
- Loop simples via `loop=true` no elemento/source. As pontas foram cortadas de silêncio, mas o fecho do loop NÃO é matematicamente perfeito (pendência abaixo). Se der clique audível, aplicar crossfade de ~1s no restart.
- Trocar de mundo = fade out 0.5s da trilha atual, fade in 0.5s da nova. Nunca duas trilhas ao mesmo tempo.
- Música continua tocando entre níveis do MESMO mundo (não reiniciar a cada nível!).

## SFX (evento → método existente do SoundSystem)

| Evento do jogo | Método atual | Arquivo | Duração | Volume base | Prioridade | Regra |
|---|---|---|---|---|---|---|
| tiro da bolha | playShoot() | sfx/shoot.mp3 | 0.60s | 0.55 | alta | pitch aleatório ±5% pra não enjoar (playbackRate 0.95–1.05) |
| bolha estoura (match 3+) | playPop() | sfx/pop.mp3 | 0.19s | 0.70 | alta | SOM-ASSINATURA. Em cluster grande, tocar 1 por bolha com stagger de ~40ms e pitch subindo +3% por pop (escadinha satisfatória). Máx 8 instâncias simultâneas |
| combo (streak de matches) | playCombo() | sfx/combo.mp3 | 1.20s | 0.65 | alta | não empilhar: se já estiver tocando, reiniciar do zero |
| queda de flutuantes | playDrop() | sfx/drop.mp3 | 0.64s | 0.60 | média | tocar 1x por evento de drop (não por bolha caindo) |
| level clear | playLevelClear() | sfx/clear.mp3 | 1.58s | 0.80 | máxima | DUCK: música cai pra 40% do volume durante o jingle, volta em fade de 0.5s |
| game over | playGameOver() | sfx/gameover.mp3 | 1.63s | 0.75 | máxima | música PARA (fade out 0.3s) antes do jingle tocar |

## Regras gerais de mixagem
- Bus de música e bus de SFX separados (2 GainNodes master), pra ducking e sliders independentes.
- Música nunca briga com SFX de feedback: teto de 0.35 na música, SFX sempre acima.
- Limite global de sons simultâneos: 8 (mobile engasga acima disso).
- Mute: `toggleMute()` já existe e deve silenciar os DOIS buses (música + SFX). Manter persistência em localStorage se possível.
- Autoplay: browser bloqueia áudio sem gesto. `init()` já é chamado em user gesture; a trilha do mundo só pode dar `play()` depois desse primeiro clique/tap (no botão de launch/level select).
- Acessibilidade: nenhum evento é comunicado SÓ por som (todos já têm par visual no jogo).

## Pendências
- Loop das trilhas não é sample-perfect (Suno entrega com leve fade natural). Mitigação sugerida no código: crossfade de 1s no ponto de loop, ou aceitar o respiro. Validar de ouvido no revisar.
- world1 ficou ~3:55 (acima dos ~2min pedidos); ok pra loop de fundo, mas se pesar no zip web (4.5MB) dá pra cortar em ~2:00 num ponto de frase com ffmpeg.
- Formato ogg não gerado (mp3 é suficiente pra web e Safari não toca ogg); se o publisher pedir, converter com ffmpeg.
