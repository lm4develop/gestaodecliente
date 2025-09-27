
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
    // --- CORREÇÃO APLICADA AQUI ---
    // Pega o caminho da URL (ex: "/pasta/clientes-cadastro.html")
    const pathParts = window.location.pathname.split('/');
    // Pega a última parte, que é o nome do arquivo (ex: "clientes-cadastro.html")
    const currentPage = pathParts.pop() || pathParts.pop(); // O '||' lida com casos de ter uma barra '/' no final

    // A verificação agora é exata, não apenas um 'includes'
    const isAuthPage = currentPage === 'index.html' || currentPage === 'cadastro.html';
    // -----------------------------

    if (user) {
        // --- USUÁRIO ESTÁ LOGADO ---
        console.log("Usuário autenticado:", user.uid);
        window.currentUserId = user.uid;

        // Esta lógica agora funcionará corretamente
        if (isAuthPage) {
            console.log("Usuário já logado na página de autenticação. Redirecionando para home...");
            window.location.href = 'home.html';
            return;
        }

        // --- INICIALIZAÇÃO DA PÁGINA ATUAL ---
        // (O resto do seu código de inicialização de página permanece o mesmo)
        if ($('#clientForm').length > 0 && typeof window.initClienteCadastroPage === 'function') {
            console.log("Executando initClienteCadastroPage...");
            window.initClienteCadastroPage(user.uid);

        } else if ($('#cliente-table-body').length > 0 && typeof window.initClienteConsultaPage === 'function') {
            console.log("Executando initClienteConsultaPage...");
            window.initClienteConsultaPage(user.uid);

        } else if ($('#cliente-profile-form').length > 0 && typeof window.initClienteProfilePage === 'function') {
            console.log("Executando initClienteProfilePage...");
            window.initClienteProfilePage(user.uid);
        
        } else if ($('#ong-profile-form').length > 0 && typeof window.initHomePage === 'function') {
            console.log("Executando initHomePage...");
            window.initHomePage(user.uid);
        }

    } else {
        // --- USUÁRIO NÃO ESTÁ LOGADO ---
        console.log("Nenhum usuário logado.");

        if (!isAuthPage) {
            console.log("Acesso a página protegida sem login. Redirecionando para index.html...");
            window.location.href = 'index.html';
        }
    }
});

});