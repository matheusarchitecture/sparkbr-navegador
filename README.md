# SparkBR 2.1 — ecossistema de 23 aplicativos

Este é um **ambiente de integração separado**, criado no Windows em:

**C:\Users\Arquitetura\Desktop\SparkBR-2.1-ECOSSISTEMA**

O projeto original em **C:\Users\Arquitetura\spark20\SparkBR-2.0** e o site de origem em **Neuro quant project\sparkbr_rebrand\site** foram preservados.

## O que esta versão reúne

- **public-site/**: cópia de trabalho do site real, incluindo as 23 páginas de aplicativos.
- **site/**: shell do navegador SparkBR em **/navegador/**.
- **ecosystem.mjs**: API para famílias, convites de uso único e registros compartilhados com controle de versão.
- **site/bridge/spark-bridge.js**: SDK comum, carregado nos aplicativos.
- **site/bridge/spark-family.js** e **spark-family.css**: painel de família inserido nas 23 páginas e na página inicial.
- **tools/integrate-apps.ps1**: script idempotente que instala as tags de integração e guarda cópias anteriores em **backups/pre-integration/**.
- **backend-patch/patch_spark_auth_cookie.py**: patch revisável para ligar a API ao sistema de conta SparkBR existente usando cookie **HttpOnly**.
- Testes automatizados para o catálogo, as páginas, o servidor e a API de compartilhamento.

## Importante sobre a autenticação

O painel **não cria uma segunda conta**. Ele reutiliza a conta existente do SparkBR. Para que o navegador consiga autenticar a API do ecossistema sem expor o token no JavaScript, o backend de autenticação precisa emitir o cookie **sparkbr_session** (HttpOnly; SameSite=Lax; Secure em HTTPS) ao concluir login/cadastro e removê-lo ao sair.

O patch de backend está em **backend-patch/patch_spark_auth_cookie.py**. Ele cria um backup, valida o formato do arquivo e restaura o original se a compilação Python falhar. **O patch ainda não foi aplicado ao servidor de produção.** Antes de executá-lo na VPS, confira o guia **backend-patch/README.md** e rode primeiro com a opção **--check**.

O Node valida esse cookie por meio do endpoint existente de perfil, configurável por **SPARK_AUTH_ME_URL**. Em produção, configure esse endpoint no arquivo **.env** e mantenha o diretório de dados fora da raiz pública.

## O que é compartilhado hoje

O painel oferece coleções com autorização por aplicativo:

| Coleção | Aplicativos autorizados |
|---|---|
| Lista de compras | Spark Mercado e Cardápio |
| Cardápio | Cardápio e Spark Mercado |
| Tarefas da família | Família, Faxina, Escola, SparkMat e SparkPet |
| Agenda | Agenda, Escola e Família |
| Organização financeira da casa | Contas, Financeiro, Cofrinho, Energia, Posto e Bico |
| Inventário da casa | SparkMat, SparkPet, Energia, Faxina e Família |
| Cuidados com pets | SparkPet |
| Checklist escolar | Escola |
| Registros do veículo | Posto |
| Metas de hidratação | Spark Água |
| Rotina de descanso | Cantinho do Sono |
| Ideias e recados | Mural e Canal de Ideias |

Os registros podem ser criados, listados, atualizados com controle de versão e removidos. Convites expiram em 7 dias e são de uso único. Os registros são isolados por família. Foi adicionado um conector inicial no fluxo de gravação do Spark Mercado para enviar a lista pessoal à coleção familiar em lote; a validação ponta a ponta com uma conta real ainda depende da publicação do cookie seguro e não foi executada.

**Saúde, medicamentos, exames e relacionamentos não são sincronizados automaticamente.** A validação do backend bloqueia nomes de campos sensíveis, mas isso não substitui revisão de privacidade. Não coloque informações médicas, documentos, senhas ou dados bancários nos registros compartilhados.

## Limite importante: integração do painel não significa migração automática

As 23 páginas agora carregam o SDK e o painel compartilhado. Isso estabelece uma camada comum de conta/família e permite compartilhar itens dentro das coleções acima. **Os dados internos já existentes em cada aplicativo ainda não foram todos migrados nem mapeados automaticamente** para essas coleções. Para concluir essa etapa, cada aplicativo precisa ter seu fluxo real de salvar/carregar ligado ao SDK ou aos endpoints existentes do SparkBR. A ponte está pronta para isso; não declarei uma sincronização automática que ainda não foi testada.

A API usa arquivo JSON persistente e foi preparada para um único processo Node. Para múltiplos processos/instâncias em produção, migre o armazenamento para SQLite/PostgreSQL com transações e backups testados.

## Executar os testes e abrir o ambiente local

Requisitos: Node.js 22+ e Python 3 para validar o patch de backend.

~~~powershell
cd "$env:USERPROFILE\Desktop\SparkBR-2.1-ECOSSISTEMA"
npm test
npm start
~~~

Abra **http://localhost:3080/** para a cópia do site, **http://localhost:3080/spark/** para o Spark Mercado e **http://localhost:3080/navegador/** para o navegador.

Sem o backend de conta acessível e o cookie de sessão emitido, o painel mostra a orientação de entrar na conta principal. O modo local testa páginas e rotas; não representa uma publicação em produção.

## Publicar na VPS

1. Faça backup da raiz pública, da configuração Nginx, do serviço SparkMarket e do banco de contas.
2. Aplique **backend-patch/patch_spark_auth_cookie.py** ao **server.py** correto do SparkMarket apenas depois de **--check** confirmar compatibilidade.
3. Reinicie o serviço de autenticação com o nome real identificado no systemd e teste login/logout sem exibir tokens.
4. Publique **public-site/** na raiz pública atual **preservando os endpoints e os 23 caminhos existentes**.
5. Publique **site/**, **server.mjs** e **ecosystem.mjs** em diretório separado, por exemplo **/opt/sparkbr-navegador**.
6. Configure **.env** com **PORT=3080**, **SPARK_AUTH_ME_URL**, **SPARK_DATA_DIR** persistente fora da raiz pública e, se usar IA, **OPENAI_API_KEY**.
7. Configure o proxy **/navegador/** para **127.0.0.1:3080**, valide **nginx -t** e reinicie o serviço Node.
8. Confirme **/navegador/api/status**, faça login no domínio HTTPS, abra o painel em dois usuários de teste e valide convite, compartilhamento, logout, isolamento entre famílias e restauração de backup.

