# PS5 Emu Shell

> [!IMPORTANT]
> **Isto NÃO é um emulador de PS5.**
> O PS5 Emu Shell é um **launcher agregador de emuladores**: centraliza seus jogos, emuladores e recomps numa interface inspirada no PS5. Ele não roda jogos de PS5 (nem GTA 6). Veja as [perguntas frequentes](#perguntas-frequentes).

Launcher de emuladores em tela cheia, no estilo do PS5, feito para jogar com controle:
Xbox/XInput, DualShock 4 (PS4) e DualSense (PS5), via USB ou Bluetooth, sem precisar de Steam ou DS4Windows.
Lê todas as suas ROMs, abre cada jogo no emulador certo e é portable: copie a pasta e jogue.

<p align="center">
  <a href="https://github.com/felipeAguiarCode/PS5EmuShell/releases/latest">
    <img src="https://img.shields.io/badge/%E2%AC%87%20DOWNLOAD-Baixar%20a%20%C3%BAltima%20vers%C3%A3o-2f7bff?style=for-the-badge&labelColor=0b1230" alt="Download" height="56">
  </a>
  <br>
  <a href="https://github.com/felipeAguiarCode/PS5EmuShell/releases/latest">
    <img src="https://img.shields.io/github/v/release/felipeAguiarCode/PS5EmuShell?label=vers%C3%A3o&style=flat-square&color=2f7bff" alt="Versão mais recente">
  </a>
  <img src="https://img.shields.io/badge/Windows-10%20%7C%2011%20(64%20bits)-0b1230?style=flat-square" alt="Windows 10 e 11">
</p>

▶️ **[Vídeo de demonstração](docs/media/ps5-emu-shell-demo.mp4)** (1 min 24 s)

## Telas

**Tela de jogos** — navegação pelo controle, capa e arte do jogo, filtros por sistema

![Tela de jogos](docs/media/tela-de-jogos.gif)

**Coleções** — agrupe os jogos de uma saga, com capa automática (as capas dos jogos) ou uma imagem sua (△/Y › Capa)

![Coleções](docs/media/colecoes.gif)

**Escolha de avatar**

![Escolha de avatar](docs/media/avatar.gif)

**Troféus (RetroAchievements)** — lista e grade, com troca entre tema escuro e claro

![Troféus e tema claro/escuro](docs/media/trofeus-tema-claro-escuro.gif)

## Como usar

1. Clique em **[Download](https://github.com/felipeAguiarCode/PS5EmuShell/releases/latest)** e baixe o `PS5EmuShell-<versão>-win-x64.zip`.
2. Crie uma pasta base (ex.: `C:\Emuladores`) e extraia o zip dentro dela. Vai ficar `C:\Emuladores\launcher`.
3. Execute `launcher\Iniciar.bat`.
4. Na primeira vez, o PS5 Emu Shell oferece criar as pastas ao lado do launcher e baixar os emuladores:

```
Emuladores\
  launcher\     ← o PS5 Emu Shell
  bios\  cores\  roms\  saves\  screenshots\
```

5. Coloque as ROMs em `roms\<sistema>` (`psx`, `ps2`, `psp`, `nds`, `gc`, `gba`, `snes`…).

### Sistemas e emuladores

Já vêm configurados PS1 (DuckStation), PS2 (PCSX2), PSP (PPSSPP), Nintendo DS (melonDS) e GameCube (Dolphin).
Em **Configurações › Instalação › Adicionar mais sistemas** dá para incluir:

| Sistema | Emulador |
|---|---|
| Game Boy Advance / Color | mGBA, RAVBA |
| NES · Super Nintendo | Mesen, RANes, FCEUX · Snes9x, RASnes9x |
| Mega Drive / Genesis | ares |
| Nintendo 64 | Rosalie's Mupen GUI, Project64 |
| Dreamcast | Flycast |
| Wii · Wii U | Dolphin · Cemu |
| Nintendo 3DS | Azahar |
| Xbox · Xbox 360 | xemu · Xenia Canary |
| PlayStation 3 | RPCS3 |
| PlayStation 4 | shadPS4 |

Cada um pode **baixar a última versão** da fonte oficial ou **apontar para o seu próprio executável**. Se instalar por fora, extraia em `cores\<sistema>\<emulador>` e use **Sincronizar**.
Jogos de PS3 e PS4 ficam em pastas (com `EBOOT.BIN` / `eboot.bin`): coloque cada pasta de jogo em `roms\ps3` ou `roms\ps4` e o nome é lido do `PARAM.SFO`. Firmware, BIOS e chaves de cada emulador são configurados no próprio emulador.

As capas são baixadas sozinhas. As BIOS você copia para `..\bios\<sistema>`.

## Jogos de PC e pastas de ROMs

O botão **+** no topo do launcher adiciona:

- **Jogo de PC (executável):** escolha o `.exe` num explorador de arquivos que funciona pelo controle, mouse ou teclado (ele já mostra as pastas da Steam, Epic, GOG e Xbox). Dê um nome ao jogo e pronto: a imagem é feita com o ícone do próprio executável. O launcher acompanha o jogo até o último processo da pasta dele fechar, então jogos que abrem um "launcher" antes também funcionam.
- **Pasta de ROMs:** escolha a pasta e o sistema (o PS5 Emu Shell sugere o sistema pelos arquivos e pelo nome da pasta).

Renomear, trocar o executável, **Thumbnails** (recriar a imagem do ícone ou escolher uma imagem de background) ou remover: △/Y no jogo, ou Configurações › Sistemas › PC (Windows). Em Informações há também **Resetar estatísticas** (tempo de jogo e sessões), para qualquer jogo.

## Controles

| Botão | Ação |
|---|---|
| ✕ / A | Jogar / confirmar |
| ○ / B | Voltar |
| △ / Y | Opções do jogo |
| L1 / R1 | Trocar sistema |
| L2 / R2 | Trocar de aba (Jogos, Biblioteca, Coleções, Troféus) |
| Options / Start | Configurações (no teclado virtual: confirmar) |
| Segurar Select + Start | Fechar o jogo e voltar ao launcher |

## Configurações

- **Controles** — até 4 jogadores. Todo controle conectado entra sozinho no próximo slot livre
  (a barra de luz do DualShock 4/DualSense acende na cor do jogador). Tem **Autodetectar** e
  **Testar**, que mostra o diagrama do controle com cada botão, direcional, gatilho e analógico ao vivo.
- **Instalação** — baixar, atualizar ou sincronizar emuladores (mostra a versão instalada e a última).
- **RetroAchievements** — login em todos os emuladores compatíveis e regras dos troféus.
- **Aparência** — tema escuro/claro, animações, imagem de fundo e miniaturas.
- **Atalhos**, **Otimização** (liberar RAM antes de jogar) e mais.

## Compartilhar

Copie a pasta `Emuladores` inteira — todos os caminhos são relativos.
Antes, apague `launcher\data` para não levar suas configurações, tempo de jogo e login.

## Perguntas frequentes

**Isso é um emulador de PS5?**
Não. O PS5 Emu Shell é um **launcher**, não um emulador. Ele não emula nenhum console: só organiza a sua biblioteca e abre cada jogo no programa certo. Quem roda os jogos são os emuladores (DuckStation, PCSX2, PPSSPP, Dolphin, melonDS…), os recomps e os jogos de PC que você já tem. A aparência lembra a interface do PS5, mas é só a interface.

**Qual é a proposta, então?**
Ser um **centralizador de jogos**: juntar num lugar só, com uma interface feita para jogar com controle, os jogos dos seus emuladores, os **recomps** (versões nativas para PC de jogos clássicos, como as recompilações de jogos de Nintendo 64) e os seus jogos de PC. Recomps e jogos de PC entram pelo botão **+** como executáveis.

**Isso vai rodar GTA 6?**
Não. O PS5 Emu Shell não roda jogos sozinho e não emula PS5 nem nenhum console atual. Ele só abre o que você já consegue rodar no seu PC.

**Quais são os requisitos?**
- **Para o PS5 Emu Shell:** Windows 10 ou 11 de 64 bits. O launcher em si é leve.
- **Para os jogos:** os requisitos variam de acordo com cada emulador (e com cada jogo de PC ou recomp). Em geral, sistemas mais antigos (PS1, Game Boy, NES, SNES, Nintendo DS, PSP) rodam bem até em PCs modestos, enquanto PS2 e GameCube pedem mais do processador e da placa de vídeo. Confira os requisitos recomendados no site de cada emulador.

**O PS5 Emu Shell vem com jogos ou BIOS?**
Não. Os emuladores podem ser baixados pelo próprio PS5 Emu Shell, de suas fontes oficiais, mas jogos (ROMs) e BIOS não acompanham. Use apenas cópias dos jogos que você tem.

## Desenvolvimento

Requisitos: Windows 10/11 (x64), [Node.js](https://nodejs.org) 20 ou mais novo e Git.

```
git clone https://github.com/felipeAguiarCode/PS5EmuShell.git launcher
cd launcher
npm install
npm start          # roda a partir do código-fonte (modo desenvolvedor)
npm run check      # ESLint + Prettier + testes (node:test)
npm run build      # gera app\win-unpacked\PS5EmuShell.exe
```

O código segue o guia em [`.specs/coding-style.md`](.specs/coding-style.md): paradigma funcional, ESM, nomes em inglês e sem comentários. Os textos da interface continuam em português.

Clone dentro da sua pasta base (ex.: `C:\Emuladores`), porque o launcher procura `bios`, `cores` e `roms` na pasta acima dele.

Se o npm bloquear os scripts de instalação (aviso `install-scripts`), rode-os uma vez à mão:

```
node node_modules/electron/install.js
```

Atalhos úteis no modo desenvolvedor: **F12** abre o DevTools, **F11** alterna a tela cheia.
Os dados pessoais (config, tempo de jogo, login do RetroAchievements) ficam em `data\`, que não vai para o Git.

Estrutura:

| Pasta | Conteúdo |
|---|---|
| `src/main/index.js` | Entrada do processo principal: ciclo de vida, janela e ligação das camadas |
| `src/main/constants` | Constantes globais por contexto e textos exibidos na interface |
| `src/main/core` | Caminhos, `config.json`, `stats.json` e leitura/escrita de JSON |
| `src/main/defaults` | Configuração padrão e catálogo de sistemas |
| `src/main/ipc` | Canais IPC entre a interface e o processo principal, um arquivo por contexto |
| `src/main/input` | Controles: XInput, HID (DualShock 4/DualSense), slots e combos |
| `src/main/library` | Busca de ROMs, capas, jogos de PC, coleções, avatares e tempo de jogo |
| `src/main/emulators` | Fontes de download, instalação, versões, sincronização e execução dos jogos |
| `src/main/system` | Bateria, processos, monitor de desempenho e otimização |
| `src/main/files` | Explorador de arquivos e detecção do sistema de uma pasta |
| `src/main/window` | Janela principal, overlay do jogo e atalhos de teclado |
| `src/main/retroachievements` | `api/` (web API e caches), `formats/` (INI e token do DuckStation) e `emulators/` (um script por emulador) |
| `src/renderer/scripts` | Interface em módulos ES: `core` (estado, comandos, API), `ui`, `navigation`, `input` e `views/` por tela |
| `src/renderer/styles` | CSS dividido por tela, na ordem da cascata |
| `test` | Testes com `node:test` das funções puras do main e da interface |
| `assets/avatars` | Avatares do perfil |

Ícones de botões: [Kenney Input Prompts](https://kenney.nl/assets/input-prompts) (CC0). Fonte: Source Sans 3 (SIL OFL).
