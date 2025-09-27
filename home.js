/**
 * Inicializa a lógica específica da página Home (Perfil da ONG).
 * Esta função é responsável por carregar os dados do perfil da ONG,
 * configurar a edição, salvar as alterações e gerenciar a troca de e-mail.
 * @param {string} userId O UID do usuário atualmente logado.
 */
function initHomePage(userId) {
    console.log("Inicializando a página Home/Perfil para o usuário:", userId);

    if (!userId) {
        console.error("UserID não fornecido para initHomePage.");
        return;
    }

    const db = firebase.firestore();
	const storage = firebase.storage();
    const auth = firebase.auth();

    // --- Referências aos Elementos ---
    const profileForm = $('#ong-profile-form');
    const editBtn = $('#edit-btn');
    const saveBtn = $('#save-btn');
    const cancelBtn = $('#cancel-btn');

    // Referências aos campos do formulário
	const ongImagePreview = $('#ong-image');
    const ongImageUploadInput = $('#ong-image-upload');
    const ongImageUploadLabel = $('label[for="ong-image-upload"]');
	
    const ongPhoneInput = $('#ong-phone');
    const documentoDisplayInput = $('#ong-documento');
    const documentoDisplayLabel = $('#documento-label-display');
    const ongEmailDisplay = $('#ong-email-display');
	
	const occupiedDogsCount = $('#occupied-dogs');
    const occupiedCatsCount = $('#occupied-cats');
	 
	
    // CORREÇÃO: Adiciona o campo de documento à lista de campos editáveis
    const editableInputs = $('#ong-name, #ong-address, #ong-city-state, #ong-phone, #ong-documento, #total-dogs-capacity, #total-cats-capacity');


	async function loadFinancialCharts() {
        const db = firebase.firestore();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]; // Formato AAAA-MM-DD

        // Nomes dos meses para os labels do gráfico
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        
        try {
            // 1. Buscar os dados de receitas e despesas em paralelo
            const [revenuesSnapshot, expensesSnapshot] = await Promise.all([
                db.collection("receitas")
                  .where("userId", "==", userId)
                  .where("data", ">=", sixMonthsAgoStr)
                  .get(),
                db.collection("despesas")
                  .where("userId", "==", userId)
                  .where("data", ">=", sixMonthsAgoStr)
                  .get()
            ]);

            // 2. Processar e agrupar os dados por mês
            const monthlyData = {};
            for (let i = 0; i < 6; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`; // Ex: "2024-7"
                monthlyData[monthKey] = {
                    label: monthNames[date.getMonth()],
                    revenue: 0,
                    expense: 0
                };
            }

            revenuesSnapshot.forEach(doc => {
                const data = doc.data();
                const date = new Date(data.data);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].revenue += parseFloat(data.valor) || 0;
                }
            });

            expensesSnapshot.forEach(doc => {
                const data = doc.data();
                const date = new Date(data.data);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].expense += parseFloat(data.valor) || 0;
                }
            });
            
            // Reverte a ordem para exibir do mais antigo para o mais recente
            const sortedMonthlyData = Object.values(monthlyData).reverse();

            // 3. Calcular o valor máximo para a escala do gráfico
            let maxRevenue = 0;
            let maxExpense = 0;
            sortedMonthlyData.forEach(data => {
                if (data.revenue > maxRevenue) maxRevenue = data.revenue;
                if (data.expense > maxExpense) maxExpense = data.expense;
            });
            
            // 4. Renderizar os gráficos
            renderChart($('#revenue-chart-container'), sortedMonthlyData, 'revenue', maxRevenue);
            renderChart($('#expense-chart-container'), sortedMonthlyData, 'expense', maxExpense);
            
        } catch (error) {
            console.error("Erro ao carregar dados dos gráficos financeiros:", error);
        }
    }

    /**
     * Função auxiliar para desenhar as barras de um gráfico.
     * @param {jQuery} container - O elemento jQuery onde o gráfico será renderizado.
     * @param {Array} data - A lista de dados mensais.
     * @param {string} type - 'revenue' ou 'expense'.
     * @param {number} maxValue - O valor máximo para calcular a altura da barra.
     */
    function renderChart(container, data, type, maxValue) {
        container.empty(); // Limpa as barras de exemplo

        if (maxValue === 0) { // Se não houver dados, exibe uma mensagem
            container.html('<p class="no-data-message">Sem dados para exibir nos últimos 6 meses.</p>');
            return;
        }

        data.forEach(monthData => {
            const value = monthData[type];
            // Calcula a altura da barra como uma porcentagem do valor máximo
            const heightPercentage = (value / maxValue) * 100;
            
            // Formata o valor para exibição (ex: R$ 1.2k)
            const displayValue = value > 999 
                ? `R$${(value / 1000).toFixed(1).replace('.', ',')}k` 
                : `R$${value.toFixed(0)}`;
            
            const barHtml = `
                <div class="bar ${type === 'revenue' ? 'income' : 'expense'}" style="height: ${heightPercentage}%;">
                    <span class="label">${monthData.label}</span>
                    <span class="value">${displayValue}</span>
                </div>
            `;
            container.append(barHtml);
        });
    }







    let originalValues = {};
	let originalPhotoSrc = ongImagePreview.attr('src');

	function listenToAnimalCounts() {
			db.collection("animais")
			  .where("userId", "==", userId)
			  .where("status", "!=", "adotado")
			  .onSnapshot((querySnapshot) => {
				  let dogCount = 0;
				  let catCount = 0;

				  querySnapshot.forEach((doc) => {
					  const animal = doc.data();
					  if (animal.especie === 'cachorro') {
						  dogCount++;
					  } else if (animal.especie === 'gato') {
						  catCount++;
					  }
				  });

				  // Atualiza os números nos cards da Home
				  occupiedDogsCount.text(dogCount);
				  occupiedCatsCount.text(catCount);
				  
				  console.log(`Vagas ocupadas atualizadas: ${dogCount} cães, ${catCount} gatos.`);

			  }, (error) => {
				  console.error("Erro ao ouvir contagem de animais:", error);
				  occupiedDogsCount.text('?');
				  occupiedCatsCount.text('?');
			  });
		}
		
		
		function listenToSuppliesStatus() {
        const db = firebase.firestore();
        const suppliesList = $('#supplies-list-container'); // Usaremos um ID no container

        // Ouve todas as mudanças na coleção de suprimentos do usuário
        db.collection("suprimentos")
          .where("userId", "==", userId)
          .orderBy("produto") // Ordena por nome do produto
          .onSnapshot((querySnapshot) => {
              suppliesList.empty(); // Limpa a lista de exemplo

              if (querySnapshot.empty) {
                  suppliesList.html('<li><span>Nenhum suprimento cadastrado.</span></li>');
                  return;
              }

              querySnapshot.forEach((doc) => {
                  const supply = doc.data();
                  
                  // Mapeia o valor do status para a classe CSS e o texto
                  let statusClass = '';
                  let statusText = '';
                  switch (supply.statusEstoque) {
                      case 'completo':
                          statusClass = 'status-full';
                          statusText = 'Completo';
                          break;
                      case 'metade':
                          statusClass = 'status-half';
                          statusText = 'Na Metade';
                          break;
                      case 'acabando':
                          statusClass = 'status-ending';
                          statusText = 'Acabando';
                          break;
                      default:
                          statusClass = '';
                          statusText = supply.statusEstoque || 'N/A';
                          break;
                  }

                  const listItemHtml = `
                      <li>
                          <span>${supply.produto || 'N/A'}</span>
                          <span class="status-tag ${statusClass}">${statusText}</span>
                      </li>
                  `;
                  
                  suppliesList.append(listItemHtml);
              });

          }, (error) => {
              console.error("Erro ao carregar relatório de suprimentos:", error);
              suppliesList.html('<li><span>Erro ao carregar dados.</span></li>');
          });
    }
	
	
	 function listenToUpcomingEvents() {
        const db = firebase.firestore();
        const agendaList = $('#upcoming-events-list'); // Usaremos um ID no container

        // Define o intervalo de datas para a semana atual (de hoje até 7 dias pra frente)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Começo do dia de hoje
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999); // Fim do dia, 7 dias a partir de hoje

        // Converte para o formato Timestamp do Firebase
        const startTimestamp = firebase.firestore.Timestamp.fromDate(today);
        const endTimestamp = firebase.firestore.Timestamp.fromDate(nextWeek);

        db.collection("agenda")
          .where("userId", "==", userId)
          .where("startDate", ">=", startTimestamp)
          .where("startDate", "<=", endTimestamp)
          .orderBy("startDate") // Ordena os eventos por data de início
          .onSnapshot((querySnapshot) => {
              agendaList.empty(); // Limpa a lista de exemplo

              if (querySnapshot.empty) {
                  agendaList.html('<li class="agenda-item-empty"><span>Nenhum compromisso para os próximos 7 dias.</span></li>');
                  return;
              }

              querySnapshot.forEach((doc) => {
                  const event = doc.data();
                  
                  // Formata a data e hora do evento
                  const eventDate = event.startDate.toDate();
                  const day = String(eventDate.getDate()).padStart(2, '0');
                  const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                  const hours = String(eventDate.getHours()).padStart(2, '0');
                  const minutes = String(eventDate.getMinutes()).padStart(2, '0');
                  
                  const displayTime = `${day}/${month} - ${hours}:${minutes}`;

                  const listItemHtml = `
                      <li class="agenda-item">
                          <div class="agenda-time">${displayTime}</div>
                          <div class="agenda-details">
                              <strong>${event.titulo || 'Sem título'}</strong>
                              <span>Responsável: ${event.responsavel || 'N/A'}</span>
                          </div>
                      </li>
                  `;
                  
                  agendaList.append(listItemHtml);
              });

          }, (error) => {
              console.error("Erro ao carregar próximos compromissos:", error);
              agendaList.html('<li class="agenda-item-empty"><span>Erro ao carregar compromissos.</span></li>');
          });
    }
	
	
	


	// --- Lógica de Pré-visualização da Nova Foto ---
		ongImageUploadInput.on('change', function(event) {
			const file = event.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = function(e) {
					ongImagePreview.attr('src', e.target.result);
				}
				reader.readAsDataURL(file);
			}
		});


    // --- Aplicação das Máscaras ---
    ongPhoneInput.mask('(00) 00000-0000');

    /**
     * Carrega os dados da ONG do Firestore e preenche o formulário.
     */
     function loadOngProfileData() {
        db.collection("ongs").doc(userId).get().then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                const photoUrl = data.fotoUrl || 'fotopet.png'; // Sua imagem placeholder

                ongImagePreview.attr('src', photoUrl);
                originalPhotoSrc = photoUrl;

                $('#ong-name').val(data.nome || '');
                $('#ong-address').val(data.endereco || '');
				$('#ong-city-state').val(data.cidadeEstado || ''); 
                ongPhoneInput.val(data.telefone || '');
                ongEmailDisplay.text(data.email || 'N/A');
                $('#total-dogs-capacity').val(data.vagasCaes || 0);
                $('#total-cats-capacity').val(data.vagasGatos || 0);

                documentoDisplayInput.unmask();
                if (data.tipoPessoa === 'pf') {
                    documentoDisplayLabel.text('CPF');
                    documentoDisplayInput.mask('000.000.000-00', {reverse: true});
                } else {
                    documentoDisplayLabel.text('CNPJ');
                    documentoDisplayInput.mask('00.000.000/0000-00', {reverse: true});
                }
                documentoDisplayInput.val(data.documento || '');
                
                ongPhoneInput.trigger('input');
                documentoDisplayInput.trigger('input');

                editableInputs.each(function() {
                    originalValues[$(this).attr('id')] = $(this).val();
                });
                originalValues['ong-email-display'] = ongEmailDisplay.text();
            } else {
                console.warn("Documento da ONG não encontrado para o userId:", userId);
            }
        }).catch(error => {
            console.error("Erro ao carregar perfil da ONG:", error);
        });
    } // --- FIM CORRETO DA FUNÇÃO loadOngProfileData ---



    /**
     * Habilita/Desabilita os campos do formulário para edição.
     */
    function setEditable(isEditable) {
        editableInputs.prop('disabled', !isEditable); // Habilita/desabilita apenas os campos editáveis
        editBtn.toggle(!isEditable);
        saveBtn.toggle(isEditable);
        cancelBtn.toggle(isEditable);
		
		if (isEditable) {
            ongImageUploadLabel.show();
        } else {
            ongImageUploadLabel.hide();
        }
		
    }
    
    editBtn.on('click', () => setEditable(true));

	cancelBtn.on('click', function() {
			// Restaura os valores originais
			editableInputs.each(function() {
				$(this).val(originalValues[$(this).attr('id')]);
			});
			ongEmailDisplay.text(originalValues['ong-email-display']);
			
			// Re-formata os campos com máscara
			ongPhoneInput.trigger('input');
			documentoDisplayInput.trigger('input');
			
			ongImagePreview.attr('src', originalPhotoSrc);
			ongImageUploadInput.val('');
			
			setEditable(false);
		});

    /**
     * Salva as alterações no Firestore.
     */
    profileForm.on('submit', function(event) {
        event.preventDefault();
        saveBtn.prop('disabled', true).text('SALVANDO...');
		
		const newPhotoFile = ongImageUploadInput[0].files[0];

        // Coleta apenas os dados que foram editados
		const updateFirestore = (newPhotoUrl = null) => {
			const updatedData = {
				nome: $('#ong-name').val(),
				documento: documentoDisplayInput.cleanVal(),
				endereco: $('#ong-address').val(),
				cidadeEstado: $('#ong-city-state').val(),
				telefone: ongPhoneInput.cleanVal(), // Salva o valor limpo
				vagasCaes: parseInt($('#total-dogs-capacity').val()) || 0,
				vagasGatos: parseInt($('#total-cats-capacity').val()) || 0
			};
		     
			 // Se uma nova foto foi enviada, adiciona a URL aos dados a serem salvos
            if (newPhotoUrl) {
                updatedData.fotoUrl = newPhotoUrl;
            }

			db.collection("ongs").doc(userId).update(updatedData)
				.then(() => {
					alert("Perfil atualizado com sucesso!");
					 if (newPhotoUrl) {
							originalPhotoSrc = newPhotoUrl; // Atualiza a foto original
						}
					// Atualiza os valores originais com os novos dados salvos
					editableInputs.each(function() {
						originalValues[$(this).attr('id')] = $(this).val();
					});
                
                setEditable(false);
            })
            .catch(error => {
                console.error("Erro ao salvar perfil:", error);
                alert("Erro ao salvar perfil. Tente novamente.");
            })
            .finally(() => saveBtn.prop('disabled', false).text('Salvar'));
			

		};
		
			// Se uma nova foto foi escolhida, faz o upload primeiro
			if (newPhotoFile) {
				const filePath = `ong_profile_pics/${userId}/${newPhotoFile.name}`;
				storage.ref(filePath).put(newPhotoFile)
					.then(snapshot => snapshot.ref.getDownloadURL())
					.then(url => {
						updateFirestore(url);
					})
					.catch(error => {
						console.error("Erro no upload da foto:", error);
						saveBtn.prop('disabled', false).text('Salvar');
					});
					} else {
						updateFirestore(); // Nenhuma foto nova, apenas salva os outros dados
					}
					
		});
   


    // =====================================================================
    // --- LÓGICA DE ALTERAÇÃO DE E-MAIL (dentro da função initHomePage) ---
    // =====================================================================
    const changeEmailModal = $('#change-email-modal');
    const changeEmailForm = $('#change-email-form');
    const changeEmailError = $('#change-email-error');
    const changeEmailBtn = $('#change-email-btn'); // O botão que abre o modal

    // Abre o modal
    changeEmailBtn.on('click', function() {
        changeEmailError.text(''); // Limpa erros antigos
        changeEmailForm[0].reset(); // Limpa o formulário
        changeEmailModal.css('display', 'flex');
    });

    // Lida com o envio do formulário de mudança de e-mail
    changeEmailForm.on('submit', function(event) {
        event.preventDefault();
        const submitButton = $(this).find('button[type="submit"]');
        submitButton.prop('disabled', true).text('ENVIANDO...');

        const password = $('#current-password').val();
        const newEmail = $('#new-email').val().trim();
        const user = auth.currentUser;

        if (!user) {
            changeEmailError.text("Nenhum usuário logado.");
            submitButton.prop('disabled', false).text('ENVIAR VERIFICAÇÃO');
            return;
        }

        // Validação de e-mail (já existe)
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            changeEmailError.text('Por favor, insira um novo e-mail válido.');
            submitButton.prop('disabled', false).text('ENVIAR VERIFICAÇÃO');
            return;
        }

        // 1. Cria a credencial para reautenticação
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);

        // 2. Tenta reautenticar o usuário
        user.reauthenticateWithCredential(credential)
            .then(() => {
                // 3. Se a reautenticação for bem-sucedida, ENVIA O E-MAIL DE VERIFICAÇÃO
                console.log("Reautenticação bem-sucedida. Enviando e-mail de verificação...");
                return user.verifyBeforeUpdateEmail(newEmail);
            })
            .then(() => {
                // 4. Se o envio do e-mail deu certo, avisa o usuário
                alert("Um link de verificação foi enviado para o seu novo endereço de e-mail. Por favor, clique no link para completar a alteração.");
                closeChangeEmailModal();
                // IMPORTANTE: Nós NÃO atualizamos o Firestore nem o display aqui.
                // O Firebase fará isso automaticamente após a verificação.
                // O usuário precisará fazer logout/login ou recarregar a página para ver a mudança.
            })
            .catch(error => {
                console.error("Erro ao alterar e-mail:", error);
                if (error.code === 'auth/wrong-password') {
                    changeEmailError.text("Senha incorreta.");
                } else if (error.code === 'auth/email-already-in-use') {
                    changeEmailError.text("Este e-mail já pertence a outra conta.");
                } else {
                    changeEmailError.text("Ocorreu um erro. Verifique sua senha e tente novamente.");
                }
            })
            .finally(() => {
                submitButton.prop('disabled', false).text('ENVIAR VERIFICAÇÃO');
            });
    });

    // Função para fechar o modal (agora no escopo da initHomePage)
    function closeChangeEmailModal() {
        changeEmailModal.css('display', 'none');
    }
    // Opcional: Se você precisar chamar isso de fora, mantenha a atribuição global
    // window.closeChangeEmailModal = closeChangeEmailModal;

    // Carrega os dados do perfil quando a função initHomePage é chamada
    loadOngProfileData();
	setEditable(false);
	listenToAnimalCounts();
    loadFinancialCharts();
	listenToSuppliesStatus();
	listenToUpcomingEvents();
}

