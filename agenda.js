	function getRandomColor() {
    // Gera um matiz aleatório (0 a 360)
    const hue = Math.floor(Math.random() * 360);
    // Usa saturação e luminosidade fixas para garantir cores pastel suaves
    const saturation = '70%';
    const lightness = '80%'; // 80% é um bom valor para um fundo claro
    
    return `hsl(${hue}, ${saturation}, ${lightness})`;
}



// Espera o documento estar pronto
$(document).ready(function() {
	
    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const calendarGrid = $('#calendar-grid');
    const calendarHeaderTitle = $('#calendar-header-title');
    const prevWeekBtn = $('#prev-week-btn');
    const nextWeekBtn = $('#next-week-btn');
    const todayBtn = $('#today-btn');

    // --- ESTADO GLOBAL DA PÁGINA ---
    // A semana atual começa na segunda-feira da data de hoje.
    window.currentWeekStart = getStartOfWeek(new Date());
	
	

    // --- FUNÇÕES DE RENDERIZAÇÃO VISUAL (NÃO FALAM COM O BANCO) ---
    function getStartOfWeek(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d;
    }

    function renderWeekHeaders() {
        const weekEnd = new Date(window.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        calendarHeaderTitle.text(`${window.currentWeekStart.getDate()} de ${monthNames[window.currentWeekStart.getMonth()]} - ${weekEnd.getDate()} de ${monthNames[weekEnd.getMonth()]}, ${window.currentWeekStart.getFullYear()}`);
        
        const dayNames = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
        for (let i = 0; i < 7; i++) {
            const day = new Date(window.currentWeekStart);
            day.setDate(day.getDate() + i);
            $(`#day-header-${i}`).html(`<span>${dayNames[i]}</span> ${day.getDate()}`);
        }
    }

    function renderCalendarGrid() {
        calendarGrid.empty();
        const timeCol = $('<div>').addClass('time-col');
        for (let i = 0; i < 24; i++) {
            timeCol.append($('<div>').addClass('time-slot').text(`${String(i).padStart(2, '0')}:00`));
        }
        calendarGrid.append(timeCol);
        for (let i = 0; i < 7; i++) {
            calendarGrid.append($('<div>').addClass('day-col').css('grid-column', i + 2));
        }
    }

    /**
     * Função principal que redesenha o calendário e pede os eventos ao global.js
     */
    function updateCalendarView() {
        renderWeekHeaders();
        renderCalendarGrid();
        // AVISO: 'renderEventsCalendar' e 'currentUserId' devem ser definidos pelo global.js
        if (typeof renderEventsCalendar === 'function' && window.currentUserId) {
            renderEventsCalendar(window.currentUserId, window.currentWeekStart);
        }
    }

    // --- CONTROLES DE NAVEGAÇÃO ---
    nextWeekBtn.on('click', () => {
        window.currentWeekStart.setDate(window.currentWeekStart.getDate() + 7);
        updateCalendarView();
    });
    prevWeekBtn.on('click', () => {
        window.currentWeekStart.setDate(window.currentWeekStart.getDate() - 7);
        updateCalendarView();
    });
	todayBtn.on('click', () => {
        window.currentWeekStart = getStartOfWeek(new Date());
        updateCalendarView();
    });
    
    // Dispara a primeira renderização do calendário.
    // A busca de eventos real só acontecerá quando o 'authReady' do global.js for acionado.
    updateCalendarView(); 
    
    console.log("agenda.js carregado. Aguardando 'authReady' do global.js para buscar eventos.");
});


//--- AQUI COMEÇA O BANCO 

let unsubscribeFromEvents;

/**
 * Renderiza os eventos no calendário, tratando colisões de forma precisa.
 * @param {string} userId - O UID do usuário logado.
 * @param {Date} weekStart - O objeto Date do primeiro dia da semana.
 */
function renderEventsCalendar(userId, weekStart) {
    const db = firebase.firestore();
    const calendarGrid = $('#calendar-grid');

    if (unsubscribeFromEvents) unsubscribeFromEvents();
    $('.event').remove();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    unsubscribeFromEvents = db.collection("agenda")
        .where("userId", "==", userId)
        .where("startDate", ">=", firebase.firestore.Timestamp.fromDate(weekStart))
        .where("startDate", "<", firebase.firestore.Timestamp.fromDate(weekEnd))
        .orderBy("startDate")
        .onSnapshot((querySnapshot) => {
            $('.event').remove();

            // 1. Agrupa todos os eventos por dia da semana (0=Dom, 1=Seg, ...)
            const eventsByDay = [[], [], [], [], [], [], []];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const dayOfWeek = data.startDate.toDate().getDay();
                eventsByDay[dayOfWeek].push({
                    id: doc.id,
                    ...data,
                    start: data.startDate.toDate(),
                    end: data.endDate.toDate()
                });
            });

            // 2. Itera sobre cada dia e calcula o layout APENAS para aquele dia
            eventsByDay.forEach((dayEvents, dayIndex) => {
                if (dayEvents.length === 0) return;

                // Ordena os eventos do dia por hora de início
                dayEvents.sort((a, b) => a.start - b.start);

                // Determina as colisões para cada evento do dia
                for (let i = 0; i < dayEvents.length; i++) {
                    const currentEvent = dayEvents[i];
                    currentEvent.collisions = [];
                    for (let j = 0; j < dayEvents.length; j++) {
                        const otherEvent = dayEvents[j];
                        if (currentEvent.start < otherEvent.end && currentEvent.end > otherEvent.start) {
                            currentEvent.collisions.push(otherEvent);
                        }
                    }
                }

                // Determina a "coluna" de cada evento
                dayEvents.forEach(event => {
                    event.collisionIndex = 0;
                    let isSlotTaken = true;
                    while (isSlotTaken) {
                        isSlotTaken = event.collisions.some(otherEvent =>
                            otherEvent.collisionIndex === event.collisionIndex && otherEvent.id !== event.id
                        );
                        if (isSlotTaken) {
                            event.collisionIndex++;
                        }
                    }
                });

                // 3. Renderiza os eventos do dia com o layout calculado
                const totalWidth = calendarGrid.innerWidth();
                const timeColumnWidth = 60;
                const dayColumnWidth = (totalWidth - timeColumnWidth) / 7;
                
                const calendarDayIndex = dayIndex === 0 ? 6 : (dayIndex - 1);

                dayEvents.forEach(event => {
                    const eventDiv = $('<div>').addClass('event').attr('data-id', event.id);
                    
                    const startTop = event.start.getHours() * 60 + event.start.getMinutes();
                    const height = (event.end.getTime() - event.start.getTime()) / 60000;
                    
                    // O número total de "colunas" necessárias é o maior índice + 1
                    const totalCollisionsForBlock = Math.max(...event.collisions.map(e => e.collisionIndex)) + 1;
                    
                    const eventWidth = dayColumnWidth / totalCollisionsForBlock;
                    const baseLeftPosition = timeColumnWidth + (calendarDayIndex * dayColumnWidth);
                    const eventLeftPosition = baseLeftPosition + (event.collisionIndex * eventWidth);
                    
                    const eventColor = getRandomColor();
                    const darkerBorderColor = `hsl(${eventColor.match(/\d+/)[0]}, 70%, 60%)`;

                    eventDiv.css({
                        'top': `${startTop}px`,
                        'height': `${height < 20 ? 20 : height}px`,
                        'left': `${eventLeftPosition}px`,
                        'width': `${eventWidth - 2}px`,
                        'background-color': eventColor,
                        'border-left': `3px solid ${darkerBorderColor}`
                    });
                    
                    eventDiv.html(`<strong>${event.titulo}</strong><span>${event.responsavel}</span>`);
                    eventDiv.on('click', () => openEditEventModal(event.id)); 
                    
                    calendarGrid.append(eventDiv);
                });
            });

        }, (error) => {
            console.error("Erro ao carregar eventos da agenda:", error);
        });
}

