# Validação da versão 0.3.1

Resultado: build sem erro e 15 testes aprovados em Node 24/Linux.

1. Catálogo declarativo controla campos sem mapas tributários no motor.
2. Ausência de configuração ou perfil inválido bloqueia dados fiscais.
3. API exige autenticação; seis requisições disputam última unidade e somente uma vende; backup SQLite válido.
4. Venda calcula total/troco, baixa estoque e registra pendência fiscal.
5. Seis caixas com abertura e fechamento independentes.
6. Requisição repetida é idempotente; alteração sob mesmo ID é rejeitada.
7. Pagamento insuficiente, cartão/Pix não confirmado e preço desatualizado são rejeitados.
8. Transação revertida e cancelamento preservam estoque.
9. Operador não altera produtos ou opera caixa de outro operador.
10. Venda persiste após reabrir banco.
11. Interface compilada em jsdom: cadastro inicial, catálogo, abertura, código de barras, F2/F4/F7/F8/Ctrl+Enter, dinheiro/troco, Pix, crédito/débito, bloqueio sem confirmação, comprovante e navegação.

Correções verificadas: inicialização de rede quando o sistema não expõe interfaces; placeholders SQL; nome acessível do botão Fiscal; bloqueio de atalhos da venda enquanto comprovante está aberto.

Limitações: não houve execução do EXE Windows, teste visual em navegador, teste de carga prolongado, impressora/leitor físico, adquirente ou SEFAZ. Não há alegação de homologação ou prontidão para produção.


Regressões adicionais da versão 0.3.1:

12. Saldo correto com 1.005 vendas no turno, embora a consulta visual seja limitada a mil.
13. Consulta de confirmação não gera outra venda e respeita o operador.
14. Snapshot da configuração tributária permanece inalterado após editar a loja.
15. Migração do schema antigo preserva estoque e vendas.

O teste de interface também remove crypto.randomUUID para reproduzir o navegador em HTTP local, altera o preço durante o carrinho e simula a perda da resposta DEPOIS de gravar a venda. A consulta recupera o mesmo registro sem duplicar o estoque.
