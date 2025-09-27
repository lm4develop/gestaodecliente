// --- CONTROLE DOS MODAIS ---
// (Esta seção continua a mesma, não precisa alterar)
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const aboutModal = document.getElementById('about-modal');

function openModal(modalElement) {
    if (modalElement) modalElement.style.display = 'flex';
}

function closeModal() {
    if (forgotPasswordModal) forgotPasswordModal.style.display = 'none';
    if (aboutModal) aboutModal.style.display = 'none';
}

function openForgotPasswordModal() {
    openModal(forgotPasswordModal);
}

function openAboutModal() {
    openModal(aboutModal);
}

window.onclick = function(event) {
    if (event.target == forgotPasswordModal || event.target == aboutModal) {
        closeModal();
    }
}

// Expondo as funções para o HTML poder chamá-las através do "onclick"
//window.openForgotPasswordModal = () => openModal(forgotPasswordModal);
//window.openAboutModal = () => openModal(aboutModal);
//window.closeModal = closeModal;

$(document).ready(function() {
    console.log("Documento pronto. Lógica de login iniciada.");

    // Assumimos que o global.js já inicializou o Firebase.
    if (typeof firebase === 'undefined') {
        console.error("ERRO CRÍTICO: Firebase não foi carregado. Verifique a ordem dos scripts no HTML.");
        $('#error-message').text('Erro de conexão. Tente novamente mais tarde.');
        $('button[type="submit"]').prop('disabled', true);
        return;
    }

	const auth = firebase.auth();


    // --- LÓGICA DE LOGIN ---
    const loginForm = $('#login-form');
    const errorMessage = $('#error-message');

    if (loginForm.length > 0) {
        loginForm.on('submit', function(event) {
            event.preventDefault(); // Impede o recarregamento da página

            const email = $('#email').val();
            const password = $('#password').val();
            const submitButton = $(this).find('button[type="submit"]');

            errorMessage.text('');
            submitButton.prop('disabled', true).text('LOGANDO...');

            const auth = firebase.auth();

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
					console.log("Login bem-sucedido para:", userCredential.user.email);
					window.location.href = 'home.html'; // Redireciona para a página principal
                })
                .catch((error) => {
                    console.error("FALHA no login:", error);
                    // Traduzindo os erros mais comuns do Firebase para o usuário
                    errorMessage.text('E-mail ou senha inválidos.');
                })
                .finally(() => {
                    submitButton.prop('disabled', false).text('LOGAR');
                });
        });
    }
	
	const forgotPasswordForm = $('#forgot-password-modal .modal-form');
    
    if (forgotPasswordForm.length > 0) {
        forgotPasswordForm.on('submit', function(event) {
            event.preventDefault(); // Impede o recarregamento da página
            
            const recoveryEmail = $('#recovery-email').val().trim();
            const submitButton = $(this).find('button[type="submit"]');

            if (!recoveryEmail) {
                alert("Por favor, insira seu endereço de e-mail.");
                return;
            }

            submitButton.prop('disabled', true).text('ENVIANDO...');

            auth.sendPasswordResetEmail(recoveryEmail)
                .then(() => {
                    // Sucesso no envio
                    alert("Link de redefinição de senha enviado com sucesso para " + recoveryEmail + ". Verifique sua caixa de entrada e spam.");
                    closeModal(); // Fecha o modal
                })
                .catch((error) => {
                    // Erro no envio
                    console.error("Erro ao enviar e-mail de redefinição:", error);
                    if (error.code === 'auth/user-not-found') {
                        alert("Nenhuma conta encontrada com este endereço de e-mail.");
                    } else if (error.code === 'auth/invalid-email') {
                        alert("O endereço de e-mail fornecido não é válido.");
                    } else {
                        alert("Ocorreu um erro ao tentar enviar o e-mail. Tente novamente.");
                    }
                })
                .finally(() => {
                    submitButton.prop('disabled', false).text('ENVIAR LINK');
                });
        });
    }
});
	
	
