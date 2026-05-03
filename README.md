# Gastronom.IA

Aplicativo React + Supabase + Stripe para gerar receitas com IA, conversar com o chef virtual e assinar o plano premium.

## Rodando localmente

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

O app local fica em `http://127.0.0.1:5173`.

## Variáveis de ambiente

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_EMBEDDED_HOSTS=
VITE_STRIPE_FORCE_HOSTED_CHECKOUT=
```

Backend / Supabase secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_AI_KEY
GOOGLE_AI_MODEL=gemini-3.1-flash-lite-preview
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
```

Observacoes sobre IA:

- O app usa `gemini-3.1-flash-lite-preview` por padrao nas Edge Functions para reduzir custo por receita.
- `GOOGLE_AI_MODEL` e opcional; se nao for definido, o backend usa `gemini-3.1-flash-lite-preview`.
- Nao adote `gemini-2.0-flash-lite` em novos deploys: o Google marcou esse modelo como deprecated e com desligamento anunciado para 1 de junho de 2026.

## Stripe checkout

- Em `localhost` e `127.0.0.1`, o app usa checkout hospedado do Stripe para testes mais estáveis.
- Em produção web, o app pode usar Stripe Embedded Checkout.
- Para restringir o embedded ao domínio final, preencha `VITE_STRIPE_EMBEDDED_HOSTS` com uma lista separada por vírgulas.

Exemplo:

```env
VITE_STRIPE_EMBEDDED_HOSTS=app.gastronomia.com.br,www.gastronomia.com.br
```

Se quiser forçar checkout hospedado mesmo em produção:

```env
VITE_STRIPE_FORCE_HOSTED_CHECKOUT=true
```

## Supabase functions usadas

- `recipe-generator`
- `chef-chat`
- `check-subscription`
- `create-checkout`
- `customer-portal`

## Publicação

Build do frontend:

```sh
npm run build
```

Deploy das functions:

```sh
npx supabase functions deploy recipe-generator --no-verify-jwt
npx supabase functions deploy chef-chat --no-verify-jwt
npx supabase functions deploy check-subscription --no-verify-jwt
npx supabase functions deploy create-checkout --no-verify-jwt
npx supabase functions deploy customer-portal --no-verify-jwt
```

## Publicação Mobile (Android)

Para gerar o arquivo AAB para a Google Play, siga estas etapas:

1.  **Build do Frontend**: `npm run build`
2.  **Sync do Capacitor**: `npx cap sync android`
3.  **Configuração do Keystore**: Garanta que `android/key.properties` e `android/app/upload-keystore.jks` existam (não comitados).
4.  **Gerar AAB**:
    - Abrao Android Studio na pasta `android`.
    - `Build > Generate Signed Bundle / APK...`
    - Selecione `Android App Bundle`.
    - Use as credenciais do `upload-keystore.jks`.
5.  **Localização do Arquivo**: O AAB gerado estará em `android/app/build/outputs/bundle/release/app-release.aab`.

## Testes

### Testes Unitários

```sh
npm run test
```

### Testes E2E (Playwright)

1. Instalar browsers:
```sh
npm run install:playwright
```

2. Rodar testes:
```sh
npm run test:e2e
```

3. Modo UI:
```sh
npm run test:e2e:ui
```

## CI/CD

O projeto usa GitHub Actions com os seguintes workflows:

### Secrets Necessários (GitHub)

```
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
```

### Pipeline

1. **Lint & Test** - ESLint + Vitest
2. **Build** - Vite build
3. **E2E Tests** - Playwright (opcional em PRs)
4. **Deploy** - Vercel (apenas em main)

## Single Device Login

O app impede login simultâneo em múltiplos dispositivos:

- Ao fazer login, um session_token único é gerado
- O token é salvo localmente e no Supabase
- Ao abrir em outro dispositivo, o anterior é desconectado
- O guard de sessão valida a cada 30s e ao voltar ao app/aba
