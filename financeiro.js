/**
 * Renderiza a tabela de RECEITAS com base nos filtros e atualiza o total.
 * @param {string} userId O UID do usuário.
 * @param {object} filters Objeto com os filtros aplicados.
 */

/**
 * [NOVO] Função auxiliar para formatar a data de AAAA-MM-DD para DD/MM/AAAA.
 * @param {string} dateString - A data no formato AAAA-MM-DD.
 * @returns {string} - A data formatada como DD/MM/AAAA ou 'N/A' se a entrada for inválida.
 */
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


function renderRevenueTable(userId, filters = {}) {
    const db = firebase.firestore();
    const tableBody = $('#revenue-table-body');
    const totalAmountDisplay = $('.summary-card.income-card .total-amount'); // Seletor para o total
    let unsubscribe;

    tableBody.empty().append('<tr><td colspan="4">Carregando receitas...</td></tr>');
    
    let query = db.collection("receitas").where("userId", "==", userId);

    // Filtros de data no Firestore (eficiente)
    if (filters.dateFrom) query = query.where("data", ">=", filters.dateFrom);
    if (filters.dateTo) query = query.where("data", "<=", filters.dateTo);

    unsubscribe = query.onSnapshot((querySnapshot) => {
        tableBody.empty();
        let filteredData = [];
        let totalValue = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Converte o valor para número para cálculos e filtros
            const value = parseFloat(data.valor) || 0;

            // Filtros no lado do cliente (texto e valor)
            const matchesSearch = !filters.searchTerm || (data.doador || '').toLowerCase().includes(filters.searchTerm.toLowerCase());
            const matchesMinVal = !filters.minValue || value >= parseFloat(filters.minValue);
            const matchesMaxVal = !filters.maxValue || value <= parseFloat(filters.maxValue);

            if (matchesSearch && matchesMinVal && matchesMaxVal) {
                filteredData.push({ id: doc.id, data: data });
                totalValue += value;
            }
        });
        
        // Atualiza o totalizador
        totalAmountDisplay.text(`R$ ${totalValue.toFixed(2).replace('.', ',')}`);

        if (filteredData.length === 0) {
            tableBody.append('<tr><td colspan="4">Nenhuma receita encontrada com os filtros aplicados.</td></tr>');
            return;
        }

        filteredData.forEach(item => {
            const data = item.data;
			const formattedDate = formatDateToBrazilian(data.data);
            const row = `
                <tr data-id="${item.id}">
                    <td>${data.doador || 'N/A'}</td>
                    <td>R$ ${parseFloat(data.valor || 0).toFixed(2).replace('.', ',')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="btn-icon btn-edit-revenue"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete-revenue"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
    });
    return unsubscribe;
}

/**
 * Renderiza a tabela de DESPESAS com base nos filtros e atualiza o total.
 * @param {string} userId O UID do usuário.
 * @param {object} filters Objeto com os filtros aplicados.
 */
function renderExpenseTable(userId, filters = {}) {
    const db = firebase.firestore();
    const tableBody = $('#expense-table-body');
    const totalAmountDisplay = $('.summary-card.expense-card .total-amount'); // Seletor para o total
    let unsubscribe;

    tableBody.empty().append('<tr><td colspan="4">Carregando despesas...</td></tr>');
    
    let query = db.collection("despesas").where("userId", "==", userId);
    
    // Filtros no Firestore (eficiente)
    if (filters.type && filters.type !== 'todos') query = query.where("tipo", "==", filters.type);
    if (filters.dateFrom) query = query.where("data", ">=", filters.dateFrom);
    if (filters.dateTo) query = query.where("data", "<=", filters.dateTo);

    unsubscribe = query.onSnapshot((querySnapshot) => {
        tableBody.empty();
        let filteredData = [];
        let totalValue = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const value = parseFloat(data.valor) || 0;

            // Filtros no lado do cliente (valor)
            const matchesMinVal = !filters.minValue || value >= parseFloat(filters.minValue);
            const matchesMaxVal = !filters.maxValue || value <= parseFloat(filters.maxValue);

            if (matchesMinVal && matchesMaxVal) {
                filteredData.push({ id: doc.id, data: data });
                totalValue += value;
            }
        });

        totalAmountDisplay.text(`R$ ${totalValue.toFixed(2).replace('.', ',')}`);

        if (filteredData.length === 0) {
            tableBody.append('<tr><td colspan="4">Nenhuma despesa encontrada com os filtros aplicados.</td></tr>');
            return;
        }

        filteredData.forEach(item => {
            const data = item.data;
			const formattedDate = formatDateToBrazilian(data.data);
            const row = `
                <tr data-id="${item.id}">
                    <td>${data.tipo || 'N/A'}</td>
                    <td>R$ ${parseFloat(data.valor || 0).toFixed(2).replace('.', ',')}</td>
                    <td>${formattedDate}</td>
                    <td>
                        <button class="btn-icon btn-edit-expense"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-icon btn-delete-expense"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `;
            tableBody.append(row);
        });
    });
    return unsubscribe;
}

/**
 * Inicializa a página de RECEITAS.
 */
