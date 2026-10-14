# Patch da sessão segura SparkBR

## O que o patch faz

O login existente do SparkBR retorna um token que os aplicativos antigos usam. O patch mantém esse comportamento para compatibilidade e também define o cookie **sparkbr_session** com **HttpOnly**, **SameSite=Lax** e **Secure** quando a requisição é HTTPS. O leitor de autenticação existente passa a aceitar esse cookie, permitindo que a nova API do navegador valide a sessão sem ler o token no JavaScript.

O patch **não altera o banco de usuários, senhas, plano, listas nem dados dos aplicativos**. Ele altera somente a forma de transportar a sessão.

## Antes de aplicar na VPS

1. Faça backup do arquivo de servidor, do banco SQLite e da configuração do serviço.
2. Confirme qual versão do SparkMarket está em produção. Não aplique sobre uma versão diferente sem revisar o diff.
3. Copie o arquivo **patch_spark_auth_cookie.py** para a VPS.
4. Execute primeiro o modo de verificação:

~~~bash
python3 patch_spark_auth_cookie.py /opt/sparkmarket/server.py --check
~~~

5. Se a saída disser **PATCH COMPATIBLE**, aplique:

~~~bash
python3 patch_spark_auth_cookie.py /opt/sparkmarket/server.py
~~~

O script cria um backup com o sufixo **.pre-sparkbr-cookie.bak** e executa uma verificação de sintaxe. Se a compilação falhar, restaura o arquivo original.

## Reinício e teste

Identifique o nome real do serviço antes de reiniciar. Não presuma o nome:

~~~bash
systemctl list-units --type=service | grep -i spark
~~~

Após reiniciar o serviço correto, faça login com uma conta de teste no domínio HTTPS. Verifique na resposta de login se há um cabeçalho **Set-Cookie** para **sparkbr_session** com os atributos **HttpOnly**, **SameSite=Lax** e **Secure**. **Não copie nem compartilhe o valor do cookie ou do token.**

Teste também a saída da conta e confirme que o cookie é removido. O token JSON continua existindo para compatibilidade com os aplicativos antigos.

## Endpoint de perfil

A API do navegador valida o cookie chamando o endpoint de perfil do SparkBR com o token no lado do servidor. Configure **SPARK_AUTH_ME_URL** no arquivo **.env** do navegador. O endpoint público configurado como padrão (a autenticação com uma conta real ainda precisa ser testada após a publicação) é:

~~~text
https://sparkbr.online/spark-api/perfil
~~~

Se for usar um endereço interno do serviço, confirme primeiro que a mesma rota existe na versão de backend em produção. O código-fonte arquivado pode não ser idêntico ao servidor atual.

## Se a verificação falhar

Não aplique o patch se **--check** disser que o formato não é compatível. Preserve a versão atual, compare o método **_send** e a função **_me_token** da versão de produção e ajuste o patch com revisão manual. Não substitua o servidor inteiro por uma cópia de arquivo de outra data.