O exemplo Nginx é apenas um trecho para o bloco HTTPS existente; não substitua a configuração completa do site.

## Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org)

- Committers and reviewers: the repository owner (`matheusarchitecture`).
- Approvers: the repository owner (`matheusarchitecture`).
- Privacy policy: This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. Accounts and family data stay in the project's own backend (`sparkbr.online`) only when the user signs in.

## IA

A chave da IA deve ficar apenas no **.env** do servidor. Se **OPENAI_API_KEY** estiver vazia, o endpoint informa que a IA online não está configurada; não simula uma resposta generativa.

## Estado de entrega

- [x] 23 páginas-fonte reunidas em cópia de trabalho
- [x] SDK e painel adicionados às 23 páginas
- [x] API comum de famílias, convites e registros
- [x] Sessão segura preparada para a conta existente
- [x] Conector inicial da lista do Spark Mercado para a coleção familiar (validação real pendente)
- [x] Patch de autenticação revisável com backup
- [ ] Patch aplicado e validado na VPS
- [ ] Sincronização automática de todos os dados internos dos 23 apps
- [ ] Teste visual em navegador real e dispositivos finais
- [ ] Migração para armazenamento transacional/backup de produção
- [ ] Publicação em produção e teste de restauração

Não houve alteração direta na VPS nem publicação do domínio durante este trabalho.
