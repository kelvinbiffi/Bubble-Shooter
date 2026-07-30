# MANIFEST — Ícones pixel art dos bubbles (T-10)

Gerado 30/07/2026 pelo game-artist via Replicate Retro Diffusion rd-plus (pipeline padrão do estúdio).
Script: `tools/gen-icons.cjs` (raws 256x256 em `assets/ai-raw/icons/`, pós-processo trim + nearest-neighbor).

- **Formato:** PNG 48x48, fundo TRANSPARENTE, pixel art com outline escuro.
- **Uso:** substituir o emoji dentro da bolha (raio 18px, ícone desenhado a ~24-28px). Downscale de 48 pro tamanho em jogo SEMPRE com `imageSmoothingEnabled = false` (nearest), nunca blur.
- **Nomenclatura:** `world<N>-slot<M>.png`, N = índice do mundo na ordem de `js/themes.js` (0 Dinosaur Valley, 1 Kaiju Island, 2 Deep Ocean), M = índice da cor em `COLORS` de `js/constants.js`.
- **Direção de arte:** a paleta de cada ícone foi escolhida pra CONTRASTAR com a cor da bolha do slot (ícone nunca some dentro da própria bolha).
- Integração no código é tarefa do game-dev (nenhum JS foi alterado nesta entrega).

## World 0 — Dinosaur Valley (substitui 🦕🦖🦎🐊🦴🌿)

| Arquivo | Slot | Cor da bolha | Ícone |
|---|---|---|---|
| world0-slot0.png | 0 | Red `#ff3366` | Braquiossauro teal de pescoço longo, corpo inteiro de lado |
| world0-slot1.png | 1 | Blue `#00ccff` | Cabeça de T-Rex verde rugindo, dentes brancos |
| world0-slot2.png | 2 | Yellow `#ffcc00` | Lagartixa verde vista de cima, cauda curvada |
| world0-slot3.png | 3 | Green `#00ffaa` | Cabeça de crocodilo verde-oliva escuro, mandíbula aberta |
| world0-slot4.png | 4 | Orange `#ff6600` | Osso (fêmur) branco de dinossauro |
| world0-slot5.png | 5 | Purple `#cc44ff` | Folha de samambaia pré-histórica verde viva |

## World 1 — Kaiju Island (substitui 🐉🦑🔥⚡🌋🦂)

| Arquivo | Slot | Cor da bolha | Ícone |
|---|---|---|---|
| world1-slot0.png | 0 | Red `#ff3366` | Cabeça de dragão oriental verde com juba teal e chifres brancos |
| world1-slot1.png | 1 | Blue `#00ccff` | Kraken/lula roxa com tentáculos e olhos grandes |
| world1-slot2.png | 2 | Yellow `#ffcc00` | Chama de fogo vermelha e laranja com núcleo escuro |
| world1-slot3.png | 3 | Green `#00ffaa` | Raio amarelo vivo com brilho branco |
| world1-slot4.png | 4 | Orange `#ff6600` | Vulcão cinza-escuro em erupção com lava vermelha |
| world1-slot5.png | 5 | Purple `#cc44ff` | Escorpião dourado com cauda erguida, visto de cima |

## World 2 — Deep Ocean (substitui 🐙🦈🐠🐳🐚🦀)

| Arquivo | Slot | Cor da bolha | Ícone |
|---|---|---|---|
| world2-slot0.png | 0 | Red `#ff3366` | Polvo lilás fofo com olhos grandes e tentáculos enrolados |
| world2-slot1.png | 1 | Blue `#00ccff` | Tubarão azul-marinho escuro com barriga branca, de lado (refeito: v1 cinza-claro sumia no ciano) |
| world2-slot2.png | 2 | Yellow `#ffcc00` | Peixe tropical azul com listras brancas, de lado |
| world2-slot3.png | 3 | Green `#00ffaa` | Baleia azul amigável esguichando água, de lado |
| world2-slot4.png | 4 | Orange `#ff6600` | Concha vieira rosa/creme em leque com relevo (refeita: v1 saiu mandala circular sem silhueta) |
| world2-slot5.png | 5 | Purple `#cc44ff` | Caranguejo vermelho com garras erguidas, de frente |

## Notas de revisão (chapéu de diretor de arte)
- 16/18 aprovados de primeira; tubarão e concha refeitos com prompt ajustado e aprovados na segunda.
- Atenção do dev na integração: polvo (world2-slot0) e kraken (world1-slot1) são parecidos, mas nunca aparecem juntos (mundos diferentes).
- Teste de leitura em 24px feito por inspeção dos PNGs em miniatura; validar em jogo no viewport 390x844 na rodada de QA/UX.
