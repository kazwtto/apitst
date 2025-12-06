// server.js
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Webhook endpoint
app.post('/webhook/cakto', async (req, res) => {
  try {
    const { event, order, customer, product, subscription } = req.body;

    console.log(`Webhook recebido: ${event}`);

    switch (event) {
      case 'purchase_approved':
        console.log('✅ Compra aprovada:', {
          orderId: order?.id,
          customer: customer?.email,
          product: product?.name,
          amount: order?.amount
        });
        // SEU CÓDIGO AQUI - liberar acesso, enviar email, etc
        break;

      case 'purchase_refused':
        console.log('❌ Compra recusada:', order?.id);
        // SEU CÓDIGO AQUI
        break;

      case 'pix_gerado':
      case 'boleto_gerado':
      case 'picpay_gerado':
        console.log('💰 Pagamento gerado:', event);
        // SEU CÓDIGO AQUI
        break;

      case 'chargeback':
        console.log('⚠️ CHARGEBACK:', order?.id);
        // SEU CÓDIGO AQUI - remover acesso
        break;

      case 'refund':
        console.log('💸 Reembolso:', order?.id);
        // SEU CÓDIGO AQUI
        break;

      case 'subscription_created':
        console.log('🔄 Assinatura criada:', subscription?.id);
        // SEU CÓDIGO AQUI
        break;

      case 'subscription_canceled':
        console.log('🚫 Assinatura cancelada:', subscription?.id);
        // SEU CÓDIGO AQUI
        break;

      case 'subscription_renewed':
        console.log('✅ Assinatura renovada:', subscription?.id);
        // SEU CÓDIGO AQUI
        break;

      default:
        console.log('Evento não tratado:', event);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
  console.log(`Webhook: POST /webhook/cakto`);
});