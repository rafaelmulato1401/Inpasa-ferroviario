const functions  = require('firebase-functions');
const admin      = require('firebase-admin');
const sgMail     = require('@sendgrid/mail');

admin.initializeApp();

// ══════════════════════════════════════════
// CONFIG
// Set via: firebase functions:config:set sendgrid.key="SG.xxxx"
// ══════════════════════════════════════════
const SENDGRID_KEY = functions.config().sendgrid?.key || process.env.SENDGRID_API_KEY;

const TO_EMAILS = [
  'atendimento.externo@inpasa.com.br',
  'csc.faturamento@inpasa.com.br',
  'csc@elosinpasa.com.br',
  'rafael.mulato@inpasa.com.br',
  'kemelyn.penha@inpasa.com.br',
];

const FROM_EMAIL = 'noreply@inpasa.com.br'; // must be verified in SendGrid

// ══════════════════════════════════════════
// CLOUD FUNCTION: enviarFaturamento
// Called from the frontend with vagao data + PDF base64
// ══════════════════════════════════════════
exports.enviarFaturamento = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {

    // 1. Authenticate — must be logged in
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado.');
    }

    // 2. Validate required fields
    const { prog, vagao, pdfBase64, pdfFileName } = data;
    if (!prog || !vagao) {
      throw new functions.https.HttpsError('invalid-argument', 'Dados incompletos.');
    }

    // 3. Build email
    sgMail.setApiKey(SENDGRID_KEY);

    const dataAtual = new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' });
    const subject   = `FATURAMENTO FERROVIÁRIO - VAGÃO ${vagao.vagao || '?'} - TERMINAL ${prog.terminal || '?'} - DATA ${prog.data || '?'}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #1a2340; font-size: 13px; }
    .header { background: #1a3a6b; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0; }
    .header h2 { margin: 0; font-size: 16px; }
    .header p  { margin: 4px 0 0; font-size: 12px; opacity: 0.8; }
    .gold-bar  { height: 4px; background: #f0a500; }
    .content   { padding: 20px 24px; border: 1px solid #cdd5e8; border-top: none; border-radius: 0 0 8px 8px; }
    .section   { margin-bottom: 20px; }
    .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7a99; margin: 0 0 10px; }
    table      { width: 100%; border-collapse: collapse; }
    td         { padding: 6px 10px; border-bottom: 1px solid #edf0f8; font-size: 13px; }
    td:first-child { font-weight: 600; color: #1a3a6b; width: 140px; }
    .badge     { display: inline-block; background: #e8eef8; color: #1a3a6b; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .footer    { margin-top: 20px; padding-top: 12px; border-top: 1px solid #edf0f8; font-size: 11px; color: #6b7a99; }
  </style>
</head>
<body>
  <div class="header">
    <h2>✈ Solicitação de Faturamento Ferroviário</h2>
    <p>Gerado automaticamente pelo Sistema de Programações Ferroviárias Inpasa</p>
  </div>
  <div class="gold-bar"></div>
  <div class="content">

    <div class="section">
      <h3>Dados da Programação</h3>
      <table>
        <tr><td>Pedido</td><td>${prog.pedido || '—'}</td></tr>
        <tr><td>Produto</td><td>${prog.produto || '—'}</td></tr>
        <tr><td>Usina / Filial</td><td>${prog.usina || '—'}</td></tr>
        <tr><td>Cliente</td><td>${prog.cliente || '—'}</td></tr>
        <tr><td>Local de Entrega</td><td>${prog.local || '—'}</td></tr>
        <tr><td>Terminal</td><td><span class="badge">${prog.terminal || '—'}</span></td></tr>
        <tr><td>Data Programação</td><td>${prog.data || '—'}</td></tr>
        <tr><td>Encoste</td><td>${prog.encoste || '—'}</td></tr>
      </table>
    </div>

    <div class="section">
      <h3>Dados do Vagão</h3>
      <table>
        <tr><td>Vagão Nº</td><td><strong>${vagao.vagao || '—'}</strong></td></tr>
        <tr><td>NF de Retorno</td><td>${vagao.nfRetorno || '—'}</td></tr>
        <tr><td>Volume (m³)</td><td>${vagao.volume || '—'}</td></tr>
        <tr><td>Lacre</td><td>${vagao.lacre || '—'}</td></tr>
        <tr><td>NF Inpasa</td><td>${vagao.nfInpasa || '—'}</td></tr>
      </table>
    </div>

    <div class="footer">
      Enviado em: ${dataAtual}<br>
      ${pdfFileName ? `Anexo: ${pdfFileName}` : ''}
    </div>
  </div>
</body>
</html>`;

    // 4. Build message with optional PDF attachment
    const msg = {
      to:      TO_EMAILS,
      from:    FROM_EMAIL,
      subject: subject,
      html:    htmlBody,
      text:    `FATURAMENTO FERROVIÁRIO\n\nPedido: ${prog.pedido}\nVagão: ${vagao.vagao}\nTerminal: ${prog.terminal}\nNF Retorno: ${vagao.nfRetorno}\nVolume: ${vagao.volume}\nLacre: ${vagao.lacre}\n\nEnviado em: ${dataAtual}`,
    };

    // Attach PDF if provided
    if (pdfBase64 && pdfFileName) {
      msg.attachments = [{
        content:     pdfBase64,
        filename:    pdfFileName,
        type:        'application/pdf',
        disposition: 'attachment',
      }];
    }

    // 5. Send email
    await sgMail.send(msg);

    // 6. Update Firestore — mark vagão as sent
    const { progId, vagaoId, sentAt } = data;
    if (progId && vagaoId) {
      await admin.firestore()
        .collection('programacoes').doc(progId)
        .collection('vagoes').doc(vagaoId)
        .update({ enviadoFaturamentoAt: sentAt || dataAtual });
    }

    return { success: true, sentAt: dataAtual };
  });
