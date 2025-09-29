/**
 * Renderiza a tabela de animais com base nos filtros fornecidos (EM TEMPO REAL).
 * @param {string} userId O UID do usuário atual.
 * @param {object} filters Um objeto contendo os valores dos filtros da página.
 * @returns {function} Uma função para cancelar a inscrição do listener do onSnapshot.
 */
 
 /**
 * [NOVO] Função auxiliar para formatar a data de AAAA-MM-DD para DD/MM/AAAA.
 * @param {string} dateString - A data no formato AAAA-MM-DD.
 * @returns {string} - A data formatada como DD/MM/AAAA ou 'N/A' se a entrada for inválida.
 */
 
 function populateCityStateSelect() {
    const cityStateSelect = $('#cidade-estado');
    cityStateSelect.empty().append('<option value="">Carregando cidades...</option>');

    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
        .then(response => {
            if (!response.ok) {
                throw new Error('Falha na resposta da rede ao buscar cidades.');
            }
            return response.json();
        })
        .then(data => {
            cityStateSelect.empty().append('<option></option>'); // Opção vazia para o placeholder do Select2
            
            data.forEach(municipio => {
                let textoOpcao = '';

                // --- A CORREÇÃO ESTÁ AQUI ---
                // Verifica se o município tem uma microrregião (evita o erro com Brasília/DF)
                if (municipio.microrregiao) {
                    textoOpcao = `${municipio.nome} - ${municipio.microrregiao.mesorregiao.UF.sigla}`;
                } else if (municipio.nome === "Brasília") {
                    // Caso especial para Brasília, que não tem microrregião
                    textoOpcao = `${municipio.nome} - DF`;
                } else {
                    // Fallback para outros casos inesperados
                    textoOpcao = municipio.nome;
                }
                // -------------------------
                
                const novaOpcao = new Option(textoOpcao, textoOpcao); // (texto, valor)
                cityStateSelect.append(novaOpcao);
            });

            // Inicializa o Select2 no campo de cidades
            cityStateSelect.select2({
                placeholder: "Selecione ou digite a cidade",
                allowClear: true
            });
        })
        .catch(error => {
            console.error('Erro ao carregar cidades:', error);
            cityStateSelect.html('<option value="">Erro ao carregar cidades</option>');
        });
}
 
function formatDateToBrazilian(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return 'N/A';
    }
    // A data já está no formato AAAA-MM-DD
    const parts = dateString.split('-');
    if (parts.length !== 3) {
        return dateString; // Retorna o original se não estiver no formato esperado
    }
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}
 
function renderClientTable(userId, filters = {}) { // Deixamos os filtros aqui para não quebrar a chamada
    const db = firebase.firestore();
    const tableBody = $('#client-table-body');
    
    console.log("Executando consulta SIMPLIFICADA para o userId:", userId);
    tableBody.empty().append('<tr><td colspan="5">Buscando com query simplificada...</td></tr>');

    // A ÚNICA CONDIÇÃO É O USERID
    let query = db.collection("clientes").where("userId", "==", userId);

    query.onSnapshot((querySnapshot) => {
        console.log("Snapshot recebido. Número de documentos:", querySnapshot.size);
        tableBody.empty();

        if (querySnapshot.empty) {
            console.log("Nenhum documento encontrado para este usuário.");
            tableBody.append('<tr><td colspan="5">Nenhum cliente encontrado.</td></tr>');
            return;
        }

        querySnapshot.forEach(doc => {
            const data = doc.data();
            console.log("Cliente encontrado:", data.nome);
            const perfilUrl = `clientes-perfil.html?id=${doc.id}`;
            const row = `
                <tr data-id="${doc.id}">
                    <td>${data.nome || 'N/A'}</td>
                    <td>${data.cpf || 'N/A'}</td>
                    <td>${data.sexo || 'N/A'}</td>
                    <td>${data.fone || 'N/A'}</td>
                    <td><a href="${perfilUrl}" class="btn-primary-small">Abrir Perfil</a></td>
                </tr>
            `;
            tableBody.append(row);
        });

    }, (error) => {
        // Se houver um erro de permissão ou outro, ele aparecerá aqui
        console.error("ERRO NO SNAPSHOT:", error);
        tableBody.empty().append('<tr><td colspan="5">Erro ao buscar dados. Verifique o console.</td></tr>');
    });

    // Não precisamos retornar o 'unsubscribe' para este teste
}


/**
 * Inicializa a lógica da página de CONSULTA de animais (EM TEMPO REAL).
 * @param {string} userId O UID do usuário.
 */