function initRevenuePage(userId) {	
    console.log("Inicializando página de Receitas...");
	const db = firebase.firestore();
	const editRevenueModal = $('#edit-revenue-modal');

    // --- Lógica dos Filtros ---
    const searchInput = $('#search-donor');
    const minValueInput = $('#min-value');
    const maxValueInput = $('#max-value');
    const dateFromInput = $('#date-from');
    const dateToInput = $('#date-to');
    const clearBtn = $('#clear-filters-btn');
    let currentUnsubscribe = null;

    function applyFilters() {
        if (currentUnsubscribe) currentUnsubscribe();
        const filters = {
            searchTerm: searchInput.val(),
            minValue: minValueInput.val(),
            maxValue: maxValueInput.val(),
            dateFrom: dateFromInput.val(),
            dateTo: dateToInput.val()
        };
        currentUnsubscribe = renderRevenueTable(userId, filters);
    }

    [searchInput, minValueInput, maxValueInput].forEach(input => {
        input.off('keyup').on('keyup', applyFilters);
    });
    [dateFromInput, dateToInput].forEach(input => {
        input.off('change').on('change', applyFilters);
    });
    clearBtn.off('click').on('click', () => {
        searchInput.val(''); minValueInput.val(''); maxValueInput.val('');
        dateFromInput.val(''); dateToInput.val('');
        applyFilters();
    });

    // --- Lógica de Edição/Exclusão (Seu código, agora integrado corretamente) ---
    $('#revenue-table-body').off('click', '.btn-edit-revenue').on('click', '.btn-edit-revenue', function() {
        const docId = $(this).closest('tr').data('id');
        db.collection("receitas").doc(docId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                $('#edit-revenue-doc-id').val(docId);
                $('#edit-revenue-donor').val(data.doador);
                $('#edit-revenue-value').val(data.valor);
                $('#edit-revenue-date').val(data.data);
                editRevenueModal.css('display', 'flex');
            }
        });
    });

    $('#revenue-table-body').off('click', '.btn-delete-revenue').on('click', '.btn-delete-revenue', function() {
        const docId = $(this).closest('tr').data('id');
        if (confirm("Tem certeza que deseja excluir esta receita?")) { 
            db.collection("receitas").doc(docId).delete();
        }
    });
	
    $('#edit-revenue-form').off('submit').on('submit', function(event) {
        event.preventDefault();
        const docId = $('#edit-revenue-doc-id').val();
        const updatedData = {
            doador: $('#edit-revenue-donor').val(),
            valor: $('#edit-revenue-value').val(),
            data: $('#edit-revenue-date').val(),
        };
        db.collection("receitas").doc(docId).update(updatedData).then(() => {
            closeEditRevenueModal();
        });
    });

    applyFilters(); // Chamada inicial para carregar a tabela
}

/**
 * Inicializa a página de DESPESAS.
 */
function initExpensePage(userId) {	
    console.log("Inicializando página de Despesas...");
	const db = firebase.firestore();	// ESTA LINHA É A CORREÇÃO PRINCIPAL
	const editExpenseModal = $('#edit-expense-modal');
	const tableBody = $('#expense-table-body');

    // --- Lógica dos Filtros (já deve estar correta) ---
    const typeFilter = $('#type-filter');
    const minValueInput = $('#min-value');
    const maxValueInput = $('#max-value');
    const dateFromInput = $('#date-from');
    const dateToInput = $('#date-to');
    const clearBtn = $('#clear-filters-btn');
    let currentUnsubscribe = null;

    function applyFilters() {
        if (currentUnsubscribe) currentUnsubscribe();
        const filters = {
            type: typeFilter.val(),
            minValue: minValueInput.val(),
            maxValue: maxValueInput.val(),
            dateFrom: dateFromInput.val(),
            dateTo: dateToInput.val()
        };
        currentUnsubscribe = renderExpenseTable(userId, filters);
    }
    
    [minValueInput, maxValueInput].forEach(input => {
        input.off('keyup').on('keyup', applyFilters);
    });
    [typeFilter, dateFromInput, dateToInput].forEach(input => {
        input.off('change').on('change', applyFilters);
    });
    clearBtn.off('click').on('click', () => {
        typeFilter.val('todos'); minValueInput.val(''); maxValueInput.val('');
        dateFromInput.val(''); dateToInput.val('');
        applyFilters();
    });
	
	
    
     // --- CORREÇÃO: Lógica de Edição/Exclusão Agrupada ---
    tableBody.off('click'); // Remove todos os listeners de clique antigos de uma vez

    // Adiciona o listener para o botão EDITAR
    tableBody.on('click', '.btn-edit-expense', function() {
        const docId = $(this).closest('tr').data('id');
        db.collection("despesas").doc(docId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                $('#edit-expense-doc-id').val(docId);
                $('#edit-expense-type').val(data.tipo);
                $('#edit-expense-value').val(data.valor);
                $('#edit-expense-date').val(data.data);
                editExpenseModal.css('display', 'flex');
            }
        });
    });
	
    // Adiciona o listener para o botão DELETAR
    tableBody.on('click', '.btn-delete-expense', function() {
        const docId = $(this).closest('tr').data('id');
        if (confirm("Tem certeza que deseja excluir esta despesa?")) { 
            db.collection("despesas").doc(docId).delete();
        }
    });

    $('#edit-expense-form').off('submit').on('submit', function(event) {
        event.preventDefault();
        const docId = $('#edit-expense-doc-id').val();
        const updatedData = {
            tipo: $('#edit-expense-type').val(), valor: $('#edit-expense-value').val(), data: $('#edit-expense-date').val(),
        };
        db.collection("despesas").doc(docId).update(updatedData).then(() => { closeEditExpenseModal(); });
    });

    applyFilters();
}

// Funções globais para fechar modais
function closeEditRevenueModal() { $('#edit-revenue-modal').css('display', 'none'); }
function closeEditExpenseModal() { $('#edit-expense-modal').css('display', 'none'); }
window.closeEditRevenueModal = closeEditRevenueModal;
window.closeEditExpenseModal = closeEditExpenseModal;

// Garante que as funções de inicialização estejam acessíveis
window.initRevenuePage = initRevenuePage;
window.initExpensePage = initExpensePage;