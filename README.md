# Devir Social — app do piloto

App web para envio, debate, votação e cálculo das publicações do Devir Social.
As regras de classificação e montagem dos posts estão em [`src/lib/regras.ts`](src/lib/regras.ts), com testes em [`src/lib/regras.test.ts`](src/lib/regras.test.ts).

## O que o app faz

- **Login por link no e-mail**, só para pessoas convidadas.
- **Cadastro com tela de consentimento** (nome, nome público e 5 autorizações).
- **Envio de conteúdo** (imagem de até 5 MB + texto).
- **Debate** com comentários e respostas em thread, e **votação** a favor ou contra, durante 14 dias. O voto pode ser mudado até o fechamento; contagens e nomes ficam escondidos até lá.
- **Classificação automática** (maioria, minoria, tribuna livre, sem quórum), com quórum de 20% dos participantes da janela.
- **Plano de publicação** (só coordenação): monta os posts do Instagram (cascata, rodízio, até 10 imagens, legenda com pesos 4:2:1), gera o registro em HTML para o blog e apaga as imagens depois de publicadas.
- **Painel semanal público** em `/painel`, sem login.
- **Remoção por exceção legal** (só coordenação), com o motivo registrado.

## Como colocar no ar

### 1. Banco de dados (Supabase)

1. No Supabase, abra o projeto e vá em **SQL Editor → New query**.
2. Cole todo o conteúdo de [`supabase/migrations/0001_esquema.sql`](supabase/migrations/0001_esquema.sql) e clique em **Run**.

### 2. Login (Supabase → Authentication)

1. **Sign In / Providers → Email:** desligue **Allow new users to sign up**. A participação é por convite.
2. **URL Configuration:**
   - **Site URL:** o endereço do app (em desenvolvimento, `http://localhost:3000`; depois, o endereço da Vercel).
   - **Redirect URLs:** adicione `http://localhost:3000/**` e o endereço da Vercel seguido de `/**`.
3. **Emails → Templates:** troque o link de dois modelos, para o login funcionar mesmo quando a pessoa abre o e-mail em outro aparelho:
   - **Magic Link:** `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email`
   - **Invite user:** `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`
4. **Envio de e-mails:** o serviço padrão do Supabase envia pouquíssimos e-mails por hora e serve só para testes. Antes de convidar o grupo, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (por exemplo, Resend ou Brevo, que têm planos gratuitos).

### 3. Rodar no computador

```bash
cp .env.example .env.local   # depois preencha com os dados do Supabase
npm install
npm run dev                  # abre em http://localhost:3000
```

Em `.env.local` vão o endereço do projeto e a **publishable key**. O app **não usa** a secret key: ela nunca deve ir para este projeto.

### 4. Primeiro acesso e coordenação

1. No Supabase, **Authentication → Users → Invite user**, convide o seu próprio e-mail.
2. Abra o link do e-mail e conclua o cadastro no app.
3. No **SQL Editor**, rode (trocando o e-mail) para virar coordenação:

```sql
update public.perfis set is_admin = true
where id = (select id from auth.users where email = 'seu-email@exemplo.com');
```

4. Para convidar participantes, repita o passo 1 com o e-mail de cada pessoa.

### 5. Publicar na Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Na Vercel, **Add New → Project**, importe o repositório.
3. Em **Environment Variables**, cadastre as mesmas três variáveis do `.env.local`, com `NEXT_PUBLIC_SITE_URL` apontando para o endereço da Vercel.
4. Depois do primeiro deploy, atualize a **Site URL** e as **Redirect URLs** no Supabase (passo 2.2).

## Rotina da coordenação

Nas quartas e domingos, abra **Plano de publicação** na página inicial:

1. Para cada post: baixe as imagens na ordem mostrada, publique no Instagram como carrossel e cole a legenda.
2. Clique em **Marcar como publicado**. As imagens desse post são apagadas do app; textos e votos ficam guardados.
3. Copie o **Registro para o blog** e publique no Blogger, no modo HTML.

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | Rodar em desenvolvimento |
| `npm test` | Testar as regras (classificação, cascata, rodízio, legenda) |
| `npm run lint` | Conferir o código |
| `npm run build` | Gerar a versão de produção |

## Limitações conhecidas (v1)

- A lista de remoções no registro para o blog mostra **todas** as remoções já feitas, não só as novas.
- Imagens de conteúdos removidos por exceção legal continuam guardadas no Supabase.
- Exclusão de conta: por enquanto, feita pela coordenação direto no Supabase (marcar `removido = true` e trocar o `nome_publico` por "participante removido").
- O link das regras no cadastro aponta para a v0.1 do blog. Troque em [`src/lib/config.ts`](src/lib/config.ts) quando a v0.2 for publicada.
