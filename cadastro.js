	  
// cadastro-ong.js (Com a correção para o caso de Brasília/DF)

/**
 * Carrega a lista de cidades e estados da API do IBGE e inicializa o Select2.
 */
async function carregarCidadesE_Estados() {
    const cidadeEstadoSelect = $('#cidade-estado');
    try {
        const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome');
        const municipios = await response.json();
        
        cidadeEstadoSelect.empty().append(new Option('', '')); 

        // Adiciona cada município como uma nova opção no select
        municipios.forEach(municipio => {
            let textoOpcao = '';

            // --- A CORREÇÃO ESTÁ AQUI ---
            // Verifica se o município tem uma microrregião (evita o erro com Brasília/DF)
            if (municipio.microrregiao) {
                textoOpcao = `${municipio.nome} - ${municipio.microrregiao.mesorregiao.UF.sigla}`;
            } else {
                // Caso especial para municípios sem microrregião, como Brasília
                textoOpcao = `${municipio.nome} - DF`;
            }
            // -------------------------
            
            const novaOpcao = new Option(textoOpcao, textoOpcao);
            cidadeEstadoSelect.append(novaOpcao);
        });

        // Inicializa o Select2 no campo
        cidadeEstadoSelect.select2({
            placeholder: "Selecione ou digite sua cidade",
            allowClear: true
        });
        
        console.log("Cidades e estados carregados com sucesso.");
    } catch (error) {
        console.error('ERRO CRÍTICO ao carregar cidades:', error);
        cidadeEstadoSelect.html('<option value="">Erro ao carregar</-option>');
    }
}

// Executa o código quando o documento HTML estiver totalmente carregado
$(document).ready(function() {
    // A única coisa que este script faz é chamar a função para carregar as cidades.
    carregarCidadesE_Estados();
});


// AQUI COMEÇA O BANCO DE DADOS

// --- TAREFA: CONFIGURAR FORMULÁRIO DE CADASTRO DE USUÁRIO ---



	  
// --- TAREFA: CONFIGURAR FORMULÁRIO DE CADASTRO DE USUÁRIO ---
if ($('#register-form').length > 0) {
    const registerForm = $('#register-form');
    const registerErrorMessage = $('#register-error-message');
	const ongPhoneInput = $('#ong-phone');
    const ongCnpjInput = $('#ong-cnpj');
	const documentoInput = $('#documento'); // Novo campo de documento
    const documentoLabel = $('#documento-label'); // Label do novo campo
    const tipoPessoaRadios = $('input[name="tipoPessoa"]');
	
	// Aplica a máscara ao campo de telefone no formulário de CADASTRO
	$('#ong-phone').mask('(00) 00000-0000');
		
	// Função para atualizar o campo de documento (CPF/CNPJ)
    function updateDocumentoField() {
        const tipoSelecionado = $('input[name="tipoPessoa"]:checked').val();
        
        documentoInput.unmask(); // Remove a máscara antiga antes de aplicar a nova
        
        if (tipoSelecionado === 'pf') {
            documentoLabel.text('CPF');
            documentoInput.attr('placeholder', '000.000.000-00');
            documentoInput.mask('000.000.000-00', {reverse: true});
        } else { // 'pj'
            documentoLabel.text('CNPJ');
            documentoInput.attr('placeholder', '00.000.000/0000-00');
            documentoInput.mask('00.000.000/0000-00', {reverse: true});
        }
        documentoInput.val(''); // Limpa o campo ao trocar
    }

    // Listener que aciona a troca sempre que um rádio é clicado
    tipoPessoaRadios.on('change', updateDocumentoField);

    // Chama a função uma vez no início para configurar o campo para o padrão (CPF)
    updateDocumentoField();


    registerForm.on('submit', function(event) {
        event.preventDefault();
        
        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true).text('CRIANDO CONTA...');

        const password = $('#ong-password').val();
        const confirmPassword = $('#ong-confirm-password').val();
        if (password !== confirmPassword) {
            registerErrorMessage.text('As senhas não coincidem.');
            submitButton.prop('disabled', false).text('CRIAR CONTA');
            return;
        }
		
		
		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

		if (!passwordRegex.test(password)) {
			// Se a senha não passar no teste do Regex, exibe a mensagem de erro
			registerErrorMessage.html(
				"A senha não é forte o suficiente.<br>" +
				"Ela deve conter no mínimo:<br>" +
				"- 8 caracteres<br>" +
				"- 1 letra maiúscula<br>" +
				"- 1 letra minúscula<br>" +
				"- 1 número<br>" +
				"- 1 símbolo (ex: @, $, !, %, *, ?, &)"
			);
			submitButton.prop('disabled', false).text('CRIAR CONTA');
			return; // Impede o envio do formulário
		}
		
		
        registerErrorMessage.text('');
		
		
		
		

        const email = $('#ong-email').val();
        
        const ongData = {
            nome: $('#ong-name').val(),
            tipoPessoa: $('input[name="tipoPessoa"]:checked').val(), 
            documento: documentoInput.cleanVal(),
            endereco: $('#ong-address').val(),
            cidadeEstado: $('#cidade-estado').val(),
            telefone: $('#ong-phone').val(),
            email: email,
            dataCadastro: new Date(),
            fotoUrl: null,
            vagasCaes: 0,
            vagasGatos: 0
        };

        const auth = firebase.auth();
        const db = firebase.firestore();
		


        // --- CADEIA DE PROMESSAS CORRIGIDA ---
		 auth.createUserWithEmailAndPassword(ongData.email, password) // Usa a variável password
				.then(userCredential => {
					return db.collection("ongs").doc(userCredential.user.uid).set(ongData);
				})
				.then(() => {
					alert('Conta criada com sucesso! Você será redirecionado para o login.');
					window.location.href = 'index.html';
				})
				.catch(error => {
					if (error.code === 'auth/email-already-in-use') {
						registerErrorMessage.text('Este e-mail já está em uso.');
					} 
					// A validação do Firebase para senha fraca não é mais necessária,
					// pois a nossa é mais forte, mas podemos manter por segurança.
					else if (error.code === 'auth/weak-password') {
						registerErrorMessage.text('A senha é muito fraca (verificado pelo servidor).');
					} else {
						registerErrorMessage.text('Ocorreu um erro ao criar a conta.');
					}
					console.error("Erro ao criar conta:", error);
				})
				.finally(() => {
					submitButton.prop('disabled', false).text('CRIAR CONTA');
				});
		});

    console.log("Handler de CADASTRO DE USUÁRIO configurado.");

} // << Fim do if ($('#register-form').length > 0)
	
