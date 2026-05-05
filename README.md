# Cloud Functions — Inpasa Ferroviário

## Pré-requisitos

1. Node.js 18+ instalado
2. Firebase CLI: `npm install -g firebase-tools`
3. Conta SendGrid com sender verificado

---

## Setup SendGrid

1. Acesse [sendgrid.com](https://sendgrid.com) e crie uma conta gratuita
2. Vá em **Settings → API Keys → Create API Key**
3. Selecione **Full Access** → clique em **Create & View**
4. Copie a chave (começa com `SG.`)
5. Em **Settings → Sender Authentication**, verifique o domínio `inpasa.com.br`
   ou crie um Sender com e-mail `noreply@inpasa.com.br`

---

## Deploy da Cloud Function

```bash
# 1. Entre na pasta do projeto
cd inpasa_functions

# 2. Faça login no Firebase
firebase login

# 3. Selecione o projeto
firebase use programacaoferroviariainpasa

# 4. Configure a chave do SendGrid
firebase functions:config:set sendgrid.key="SG.SUA_CHAVE_AQUI"

# 5. Instale dependências
cd functions && npm install && cd ..

# 6. Deploy
firebase deploy --only functions
```

Após o deploy, a URL da função será:
```
https://us-central1-programacaoferroviariainpasa.cloudfunctions.net/enviarFaturamento
```

---

## Verificar se está funcionando

```bash
firebase functions:log
```

---

## Atualizar a chave SendGrid

```bash
firebase functions:config:set sendgrid.key="SG.NOVA_CHAVE"
firebase deploy --only functions
```

---

## Custo estimado

- **Firebase Functions**: gratuito até 2 milhões de invocações/mês → custo zero para 1.600 e-mails
- **SendGrid**: plano gratuito inclui **100 e-mails/dia (3.000/mês)** → cobre seu volume
- Se passar de 3.000/mês → plano Essentials ($19.95/mês para 50.000 e-mails)

---

## Estrutura do projeto

```
inpasa_functions/
├── firebase.json          ← Config Firebase
├── README.md              ← Este arquivo
└── functions/
    ├── index.js           ← Cloud Function principal
    └── package.json       ← Dependências Node.js
```
