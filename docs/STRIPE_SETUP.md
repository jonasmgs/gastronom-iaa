# CONFIGURAÇÃO DO STRIPE - GASTRONOM.IA (WEB)

Guia para configurar Stripe (checkout hospedado ou Embedded) integrado ao Supabase.

---

## Passo 1: Obter chaves do Stripe
1. Acesse https://dashboard.stripe.com
2. Developers → API keys
3. Copie a **Secret key** (`sk_live_...` ou `sk_test_...`)
4. Copie também a **Publishable key** (`pk_live_...` ou `pk_test_...`)

---

## Passo 2: Criar produto e preço
1. Products → Add product
2. Configure:
   - Nome: Gastronom.IA Premium
   - Tipo: Recorrente
   - Intervalo: Mensal
   - Preço sugerido: R$ 9,90 (ajuste conforme plano)
3. Salve e copie o **Price ID** (`price_...`)

---

## Passo 3: Configurar secrets no Supabase
Via CLI:
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
npx supabase secrets set STRIPE_PRICE_ID=price_xxxxx
```
Via Dashboard: Settings → Edge Functions → Secrets → New secret (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`).

---

## Passo 4: Variáveis do frontend (.env)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_ou_test
VITE_STRIPE_EMBEDDED_HOSTS=app.gastronomia.com.br,www.gastronomia.com.br
VITE_STRIPE_FORCE_HOSTED_CHECKOUT= # deixe em branco ou true/false
```
- Em localhost o app já usa checkout hospedado; defina embedded apenas em produção se quiser.

---

## Passo 5: Deploy das Edge Functions
```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy check-subscription
```

---

## Passo 6: Testar
1. Abrir app web, tentar assinar.
2. Conferir que aparece checkout (hospedado ou embedded).
3. Validar que, após pagar, o status é refletido em `check-subscription`.

---

## Verificação rápida
```bash
npx supabase secrets list | grep STRIPE
```
Deve mostrar `STRIPE_SECRET_KEY` e `STRIPE_PRICE_ID`.

---

## Resolução de problemas
- **"STRIPE_SECRET_KEY não está configurada"**: adicione a secret no Supabase e redeploy as functions.
- **"STRIPE_PRICE_ID não está configurada"**: confira se o ID começa com `price_`.
- Checkout não aparece: verifique se a conta Stripe está verificada e o produto ativo; para Embedded, confirme `VITE_STRIPE_EMBEDDED_HOSTS`.

---

## Checklist (preencher manualmente)
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` no frontend
- [ ] `STRIPE_SECRET_KEY` no Supabase
- [ ] `STRIPE_PRICE_ID` no Supabase
- [ ] Produto/Preço ativos no Stripe
- [ ] Domínios em `VITE_STRIPE_EMBEDDED_HOSTS`
- [ ] Functions `create-checkout` e `check-subscription` publicadas
