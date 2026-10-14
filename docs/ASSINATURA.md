# Assinar o instalador do SparkBR Navegador — grátis ou pago

Sem assinatura, o Windows mostra "editor desconhecido" e o SmartScreen pode
barrar. O instalador funciona igual; a assinatura só tira o aviso.

## Opção 1 — Grátis para open-source: SignPath Foundation (recomendado)

1. Publique este projeto num repositório público (GitHub) com esta licença MIT.
2. Peça em `signpath.org` ("Apply for Free Code Signing") com a URL do repo.
3. Aprovado, configure no CI ou local:
   - `CSC_LINK` = caminho do certificado (.pfx) ou variável do SignPath
   - `CSC_KEY_PASSWORD` = senha
4. `npm run build:win` — o electron-builder assina sozinho quando `CSC_LINK` existe.

## Opção 2 — Grátis local: certificado autoassinado (aviso continua)

Gera um certificado só para testes na sua máquina:

```powershell
powershell -ExecutionPolicy Bypass -File tools\selfsign-build.ps1
```

O instalador sai assinado, mas o SmartScreen continua avisando porque a
autoridade não é reconhecida. Serve para uso próprio, não para distribuir.

## Opção 3 — Pago: certificado comercial (OV ou EV)

- OV (~US$ 100–200/ano): tira "editor desconhecido"; SmartScreen confia com o tempo.
- EV (mais caro + token físico): confiança imediata no SmartScreen.
- Com o `.pfx` em mãos: `set CSC_LINK=caminho\cert.pfx` + `set CSC_KEY_PASSWORD=***` e `npm run build:win`.

## Resposta curta

Pagar? Não precisa. Open-source com SignPath = grátis e confiável.
Autoassinado = grátis mas com aviso. Pago = só se quiser reputação imediata.
