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
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
```

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
