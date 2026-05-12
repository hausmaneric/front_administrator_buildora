# Obrax Administracao

Painel administrativo Angular da plataforma Obrax, baseado no padrao estrutural do `quartzo`, usando Syncfusion e integrado a API publicada no Railway.

## Stack

- Angular 21
- Syncfusion
- SCSS
- API master Obrax em:
  - `https://web-production-1d13c.up.railway.app/api/v1/`

## Funcionalidades

- login master
- dashboard administrativo
- gestao de contas
- gestao de planos
- gestao de modulos
- gestao de usuarios master
- vinculo de modulos por conta
- onboarding e bootstrap de tenant
- leitura de environment, ready, routes, catalog, security-check, schema e migrations
- paginacao server-side
- busca e ordenacao persistidas por modulo
- acoes por linha:
  - editar
  - duplicar
  - remover
- exportacao da pagina atual:
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

Saida de build:

- `dist/obrax-administracao/browser`

## Deploy no Railway

O projeto esta preparado para deploy no Railway com:

- `Dockerfile` multi-stage para build Angular
- `nginx.conf.template` com fallback SPA
- suporte ao `PORT` do Railway via `envsubst`

Fluxo recomendado:

1. subir o repositorio `front_administrator_buildora` no GitHub
2. no Railway, criar `New Project`
3. escolher `Deploy from GitHub repo`
4. selecionar o repositorio do administrativo
5. apos o deploy, abrir `Settings -> Networking`
6. clicar em `Generate Domain`

## Observacoes

- a pasta `quartzo/` foi mantida apenas como referencia local e esta ignorada para publicacao
- o front ja aponta para a API produtiva do Railway em `src/app/resources.ts`