function initClienteConsultaPage(userId) {
    console.log("Inicializando a página de consulta de clientes para o usuário:", userId);

    // Referências aos elementos do formulário de filtro
    const searchInput = $('#search');
    const dateFromInput = $('#date-from');
    const dateToInput = $('#date-to');
    const genderFilter = $('#filter-gender');
    const clearBtn = $('#clear-animal-filters-btn');

    let currentUnsubscribe = null;

    // Função que coleta todos os valores dos filtros e chama a renderização
    function applyFilters() {
        if (currentUnsubscribe) {
            currentUnsubscribe(); // Para de ouvir a query antiga antes de criar uma nova
        }
        const filters = {
            searchTerm: searchInput.val(),
            dateFrom: dateFromInput.val(),
            dateTo: dateToInput.val(),
            gender: genderFilter.val(),

        };
        currentUnsubscribe = renderClientTable(userId, filters);
    }

    // NOVO: Listeners para cada filtro para atualização em tempo real
    searchInput.off('keyup').on('keyup', applyFilters);

    const selectAndDateFilters = [
        dateFromInput, dateToInput, genderFilter
    ];
    selectAndDateFilters.forEach(element => {
        element.off('change').on('change', applyFilters);
    });

    // Listener para o botão LIMPAR FILTROS
    clearBtn.off('click').on('click', function() {
        searchInput.val('');
        dateFromInput.val('');
        dateToInput.val('');
        genderFilter.val('todos');
        applyFilters();
    });

    // Chama a função uma vez na inicialização para carregar todos os animais
    applyFilters();
}

function calculateAge(birthdateString) {
    if (!birthdateString) return '';
    
    const birthDate = new Date(birthdateString);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();

    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
        months += 12;
    }

    if (years === 0 && months === 0) return 'Menos de 1 mês';
    
    let ageString = '';
    if (years > 0) {
        ageString += `${years} ${years > 1 ? 'anos' : 'ano'}`;
    }
    if (months > 0) {
        if (years > 0) ageString += ' e ';
        ageString += `${months} ${months > 1 ? 'meses' : 'mês'}`;
    }
    
    return ageString;
}


// --- FUNÇÃO DE INICIALIZAÇÃO PARA A PÁGINA DE CADASTRO DE ANIMAIS ---
function initClienteCadastroPage(userId) {
    console.log("Inicializando a página de cadastro de clientes para o usuário:", userId);

    const clienteForm = $('#clientForm'); // ID CORRETO do formulário
    const db = firebase.firestore();
    const birthdateInput = $('#client-birthdate'); // CORRIGIDO: ID do campo de data de nascimento
    const ageInput = $('#client-age'); // CORRIGIDO: ID do campo de idade
	
	populateCityStateSelect();
	
	$('#client-fone').mask('(00) 00000-0000');
	$('#client-cpf').mask('000.000.000-00');
	

    // Listener que é acionado sempre que a data de aniversário é alterada
    birthdateInput.on('change', function() {
        const birthdate = $(this).val();
        const age = calculateAge(birthdate); // Usa a sua função `calculateAge` que já existe
        ageInput.val(age);
    });

    // Lógica do Botão de Limpar
    const resetButton = clienteForm.find('button[type="reset"]');
    resetButton.on('click', function() {
        // Usamos um pequeno timeout para garantir que o reset do formulário ocorra antes de limparmos o campo de idade
        setTimeout(() => {
            ageInput.val('Calculando...');
        }, 1);
    });

    // Lógica de envio do formulário
    clienteForm.off('submit').on('submit', function(event) {
        event.preventDefault();

        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true).text('SALVANDO...');

        // Coleta de dados do formulário com os IDs CORRETOS
        const clienteData = {
            nome: $('#client-name').val(),
            cpf: $('#client-cpf').val(),
            email: $('#client-email').val(),
            senha: $('#client-password').val(), // ATENÇÃO: Salvar senhas em texto plano no Firestore não é seguro. Use o Firebase Auth para criar usuários.
            fone: $('#client-fone').val(),
            sexo: $('#client-gender').val(),
            aniversario: $('#client-birthdate').val(),
            idade: $('#client-age').val(),
            endereco: $('#client-location').val(),
            cidadeEstado: $('#cidade-estado').val(),
            observacao: $('#client-notes').val(),
            userId: userId, // ID do usuário logado (dono do cadastro)
            cadastradoEm: new Date()
        };

        db.collection("clientes").add(clienteData)
            .then(() => {
                alert("Cliente cadastrado com sucesso!");
                clienteForm.reset();
                ageInput.val('Calculando...'); // Limpa o campo de idade visualmente
            })
            .catch(error => {
                console.error("Erro ao cadastrar cliente:", error);
                alert("Ocorreu um erro ao salvar. Verifique o console.");
            })
            .finally(() => {
                submitButton.prop('disabled', false).text('SALVAR CADASTRO');
            });
    });

    console.log("Lógica de cadastro de cliente configurada com sucesso.");
}


