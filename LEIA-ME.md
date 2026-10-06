# Bartzen + Casa Contente · Casa Liv 2026

Duas páginas independentes, uma por ambiente, com uma página por produto (cada uma com seu QR code) e placa de entrada com NFC.

| Ambiente | Arquiteta | Pasta / endereço |
|---|---|---|
| Studio Bossa | Tatiane Madeiro | `/casalivtatimadeiro` |
| Living Entre Amigos | Fernanda Machado | `/casalivfernandamachado` |

## Publicar no site

O site já está gerado em **`dist/`**. Suba cada pasta no caminho correspondente do domínio:

- `dist/casalivtatimadeiro/` → `https://www.casacontente.com.br/casalivtatimadeiro/`
- `dist/casalivfernandamachado/` → `https://www.casacontente.com.br/casalivfernandamachado/`

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

⚠️ Os QR codes e a tag NFC usam `baseUrl` (em `site.json`) + `slug`. Confirme o endereço final **antes** de imprimir; depois de impressos, os slugs não podem mudar.

## Contatos

- **Casa Contente:** os botões de WhatsApp abrem uma janela para o visitante escolher um dos vendedores exclusivos da Casa Liv (lista `vendedores` em `site.json`; a ordem é sorteada a cada visita).
- **Bartzen:** os botões levam ao site de solicitação de projeto (`bartzenProjetoUrl` em `site.json`).
