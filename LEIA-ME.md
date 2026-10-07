# Bartzen + Casa Contente · Casa Liv 2026

Duas páginas independentes, uma por ambiente, com uma página por produto (cada uma com seu QR code) e placa de entrada com NFC.

| Ambiente | Arquiteta | Pasta | Endereço |
|---|---|---|---|
| Studio Bossa | Tatiane Madeiro | `dist/casalivtatimadeiro/` | https://casalivtatimadeiro.casacontente.com.br/ |
| Living Entre Amigos | Fernanda Machado | `dist/casalivfernandamachado/` | https://casalivfernandamachado.casacontente.com.br/ |

## Publicar no site

O site já está gerado em **`dist/`**. Cada pasta é a **raiz** do seu subdomínio:

- conteúdo de `dist/casalivtatimadeiro/` → `https://casalivtatimadeiro.casacontente.com.br/`
- conteúdo de `dist/casalivfernandamachado/` → `https://casalivfernandamachado.casacontente.com.br/`

Cada pasta é autossuficiente (HTML, CSS e imagens próprios), sem dependência de servidor: são arquivos estáticos.

## Editar e gerar de novo

Requisitos: Node.js 18+.

```bash
npm install
node build.js
```

- `site.json`: dados comuns (domínio, WhatsApp da Casa Contente e da Bartzen, link de solicitação de projeto Bartzen, logos, textos das marcas).
- `ambientes/studio-bossa.json` e `ambientes/living-entre-amigos.json`: conteúdo e produtos de cada ambiente. O campo `slug` define a pasta/endereço.
- `imagens/`: fotos (as do Living em `imagens/living/`).
- `src/style.css`: visual das páginas.

## Material de impressão

`qrcodes/<ambiente>/` (gerado pelo `build.js`, não vai para o servidor):

- `imprimir.html`: etiquetas A4 com os QR codes de cada produto;
- `placa-entrada.html`: placa de entrada com NFC + QR;
- `NFC - gravar na tag.txt`: URL a gravar na tag NFC da entrada;
- `.svg` / `.png` de cada QR code e `links.csv` com todas as URLs.

⚠️ Os QR codes e a tag NFC usam o campo `url` de cada ambiente (em `ambientes/*.json`). Confirme o endereço final **antes** de imprimir; depois de impressos, os slugs não podem mudar.

## Plaquinhas 3D dos produtos

`plaquinhas-3d/<ambiente>/` (gerado por `python tools/plaquinhas3d.py`, depois do `node build.js`):

- `<CÓDIGO>_<produto>.3mf`: placa (50 × 73 × 3 mm) com o QR do produto, o logo Contente+ e o código, mais o suporte;
- `_LOTE - todas as placas.3mf` e `_LOTE - todos os suportes.3mf`: tudo de um ambiente numa mesa;
- `.png`: prévia de cada placa.

Abra no Bambu Studio. **Filamento 1** = cor da placa e dos módulos do QR (escuro) · **filamento 2** = fundo do QR, logo e código (claro). Para QR bem definido, use camada de 0,08–0,12 mm na parte de cima. Teste a leitura com o celular antes de imprimir o lote.

Requisitos: `pip install trimesh shapely mapbox_earcut matplotlib svgelements qrcode` No Mac, o script também confere a leitura de cada QR (`tools/lerqr.swift`).

## Contatos

- **Casa Contente:** os botões de WhatsApp abrem uma janela para o visitante escolher um dos vendedores exclusivos da Casa Liv (lista `vendedores` em `site.json`; a ordem é sorteada a cada visita).
- **Bartzen:** os botões levam ao site de solicitação de projeto (`bartzenProjetoUrl` em `site.json`).
