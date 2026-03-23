#!/bin/bash
# ============================================
# SCRIPT DE CONFIGURAÇÃO - STRIPE (WEB)
# ============================================
#
# Este script ajuda a configurar as variáveis
# necessárias para o Stripe funcionar no Supabase.
#
# USO:
#   1. Configure as variáveis abaixo com seus valores
#   2. Execute: npx supabase secrets set KEY=VALUE
#
# ============================================

# ============================================
# PASSO 1: Obtenha estas chaves no Stripe Dashboard
# https://dashboard.stripe.com/apikeys
# ============================================

# Chave secreta do Stripe (começa com sk_live_ ou sk_test_)
STRIPE_SECRET_KEY="REPLACE_WITH_YOUR_STRIPE_SECRET_KEY"

# ============================================
# PASSO 2: Crie um produto e obtenha o Price ID
# https://dashboard.stripe.com/products
# ============================================

# ID do preço (começa com price_)
# Exemplo: price_1234567890abcdef
STRIPE_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxx"

# ============================================
# PASSO 3: Execute os comandos abaixo
# ============================================

echo "Configurando secrets do Supabase..."
echo ""

echo "1. Configurando STRIPE_SECRET_KEY..."
npx supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

echo ""
echo "2. Configurando STRIPE_PRICE_ID..."
npx supabase secrets set STRIPE_PRICE_ID="$STRIPE_PRICE_ID"

echo ""
echo "============================================"
echo "CONFIGURAÇÃO CONCLUÍDA!"
echo "============================================"
echo ""
echo "Verificando secrets configuradas..."
npx supabase secrets list | grep -E "STRIPE"

# ============================================
# NOTAS IMPORTANTES:
# ============================================
#
# 1. Use keys de PRODUÇÃO (sk_live_) para produção
# 2. Use keys de TESTE (sk_test_) para desenvolvimento
# 3. O Price ID deve corresponder ao produto criado
# 4. Após configurar, faça deploy das Edge Functions:
#    npx supabase functions deploy create-checkout
#    npx supabase functions deploy check-subscription
#
# ============================================