function calculateEventLayout(events) {
    if (events.length === 0) return;

    // Inicializa as propriedades de layout
    events.forEach(e => {
        e.totalCollisions = 1;
        e.collisionIndex = 0;
    });

    // Ordena por hora de início para processar corretamente
    events.sort((a, b) => a.start - b.start);

    // Itera sobre cada evento para encontrar seu "bloco" de colisão
    for (let i = 0; i < events.length; i++) {
        const eventA = events[i];
        let collisionBlock = [eventA];

        // Olha para todos os outros eventos para ver se eles fazem parte do mesmo bloco
        for (let j = 0; j < events.length; j++) {
            if (i === j) continue; // Não se compara com ele mesmo
            const eventB = events[j];
            
            // Um evento B faz parte do bloco de A se ele colide com QUALQUER evento que já está no bloco
            const collidesWithBlock = collisionBlock.some(e => 
                eventB.start < e.end && eventB.end > e.start
            );
            
            if (collidesWithBlock) {
                // Adiciona ao bloco apenas se ainda não estiver lá
                if (!collisionBlock.find(e => e.id === eventB.id)) {
                    collisionBlock.push(eventB);
                }
            }
        }
        
        if (collisionBlock.length > 1) {
             // Ordena o bloco por hora de início
            collisionBlock.sort((a, b) => a.start - b.start);

            // Coloca cada evento do bloco na primeira coluna ("slot") disponível
            collisionBlock.forEach(eventInBlock => {
                let slot = 0;
                let isSlotTaken = true;

                while (isSlotTaken) {
                    isSlotTaken = collisionBlock.some(otherEvent =>
                        otherEvent.collisionIndex === slot &&
                        (eventInBlock.start < otherEvent.end && eventInBlock.end > otherEvent.start)
                    );
                    
                    if (isSlotTaken) {
                        slot++;
                    }
                }
                eventInBlock.collisionIndex = slot;
            });
            
            // O número total de colisões é o número de "slots" necessários
            const maxSlots = Math.max(...collisionBlock.map(e => e.collisionIndex)) + 1;
            collisionBlock.forEach(eventInBlock => {
                eventInBlock.totalCollisions = Math.max(eventInBlock.totalCollisions, maxSlots);
            });
        }
    }
}