// --- FUNÇÃO DE INICIALIZAÇÃO PARA A PÁGINA DE PERFIL DE ANIMAIS ---
function initClienteProfilePage(userId) {
    console.log("Inicializando a página de perfil do cliente...");

    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = urlParams.get('id');
    if (!clienteId) {
        $('main.main-content').html('<h1>Erro: ID do cliente não encontrado.</h1>');
        return;
    }

    // --- Referências aos Elementos ---
    const db = firebase.firestore();
    const clienteDocRef = db.collection("clientes").doc(clienteId);

    const pageHeader = $('.page-header h1');
    const profileForm = $('#client-profile-form');
   
    
    // Seleciona todos os inputs, exceto o de upload de arquivo
    const allTextInputs = profileForm.find('input, select, textarea').not(photoUploadInput);
    
    const birthdateInput = $('#client-birthdate');
    const ageInput = $('#client-age');
    const editBtn = $('#edit-client-btn');
    const saveBtn = $('#save-client-btn');
    const cancelBtn = $('#cancel-client-btn');
    const deleteBtn = $('#delete-client-btn');
    
    let originalValues = {};

	
	    // --- LÓGICA DO CÁLCULO DE IDADE ---
    birthdateInput.on('change', function() {
        const birthdate = $(this).val();
        const age = calculateAge(birthdate);
        ageInput.val(age);
    });

    // Carrega os dados do animal
    clienteDocRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            pageHeader.html(`<i class="fa fa-users"></i> Perfil do Cliente: ${data.nome}`);
            
            
            // Preenche os campos do formulário
            $('#client-name').val(data.nome);
			$('#client-cpf').val(data.cpf);
			$('#client-email').val(data.cpf);
			$('#client-fone').val(data.cpf);
			$('#cidade-estado').val(data.cpf);
            $('#arrival-date').val(data.dataNasc);
            birthdateInput.val(data.aniversario); // Preenche o campo de aniversário
            ageInput.val(data.idade); 
            $('#client-gender').val(data.sexo);
            $('#client-location').val(data.endereco); // Correção: era 'endereco'
            $('#client-notes').val(data.observacao);

            allTextInputs.each(function() {
                originalValues[$(this).attr('id')] = $(this).val();
            });
        }
    });

  // --- LÓGICA DE EDIÇÃO IN-LOCO ---
    function setEditable(isEditable) {
        // Habilita/desabilita todos os campos de texto, select, etc.
        allTextInputs.not('#client-age').prop('disabled', !isEditable);
  


        // Alterna a visibilidade dos botões de ação
        editBtn.toggle(!isEditable);
        deleteBtn.toggle(!isEditable);
        saveBtn.toggle(isEditable);
        cancelBtn.toggle(isEditable);
    }
    setEditable(false);

    editBtn.on('click', () => setEditable(true));
    
    cancelBtn.on('click', () => {
        allTextInputs.each(function() { $(this).val(originalValues[$(this).attr('id')]); });
        setEditable(false);
    });

    // Lógica para salvar as alterações (ATUALIZADA PARA INCLUIR A FOTO)
    profileForm.on('submit', (e) => {
        e.preventDefault();
        saveBtn.prop('disabled', true).text('SALVANDO...');
        
        const newPhotoFile = photoUploadInput[0].files[0];

        // Função para atualizar o Firestore
        const updateFirestore = (newPhotoUrl = null) => {
            const formData = new FormData(profileForm[0]);
            const updatedData = Object.fromEntries(formData.entries());
            delete updatedData.foto;


            clienteDocRef.update(updatedData)
                .then(() => {
                    alert("Perfil do cliente atualizado!");
                    if (newPhotoUrl) {
                        originalPhotoSrc = newPhotoUrl;
                    }
                    pageHeader.html(`<i class="fa fa-users"></i> Perfil do Cliente: ${updatedData.nome}`);
                    allTextInputs.each(function() { originalValues[$(this).attr('id')] = $(this).val(); });
                    setEditable(false);
                })
                .catch(error => console.error("Erro ao atualizar:", error))
                .finally(() => saveBtn.prop('disabled', false).text('SALVAR ALTERAÇÕES'));
        };

        // Se uma nova foto foi escolhida, faz o upload primeiro
        
	
	 // --- Lógica para o botão DELETAR (NOVO) ---
		deleteBtn.on('click', function() {
			if (confirm("Tem certeza que deseja EXCLUIR PERMANENTEMENTE este perfil de animal? Esta ação não pode ser desfeita.")) {
				clienteDocRef.delete()
					.then(() => {
						alert("Perfil do animal excluído com sucesso!");
						// Redireciona para a página de consulta de animais após a exclusão
						window.location.href = 'animais-cadastro.html'; // Ou 'animais-consulta.html' se for sua página de lista
					})
					.catch(error => {
						console.error("Erro ao excluir animal:", error);
						alert("Ocorreu um erro ao excluir o perfil do animal.");
					});
			}
		});
    
    setEditable(false); // Garante que comece desabilitado
    console.log("Lógica do perfil do animal configurada.");
});

}

// --- Torna as funções de inicialização e renderização acessíveis globalmente ---
//window.renderAnimalTable = renderAnimalTable; // Usada na página de consulta
window.initClienteConsultaPage = initClienteConsultaPage;
window.initClienteCadastroPage = initClienteCadastroPage; // Usada na página de cadastro
window.initClienteProfilePage = initClienteProfilePage; // Usada na página de perfil