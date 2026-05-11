# Obrax Administração

Painel administrativo Angular da plataforma Obrax, baseado no padrão estrutural do `quartzo`, usando Syncfusion e integrado à API já publicada no Railway.

## Stack

- Angular 21
- Syncfusion
- SCSS
- API master Obrax em:
  - `https://web-production-1d13c.up.railway.app/api/v1/`

## Funcionalidades

- login master
- dashboard administrativo
- gestão de contas
- gestão de planos
- gestão de módulos
- gestão de usuários master
- vínculo de módulos por conta
- onboarding e bootstrap de tenant
- leitura de environment, ready, routes, catalog, security-check, schema e migrations
- paginação server-side
- busca e ordenação persistidas por módulo
- ações por linha:
  - editar
  - duplicar
  - remover
- exportação da página atual:
  - CSV
  - JSON

## Desenvolvimento local

```bash
npm install
npm run start
```

## Build

```bash
npm run build
```

Saída de build:

- `dist/obrax-administracao/browser`

## Deploy no Vercel

O projeto já está preparado com:

- `vercel.json`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist/obrax-administracao/browser`
- rewrite SPA para `index.html`

Ao importar este repositório no Vercel, ele deve funcionar sem ajustes extras.

## Observações

- a pasta `quartzo/` foi mantida apenas como referência local e está ignorada para publicação
- o front já aponta para a API produtiva do Railway em `src/app/resources.ts`
