# Revisão de segurança do PDV — 0.3.2

Data: 30/09/2026. Revisão do código entregue, testes automatizados e verificação do pacote. Não é pentest independente nem certificação de segurança.

## Correções aplicadas

- Operador recebe apenas suas vendas; custos, perfis tributários e configuração fiscal completa ficam restritos ao administrador. A restrição está no servidor, inclusive ao repetir ou consultar uma venda. Saldos e movimentações de outros operadores não são enviados.
- Menus administrativos deixam de aparecer para operadores. As permissões continuam sendo verificadas no servidor, mesmo se alguém tentar chamar a API diretamente.
- Sessão expira após 30 minutos sem requisições ou oito horas desde o login. Um novo login no mesmo navegador invalida seu token anterior. Logout revoga a sessão. Cookies são HttpOnly e SameSite=Strict; HTTPS acrescenta Secure.
- Acesso pela rede exige TLS 1.2 ou superior. HTTP fica restrito ao loopback. A chave e o certificado não são distribuídos no pacote.
- Origem das alterações é validada incluindo protocolo; requisições cross-site são recusadas. JSON precisa ter formato válido e corpo é limitado por bytes. Erros técnicos não expõem detalhes de SQL ou stack ao cliente.
- Verificação de senha para usuário inexistente também executa a derivação criptográfica; limite existente de oito falhas por IP por minuto permanece ativo. Senhas continuam com scrypt e salt individual.
- Electron mantém isolamento, sandbox e Node desativado na tela; permissões de navegador, novas janelas e webviews são bloqueados.

## Validação

Build TypeScript/Vite aprovado e 19 testes aprovados: vendas e troco, quatro meios de pagamento, seis caixas concorrentes, última unidade, rollback, idempotência, persistência, backup, migração, interface em jsdom, separação entre operadores, rotatividade e expiração de sessão, bloqueio de origem, payload inválido, limite de login e HTTPS com certificado validado e cookie Secure.

`npm audit --json` retornou zero vulnerabilidades conhecidas em 30/09/2026. Isso não comprova ausência de falhas desconhecidas, vulnerabilidades no sistema operacional ou segurança total.

O executável Windows e DLLs são reutilizados do runtime corrigido Electron 44.4.1 e têm hashes conferidos. O código atualizado foi reempacotado e conferido dentro do ASAR. Não foi executado em Windows neste ambiente. Impressora e leitor físico não foram testados. A interface foi testada com jsdom, não com inspeção visual de navegador.

## Como atualizar

1. No programa antigo, baixe um backup em Configurações e guarde fora da pasta do aplicativo. Resolva vendas aguardando confirmação e finalize/esvazie carrinhos em todos os terminais antes de trocar HTTP por HTTPS: os dados locais do navegador são separados por origem.
2. Feche todos os caixas e o programa servidor. Extraia a nova pasta inteira, sem copiar apenas o EXE. Não apague `%APPDATA%\Marcos Solutions Varejo`.
3. Abra `Marcos Solutions Varejo.exe` para uso local. A mesma pasta de dados é reutilizada; usuários, estoque e vendas não são recriados. Não execute versões antigas e novas ao mesmo tempo.
4. Confira produtos e uma venda de teste. A nota fiscal continua desativada; o comprovante é não fiscal.

## Configurar seis caixas em rede

Um técnico deve emitir/instalar um certificado próprio da loja, confiável em todos os computadores. O certificado deve incluir em Subject Alternative Name o IP estável do servidor e 127.0.0.1; inclua também o nome DNS usado, se houver. A chave privada deve ficar somente no servidor, em pasta com permissão limitada ao usuário que executa o PDV. Use arquivos PEM. Não envie a chave em conversas nem coloque no código.

Exemplo no Prompt de Comando, ajustando caminhos para arquivos reais:

```bat
set "PDV_TLS_CERT=C:\PDV-Certificados\servidor-cert.pem"
set "PDV_TLS_KEY=C:\PDV-Certificados\servidor-key.pem"
call "C:\PDV\Iniciar-na-rede.cmd"
```

Com o aplicativo local fechado antes desse comando, o lançador abre o servidor em HTTPS. Nos outros caixas, acesse `https://IP-DO-SERVIDOR:4780`. Não aceite certificado inválido nem desative sua verificação. As variáveis do exemplo só duram naquele Prompt; repita ao reiniciar ou peça ao técnico que configure o ambiente do usuário. A instalação de certificados, firewall e validação nos seis PCs não foi realizada por esta entrega.

Sem certificado configurado, o lançador de rede recusa iniciar; o EXE aberto normalmente continua disponível apenas no próprio computador. Não há exposição pública autorizada ou configurada.

## Limitações e próximos passos

- Não existe código “100% blindado”. JavaScript/ASAR instalado pode ser extraído. Ofuscação não impede cópia ou engenharia reversa. Não há licença vinculada a dispositivo, serviço de ativação, assinatura própria do aplicativo ou atualizador assinado nesta versão.
- Quem administra o Windows ou possui acesso aos arquivos pode ler ou alterar banco, backups e aplicação. O manifesto de hashes detecta corrupção quando comparado com uma cópia confiável; não é assinatura digital nem defesa contra adulteração por administrador local.
- Banco e backups não têm criptografia própria em repouso. Proteção do disco, conta do Windows, acesso físico e cópias externas precisam ser configurados na instalação.
- Não há MFA, recuperação/troca de senha por interface ou revogação administrativa de todos os acessos. A auditoria do SQLite pode ser alterada por quem acessa o arquivo. Limite de login é por IP, em memória, e reinicia com o servidor.
- Não há emissão NF-e/NFC-e, integração fiscal homologada, cobrança automática Pix/TEF, sincronização de caixas isolados ou garantia de disponibilidade quando servidor/rede local caem.
- Antes de comercializar como solução de produção: teste real nos seis caixas, dispositivos e restauração; integração fiscal; revisão independente de segurança; assinatura e distribuição controlada do instalador; processo de atualização e suporte.

Referências técnicas: https://www.electronjs.org/docs/latest/tutorial/security ; https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html ; https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html .
