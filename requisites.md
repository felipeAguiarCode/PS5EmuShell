<div align="center">

# Requisitos dos emuladores

**O que o seu PC precisa para rodar cada emulador do PS5 Emu Shell.**

[Resumo](#resumo) · [Antes de tudo](#antes-de-tudo) · [Sony](#sony) · [Nintendo](#nintendo) · [Sega](#sega) · [Microsoft](#microsoft) · [Arquivos de sistema](#arquivos-de-sistema) · [Fontes](#fontes)

</div>

> [!NOTE]
> Estes são os requisitos dos **emuladores**, para Windows 10/11 de 64 bits. Os requisitos do próprio launcher estão no [README](README.md#requisitos).
> **Mínimo** é o necessário para abrir os jogos; jogos pesados, resolução alta e upscaling pedem o **recomendado** ou mais.

## Resumo

| Peso | Sistemas | PC indicado |
|---|---|---|
| 🟢 **Leve** | PS1, PSP, NES, SNES, Game Boy, GBA, Nintendo DS, Mega Drive, Dreamcast, Nintendo 64 (Project64) | Qualquer PC x64 dos últimos 10 anos, 4 GB de RAM |
| 🟡 **Médio** | PS2, GameCube, Wii, Nintendo 3DS, Nintendo 64 (RMG), Xbox | 4 núcleos, 8 GB de RAM, placa de vídeo dedicada simples |
| 🔴 **Pesado** | PS3, PS4, Xbox 360, Wii U | 6+ núcleos modernos, 16 GB de RAM, placa de vídeo dedicada atual com Vulkan |

## Antes de tudo

Vale para todos os emuladores:

- **Windows 10 ou 11 de 64 bits**, atualizado.
- **Driver de vídeo atualizado** (NVIDIA, AMD ou Intel). A maioria dos problemas de tela preta ou travamento vem de driver antigo.
- **[Microsoft Visual C++ Redistributable](https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist) 2015–2022 (x64)**: exigido por PCSX2, Dolphin, Cemu, RPCS3, Xenia e outros.
- **SSD** recomendado para PS3, PS4, Xbox 360 e Wii U, que leem muitos dados durante o jogo.
- Para descobrir as instruções do seu processador (SSE4.1, AVX2…), use o [CPU-Z](https://www.cpuid.com/softwares/cpu-z.html).

## Sony

### PlayStation · DuckStation 🟢

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64 com SSE4.1 | Qualquer 4 núcleos |
| **GPU** | DirectX 11, OpenGL 3.1 ou Vulkan | Dedicada, para upscaling de resolução |
| **RAM** | 4 GB | 8 GB |
| **Precisa de** | BIOS do PS1 (ex.: `SCPH-1001`) | |

### PlayStation 2 · PCSX2 🟡

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64 com SSE4.1 | AVX2, 4 núcleos e bom desempenho por núcleo |
| **GPU** | DirectX 11, OpenGL 3.3 ou Vulkan 1.1 (GTX 750 Ti, RX 460, Arc A380) | DirectX 12 ou Vulkan 1.3 (RTX 4060, RX 6600 XT, Arc B580) para 3x/1080p ou mais |
| **RAM** | 8 GB | 16 GB |
| **Precisa de** | BIOS do PS2 | |

### PlayStation Portable · PPSSPP 🟢

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | Qualquer x64 | Qualquer 2 núcleos |
| **GPU** | OpenGL 2.0, DirectX 9/11 ou Vulkan | Dedicada, para upscaling |
| **RAM** | 2 GB | 4 GB |
| **Precisa de** | Nada: não usa BIOS | |

### PlayStation 3 · RPCS3 🔴

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64 moderno, 4 núcleos / 8 threads | 6 núcleos / 12 threads ou mais (AMD Zen 3 ou Intel 10ª geração em diante) |
| **GPU** | Vulkan (GTX 900 ou RX 400 em diante) | Vulkan 1.2 (RTX 2000 ou RX 5000 em diante) |
| **RAM** | 8 GB | 16 GB em dual-channel |
| **Disco** | SSD para os dados do emulador | |
| **Precisa de** | Firmware do PS3 (`PS3UPDAT.PUP`, instalado pelo RPCS3) | |

> Placas de vídeo Intel não são recomendadas pelo RPCS3.

### PlayStation 4 · shadPS4 🔴

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x86-64-v3 (AVX2): Intel Haswell / AMD Excavator em diante, 4 núcleos / 6 threads, 2,5 GHz+ | 8 núcleos modernos |
| **GPU** | Vulkan 1.3, 2 GB de VRAM | GTX 1660 / RX 6600 ou superior |
| **RAM** | 8 GB | 16 GB |
| **Precisa de** | Jogos extraídos do seu console | |

> O shadPS4 está em desenvolvimento: muitos jogos ainda não rodam, mesmo em PCs fortes.

## Nintendo

### Nintendo (NES) · Mesen, RANes, FCEUX 🟢

| | Mínimo |
|---|---|
| **CPU · GPU · RAM** | Qualquer PC x64, 2 GB de RAM |
| **Precisa de** | Mesen: .NET Desktop Runtime (o Mesen indica a versão se faltar) |

### Super Nintendo · Snes9x, RASnes9x 🟢

| | Mínimo |
|---|---|
| **CPU · GPU · RAM** | Qualquer PC x64, 2 GB de RAM |
| **Precisa de** | Nada |

### Game Boy Advance · Game Boy Color · mGBA, RAVBA 🟢

| | Mínimo |
|---|---|
| **CPU · GPU · RAM** | Qualquer PC x64, 2 GB de RAM |
| **Precisa de** | Nada (BIOS do GBA opcional) |

### Nintendo DS · melonDS, DeSmuME, NooDS 🟢

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | Qualquer x64 | 4 núcleos |
| **GPU** | Qualquer | OpenGL 3.2, para o renderizador com upscaling do melonDS |
| **RAM** | 2 GB | 4 GB |
| **Precisa de** | Nada (BIOS e firmware do DS opcionais; obrigatórios para DSi no melonDS) | |

### Nintendo 64 · Project64 🟢 · Rosalie's Mupen GUI 🟡

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | Qualquer x64 | 4 núcleos |
| **GPU** | OpenGL 3.3 | Vulkan 1.1, para o renderizador preciso (parallel-RDP) do RMG |
| **RAM** | 4 GB | 8 GB |
| **Precisa de** | Nada | |

### GameCube · Wii · Dolphin 🟡

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64, 2 núcleos rápidos | 4 núcleos com bom desempenho por núcleo |
| **GPU** | DirectX 11.1, OpenGL 3.3 ou Vulkan 1.1 | Dedicada, para 2x–3x de resolução |
| **RAM** | 4 GB | 8 GB |
| **Precisa de** | Nada. No Wii: um Wii Remote por Bluetooth ou o controle mapeado como Wii Remote | |

### Nintendo 3DS · Azahar 🟡

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64 com SSE4.2, PassMark single-thread 1800+ | Bom desempenho por núcleo |
| **GPU** | OpenGL 4.3 ou Vulkan 1.1 | Dedicada |
| **RAM** | 2 GB | 4 GB |
| **Precisa de** | Jogos descriptografados | |

### Wii U · Cemu 🔴

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64, 4 núcleos | 6+ núcleos com bom desempenho por núcleo |
| **GPU** | OpenGL 4.5 ou Vulkan 1.2 | NVIDIA ou AMD com Vulkan; Intel tem suporte limitado |
| **RAM** | 4 GB | 8 GB |
| **Precisa de** | Chaves (`keys.txt`) para jogos criptografados | |

## Sega

### Mega Drive / Genesis · ares 🟢

| | Mínimo |
|---|---|
| **CPU · GPU · RAM** | Qualquer PC x64, 4 GB de RAM |
| **Precisa de** | Nada |

### Dreamcast · Flycast 🟢

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | Qualquer x64 | 4 núcleos |
| **GPU** | OpenGL 3.0, DirectX 9/11 ou Vulkan | Dedicada, para upscaling |
| **RAM** | 2 GB | 4 GB |
| **Precisa de** | Nada (BIOS `dc_boot.bin` opcional, recomendada) | |

## Microsoft

### Xbox · xemu 🟡

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64, 4 núcleos | Bom desempenho por núcleo |
| **GPU** | OpenGL 4.0 ou Vulkan | Dedicada |
| **RAM** | 4 GB | 8 GB |
| **Precisa de** | MCPX boot ROM, BIOS (flash) e imagem do HD do Xbox | |

### Xbox 360 · Xenia Canary 🔴

| | Mínimo | Recomendado |
|---|---|---|
| **CPU** | x64 com AVX (Intel 4ª geração / AMD Ryzen em diante) | AVX2, 6+ núcleos modernos |
| **GPU** | DirectX 12 ou Vulkan | GTX 980 Ti ou superior |
| **RAM** | 8 GB | 16 GB |
| **Precisa de** | Visual C++ Redistributable | |

## Arquivos de sistema

Os emuladores que exigem arquivos do console original. Copie para `bios\<sistema>` ou instale pelo próprio emulador. Use apenas arquivos extraídos dos seus consoles.

| Sistema | Arquivo | Obrigatório |
|---|---|---|
| PlayStation | BIOS (`SCPH-xxxx.bin`) | ✅ |
| PlayStation 2 | BIOS (`SCPH-xxxxx.bin`) | ✅ |
| PlayStation 3 | Firmware `PS3UPDAT.PUP` | ✅ |
| Xbox | MCPX boot ROM, BIOS (flash) e HD | ✅ |
| Wii U | `keys.txt` | Só para jogos criptografados |
| Dreamcast | `dc_boot.bin` | Recomendado |
| Nintendo DS | `bios7.bin`, `bios9.bin`, `firmware.bin` | Opcional |
| Game Boy Advance | `gba_bios.bin` | Opcional |

## Fontes

Requisitos oficiais: [PCSX2](https://pcsx2.net/docs/setup/requirements) · [RPCS3](https://rpcs3.net/quickstart) · [shadPS4](https://shadps4.net/quickstart) · [Xenia](https://github.com/xenia-project/xenia/wiki/Quickstart) · [Azahar](https://github.com/azahar-emu/azahar) · [Cemu](https://cemu.info) · [Dolphin](https://dolphin-emu.org/docs/faq/) · [xemu](https://xemu.app/docs/required-files/) · [DuckStation](https://github.com/stenzek/duckstation) · [PPSSPP](https://www.ppsspp.org) · [melonDS](https://melonds.kuribo64.net) · [Flycast](https://github.com/flyinghead/flycast)

Os requisitos mudam com as versões dos emuladores; na dúvida, a página oficial de cada um é a referência.
