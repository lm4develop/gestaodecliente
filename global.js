
/**
 * Função genérica para formulários que salvam dados simples no Firestore.
 */
function setupFirebaseForm(formId, collectionName, successMessage) {
    const db = firebase.firestore();
    $(document).on('submit', '#' + formId, function(e) {
        e.preventDefault();
        const form = $(this);
        const submitButton = form.find('button[type="submit"]');
        submitButton.prop('disabled', true).text('Enviando...');
        
        const formDataArray = form.serializeArray();
        const data = {};
        formDataArray.forEach(item => {
            if (item.value) { data[item.name] = item.value; }
        });
        
        data.cadastradoEm = new Date();
        data.userId = firebase.auth().currentUser.uid;

        db.collection(collectionName).add(data)
            .then(() => {
                alert(successMessage || 'Dados cadastrados com sucesso!');
                form[0].reset();
                form.find('select').val(null).trigger('change');
            })
            .catch((error) => console.error("ERRO AO SALVAR:", error))
            .finally(() => submitButton.prop('disabled', false).text('SALVAR'));
    });
    console.log("Handler genérico configurado para #" + formId);
}

// =====================================================================
// ETAPA 2: LÓGICA PRINCIPAL DA PÁGINA
// (Tudo o que precisa esperar a página carregar fica dentro deste único bloco)
// =====================================================================
$(document).ready(function() {
    console.log("Página carregada. Executando global.js.");

    // --- INICIALIZAÇÃO DO FIREBASE (Sempre a primeira tarefa) ---
    try {
		const firebaseConfig = {
		  apiKey: "AIzaSyDvrPkZGr6m7ARkLACVuS9ABJdGQC9RM0o",
		  authDomain: "gestaodeclientes-31bb6.firebaseapp.com",
		  projectId: "gestaodeclientes-31bb6",
		  storageBucket: "gestaodeclientes-31bb6.firebasestorage.app",
		  messagingSenderId: "433911548421",
		  appId: "1:433911548421:web:6a1d9e3536d887b119ea6c"
		};
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("Firebase inicializado com sucesso.");
        }
    } catch (e) {
        console.error("Erro ao inicializar Firebase:", e);
        alert("Falha na conexão com o banco de dados!");
        return; 
    }

    // --- LÓGICA DO BOTÃO DE LOGOUT (Deve vir antes do guardião) ---
    $('#logout-btn').on('click', function(event) {
        event.preventDefault();
        if (confirm("Você tem certeza que deseja sair?")) {
            firebase.auth().signOut().then(() => {
                window.location.href = 'index.html'; 
            });
        }
    });
	
 // --- TAREFA 2: GUARDIÃO DA AUTENTICAÇÃO ---
    firebase.auth().onAuthStateChanged(user => {
		const isAuthPage = window.location.pathname.includes('index.html') || window.location.pathname.includes('cadastro.html');
        if (user) {
            // O usuário ESTÁ logado.
            console.log("Usuário autenticado:", user.uid);
            window.currentUserId = user.uid;
			const ADMIN_UID = ""; 
			
			
			        // Se o usuário logado tentar acessar a página de login/cadastro, redirecione-o para a home.
        if (isAuthPage) {
            console.log("Usuário já logado na página de autenticação. Redirecionando para home...");
            window.location.href = 'home.html';
            return; // Impede a execução do resto do código
        }
						
		if (user.uid === ADMIN_UID) {
            const adminButton = document.getElementById('admin-add-sponsor-btn');
            
            // Se o botão existir nesta página, torna-o visível
            if (adminButton) {
                adminButton.style.display = 'inline-block'; // ou 'block', dependendo do seu CSS
            }
        }

            // AGORA QUE TEMOS O USUÁRIO, EXECUTAMOS AS FUNÇÕES DA PÁGINA.
            // A lógica de configuração foi movida para DENTRO deste bloco.

            // Tarefa 2.1: Configurar formulários genéricos
            
            if ($('#revenueForm').length > 0) setupFirebaseForm('revenueForm', 'receitas', 'Receita cadastrada!');
			

            if ($('#clientForm').length > 0) {
                if (typeof window.initClienteCadastroPage === 'function') {
                    window.initClienteCadastroPage(user.uid);
                }
            }
			
			
            // Tarefa 2.2: Renderizar tabelas
			
			
			// Verifica se está na página "Meus Posts"
			if ($('#my-posts-grid').length > 0) {
				if (typeof window.initMyPostsPage === 'function') {
					window.initMyPostsPage(user.uid);
				}
			}
			
			 if ($('#revenue-table-body').length > 0) { 
                if (typeof window.initRevenuePage === 'function') {
                    window.initRevenuePage(user.uid);
                }
            }
			
			
			if ($('#calendar-grid').length > 0 || $('#event-form').length > 0) { // Verifica se estamos na página da agenda
                if (typeof window.initAgendaPage === 'function') {
                    window.initAgendaPage(user.uid);
                }
            }
			if ($('#clienteForm').length > 0) { // Verifica se estamos na página de cadastro
                if (typeof window.initClienteCadastroPage === 'function') {
                    window.initClienteCadastroPage(user.uid);
                }
            }
			
			if ($('#cliente-table-body').length > 0) {
                // Em vez de chamar renderAnimalTable diretamente, chamamos a função de inicialização.
                if (typeof window.initClienteConsultaPage === 'function') {
                    window.initClienteConsultaPage(user.uid);
                }
            }
            
            // Página de Perfil do Animal
            if ($('#cliente-profile-form').length > 0 && new URLSearchParams(window.location.search).has('id')) {
                if (typeof window.initClienteProfilePage === 'function') {
                    window.initClienteProfilePage(user.uid);
                }
            }
			
			if ($('#ong-profile-form').length > 0)  {
                if (typeof window.initHomePage === 'function') {
                    window.initHomePage(user.uid);
                }
            }
			

        } else {
            // O usuário NÃO está logado. Redireciona para o login.
            console.log("Nenhum usuário logado. Redirecionando...");
            // Exclui a página de cadastro do redirecionamento para evitar loop infinito
            if (!window.location.pathname.includes('cadastro.html') && !window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });

});