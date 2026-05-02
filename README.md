# Inpasa – Programações Ferroviárias

## Arquivos do projeto

```
inpasa_deploy/
├── index.html          ← App completo (único arquivo HTML)
├── 581.jpg             ← Foto da usina (fundo da tela de login)
├── netlify.toml        ← Config Netlify
├── firebase.json       ← Config Firebase CLI
├── firestore.rules     ← Regras de segurança Firestore
├── storage.rules       ← Regras de segurança Storage
└── README.md
```

---

## Deploy no Netlify

### Opção 1 — Arrastar e soltar (mais rápido)
1. Acesse [app.netlify.com](https://app.netlify.com)
2. Clique em **"Add new site" → "Deploy manually"**
3. Arraste a pasta `inpasa_deploy` inteira para a área de upload
4. Pronto! O site estará no ar em segundos.

### Opção 2 — Via GitHub
1. Suba os arquivos para um repositório GitHub
2. No Netlify: **"Add new site" → "Import from Git"**
3. Selecione o repositório → clique **Deploy**

---

## Configuração Firebase (OBRIGATÓRIO antes do primeiro acesso)

### 1. Ativar Firebase Authentication
No [Console Firebase](https://console.firebase.google.com/project/programacaoferroviariainpasa):
1. Menu **Authentication → Sign-in method**
2. Ative **"E-mail/senha"**

### 2. Criar usuário Master inicial
Em **Authentication → Users → Add user**:
- E-mail: `rafael.mulato@inpasa.com.br`
- Senha: `Inpasa@master`

Depois em **Firestore → Coleção "users"**, crie documento com o **UID** deste usuário:
```json
{
  "nome":              "Rafael Mulato",
  "email":             "rafael.mulato@inpasa.com.br",
  "empresa":           "Inpasa Agroindustrial",
  "palavraSeguranca":  "Inpasa2024",
  "role":              "master",
  "active":            true,
  "createdAt":         (server timestamp)
}
```

### 3. Criar usuário Cleidy Wagner
Em **Authentication → Users → Add user**:
- E-mail: `cleidywagner6@gmail.com`
- Senha: `Inpasa@2024`

Documento Firestore com o UID gerado:
```json
{
  "nome":    "Cleidy Wagner",
  "email":   "cleidywagner6@gmail.com",
  "empresa": "Inpasa",
  "role":    "terminal",
  "active":  true
}
```

### 4. Publicar regras Firestore e Storage
Via Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase use programacaoferroviariainpasa
firebase deploy --only firestore:rules,storage
```

### 5. Configurar CORS no Storage (para download ZIP)
Crie um arquivo `cors.json`:
```json
[{
  "origin": ["*"],
  "method": ["GET"],
  "maxAgeSeconds": 3600
}]
```
Execute:
```bash
gsutil cors set cors.json gs://programacaoferroviariainpasa.firebasestorage.app
```

---

## Estrutura Firestore

```
users/
  {uid}/
    nome, email, empresa, palavraSeguranca,
    role, active, createdAt

programacoes/
  {progId}/
    data, pedido, produto, usina, cliente,
    local, terminal, qtd, createdAt, createdBy
    vagoes/
      {vagaoId}/
        idx, vagao, nfRetorno, lacre, nfInpasa,
        nfRetornoFile, nfRetornoPath, nfRetornoUrl,
        nfInpasaFile, nfInpasaPath, nfInpasaUrl

customProfiles/
  {profileId}/
    name, baseRole, roleKey
```

---

## Perfis de acesso

| Perfil   | Programações | Usuários | Perfis | Filtros avançados |
|----------|-------------|----------|--------|-------------------|
| Master   | Tudo        | ✅        | ✅      | ✅                 |
| Inpasa   | Tudo        | ❌        | ❌      | ✅                 |
| Terminal | Restrito ao seu terminal | ❌ | ❌ | ❌           |
| CSC      | Só NF Inpasa | ❌       | ❌      | ❌                 |
