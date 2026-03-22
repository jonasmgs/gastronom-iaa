# CONFIGURAÇÃO DO STRIPE - GASTRONOM.IA (WEB)

Este guia explica como configurar o Stripe para aceitar pagamentos no app Web.

---

## PASSO 1: Obter chaves do Stripe

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com)
2. Vá em **Developers > API keys**
3. Copie a **Secret key** (começa com `sk_live_` ou `sk_test_`)

---

## PASSO 2: Criar produto no Stripe

1. Vá em **Products > Add product**
2. Preencha:
   - **Nome**: Gastronom.IA Premium
   - **Modelo de preços**: Recorrente (por período)
   - **Intervalo**: Mensal
   - **Preço**: R$ 9,90
3. Clique em **Add product**
4. Após criar, clique no produto e copie o **Price ID** (começa com `price_`)

---

## PASSO 3: Configurar Secrets no Supabase

### Opção A: Via Supabase CLI

```bash
# Configurar a chave secreta
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx

# Configurar o Price ID
npx supabase secrets set STRIPE_PRICE_ID=price_xxxxx
```

### Opção B: Via Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings > Edge Functions > Secrets**
4. Clique em **New secret** e adicione:
   - `STRIPE_SECRET_KEY` = sua chave secreta
   - `STRIPE_PRICE_ID` = ID do preço criado

---

## PASSO 4: Deploy das Edge Functions

Após configurar as secrets, faça deploy:

```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy check-subscription
```

---

## PASSO 5: Testar

1. Acesse seu app na web
2. Tente assinar
3. Se usar Stripe Embedded, verifique se o domínio está permitido em `VITE_STRIPE_EMBEDDED_HOSTS`

---

## VERIFICAÇÃO

Para verificar se está funcionando:

1. Verifique as secrets:
```bash
npx supabase secrets list | grep STRIPE
```

2. Deve aparecer:
```
STRIPE_PRICE_ID    price_xxxxx
STRIPE_SECRET_KEY  sk_live_xxxxx
```

---

## RESOLUÇÃO DE PROBLEMAS

### "STRIPE_SECRET_KEY nao esta configurada"
- Verifique se a secret foi adicionada corretamente no Supabase
- Execute `npx supabase secrets list` para confirmar

### "STRIPE_PRICE_ID nao esta configurada"
- Verifique se o Price ID está correto
- O Price ID deve começar com `price_`

### Checkout não aparece
- Verifique se a conta Stripe está verificada
- Verifique se o produto está ativo

---

## CONFIGURAÇÃO ATUAL

| Variável | Status |
|----------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ Configurado |
| `STRIPE_SECRET_KEY` | ❌ FALTA |
| `STRIPE_PRICE_ID` | ❌ FALTA |

---

## PRÓXIMOS PASSOS

1. Obter `STRIPE_SECRET_KEY` do Stripe Dashboard
2. Criar produto e obter `STRIPE_PRICE_ID`
3. Configurar no Supabase
4. Deploy das Edge Functions
5. Testar assinatura