// --- FUNÇÃO DE INICIALIZAÇÃO DA PÁGINA AGENDA ---
function initAgendaPage(userId) {	
    const db = firebase.firestore(); // Garanta que db esteja acessível dentro desta função
    const editEventModal = $('#edit-event-modal');

    // --- LÓGICA DE CADASTRO DE NOVO EVENTO (encapsulada aqui) ---
    if ($('#event-form').length > 0) {
        $('#event-form').off('submit').on('submit', function(e) { // Use .off().on()
            e.preventDefault();
            
            const dateValue = $('#event-date').val();
            const startTimeValue = $('#event-start-time').val();
            const endTimeValue = $('#event-end-time').val();

            if (!dateValue || !startTimeValue || !endTimeValue) return alert('Preencha todos os campos de data e hora.');
            
            const startDate = new Date(`${dateValue}T${startTimeValue}`);
            const endDate = new Date(`${dateValue}T${endTimeValue}`);
            if (endDate <= startDate) return alert('O horário de término deve ser posterior ao de início.');

            const newEvent = {
                titulo: $('#event-title').val(),
                descricao: $('#event-desc').val(),
                responsavel: $('#event-responsible').val(),
                startDate: firebase.firestore.Timestamp.fromDate(startDate),
                endDate: firebase.firestore.Timestamp.fromDate(endDate),
                userId: userId // Use o userId passado para a função
            };

            db.collection("agenda").add(newEvent)
                .then(() => {
                    alert('Compromisso salvo com sucesso!');
                    $('#event-form')[0].reset();
                })
                .catch(error => console.error("Erro ao salvar compromisso:", error));
        });
        console.log("Handler de CADASTRO de evento configurado.");
    }


    // --- LÓGICA PARA EDIÇÃO E EXCLUSÃO DE EVENTOS ---

    // A função openEditEventModal, agora como uma função aninhada ou separada globalmente.
    // Se for chamada via delegação, não precisa estar no window.
    const openEditEventModal = function(docId) {
        if (!docId) return;
        
        db.collection("agenda").doc(docId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                const startDate = data.startDate.toDate();
                const dateValue = startDate.toISOString().split('T')[0];
                const startTimeValue = String(startDate.getHours()).padStart(2, '0') + ':' + String(startDate.getMinutes()).padStart(2, '0');
                const endDate = data.endDate.toDate();
                const endTimeValue = String(endDate.getHours()).padStart(2, '0') + ':' + String(endDate.getMinutes()).padStart(2, '0');

                $('#edit-event-doc-id').val(docId);
                $('#edit-event-title').val(data.titulo);
                $('#edit-event-date').val(dateValue);
                $('#edit-event-start-time').val(startTimeValue);
                $('#edit-event-end-time').val(endTimeValue);
                $('#edit-event-desc').val(data.descricao);
                $('#edit-event-responsible').val(data.responsavel);

                editEventModal.css('display', 'flex');
            }
        }).catch(error => console.error("Erro ao carregar evento para edição:", error));
    };
    
    // ANEXAR O LISTENER DE CLIQUE AO CONTAINER DO CALENDÁRIO COM DELEGAÇÃO
    $('#calendar-grid').off('click', '.event').on('click', '.event', function() {
        const docId = $(this).data('id'); // Pega o ID do atributo data-id do evento
        openEditEventModal(docId);
    });

    // Ouve o envio do formulário de EDIÇÃO
    $('#edit-event-form').off('submit').on('submit', function(event) { // Use .off().on()
        event.preventDefault();
        const docId = $('#edit-event-doc-id').val();
        const dateValue = $('#edit-event-date').val();
        const startTimeValue = $('#edit-event-start-time').val();
        const endTimeValue = $('#edit-event-end-time').val();
        const newStartDate = new Date(`${dateValue}T${startTimeValue}`);
        const newEndDate = new Date(`${dateValue}T${endTimeValue}`);
        if (newEndDate <= newStartDate) return alert("O horário de término deve ser posterior ao de início.");
        
        const updatedData = {
            titulo: $('#edit-event-title').val(),
            descricao: $('#edit-event-desc').val(),
            responsavel: $('#edit-event-responsible').val(),
            startDate: firebase.firestore.Timestamp.fromDate(newStartDate),
            endDate: firebase.firestore.Timestamp.fromDate(newEndDate)
        };
        
        db.collection("agenda").doc(docId).update(updatedData)
            .then(() => {
                closeEditEventModal();
                alert("Evento atualizado com sucesso!");
            })
            .catch(error => console.error("Erro ao atualizar evento:", error));
    });

    // Ouve o clique no botão de EXCLUIR dentro do modal
    $('#delete-event-btn').off('click').on('click', function() { // Use .off().on()
        const docId = $('#edit-event-doc-id').val();
        if (confirm("Tem certeza que deseja excluir este evento?")) {
            db.collection("agenda").doc(docId).delete()
              .then(() => {
                  closeEditEventModal();
                  alert("Evento excluído com sucesso!");
              })
              .catch(error => console.error("Erro ao excluir evento:", error));
        }
    });

    // --- Lógica para navegação do calendário (próxima/anterior semana) ---
    $('#prev-week').off('click').on('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderEventsCalendar(userId, currentWeekStart);
        updateCalendarHeader(currentWeekStart);
    });

    $('#next-week').off('click').on('click', function() {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderEventsCalendar(userId, currentWeekStart);
        updateCalendarHeader(currentWeekStart);
    });

    // Função para atualizar o cabeçalho do calendário (ex: "Semana de DD/MM - DD/MM")
    function updateCalendarHeader(weekStartDate) {
        const header = $('#current-week-range'); // Supondo que você tenha um elemento para isso
        const start = weekStartDate.toLocaleDateString('pt-BR');
        const end = new Date(weekStartDate);
        end.setDate(end.getDate() + 6);
        const endStr = end.toLocaleDateString('pt-BR');
        header.text(`Semana de ${start} a ${endStr}`);
    }


    // Variáveis para o controle do calendário (precisam ser acessíveis a estas funções)
    // Inicialize-as aqui ou assegure que elas sejam globais para este script.
    let currentWeekStart = new Date();
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + (currentWeekStart.getDay() === 0 ? -6 : 1)); // Ajusta para a segunda-feira da semana atual

    renderEventsCalendar(userId, currentWeekStart); // Renderiza o calendário inicial
    updateCalendarHeader(currentWeekStart); // Atualiza o cabeçalho inicial

    console.log("Lógica da Agenda configurada.");
}

// Funções globais necessárias (se usadas por HTML direto, como fechar modal)
function closeEditEventModal() {
    $('#edit-event-modal').css('display', 'none');
}
window.closeEditEventModal = closeEditEventModal; // Torna global

// Exportar initAgendaPage para ser chamada de global2.js
window.initAgendaPage = initAgendaPage;