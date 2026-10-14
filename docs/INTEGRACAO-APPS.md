# Guia de integração dos aplicativos SparkBR

## Camada comum incluída

As 23 páginas em public-site carregam o SDK comum em /navegador/bridge/spark-bridge.js e o painel visual em /navegador/bridge/spark-family.js.

O painel reutiliza a conta principal do SparkBR. A autenticação da API depende do cookie HttpOnly sparkbr_session, emitido pelo backend existente após a aplicação e validação do patch em backend-patch/README.md.

## Coleções disponíveis

| Coleção | Aplicativos autorizados |
|---|---|
| Lista de compras | Spark Mercado, Cardápio |
| Cardápio | Cardápio, Spark Mercado |
| Tarefas da família | Família, Faxina, Escola, SparkMat, SparkPet |
| Agenda | Agenda, Escola, Família |
| Organização financeira da casa | Contas, Financeiro, Cofrinho, Energia, Posto, Bico |
| Inventário da casa | SparkMat, SparkPet, Energia, Faxina, Família |
| Cuidados com pets | SparkPet |
| Checklist escolar | Escola |
| Registros do veículo | Posto |
| Metas de hidratação | Spark Água |
| Rotina de descanso | Cantinho do Sono |
| Ideias e recados | Mural, Canal de Ideias |

A API valida o aplicativo, a coleção, a origem da requisição e o tamanho do registro. Os registros pertencem à família ativa; convites são de uso único e expiram em sete dias.

O fluxo de gravação do Spark Mercado agora chama o endpoint de sincronização em lote para atualizar a coleção familiar com a lista pessoal. A conexão depende do cookie seguro do backend e ainda precisa ser validada com duas contas reais após a publicação.

## Integração específica ainda necessária

O painel comum já está presente nas 23 páginas, mas os dados internos existentes em cada app ainda não foram todos migrados nem mapeados automaticamente. Para isso, cada fluxo real de salvar/carregar precisa ser conectado à coleção autorizada e testado quanto a conflitos, permissões, migração e modo offline.

Próximos conectores recomendados:
1. Spark Mercado e Cardápio: ingredientes e lista de compras.
2. Família, Agenda e Escola: tarefas e compromissos.
3. Contas, Financeiro, Cofrinho e Energia: lançamentos com esquema comum.
4. SparkMat e Inventário da casa: materiais e itens domésticos.
5. SparkPet e Cuidados com pets: lembretes não médicos e itens de compra.

Os aplicativos de saúde, medicamentos, exames e relacionamentos não recebem compartilhamento automático no painel. Não inclua informação sensível em notas livres; o bloqueio por nome de campo é uma camada de proteção, não uma revisão completa de privacidade.
