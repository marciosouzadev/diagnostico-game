/**
 * Diagnóstico em 60 Segundos
 * Estrutura inicial do controlador do jogo.
 * 
 * Arquitetura baseada em classes para encapsular o estado e os comportamentos,
 * facilitando a manutenção e seguindo princípios de Clean Code.
 */

class GameController {
    constructor() {
        // Estado da aplicação
        this.state = {
            score: 0,
            timeLeft: 60,
            currentCase: null,
            isPlaying: false,
            diseases: [],
            availableDiseases: [], 
            questionsPerGame: 10,
            currentQuestionIndex: 0,
            correctAnswers: 0,
            roundScore: 100,
            cluesUsed: 0,
            currentClues: {
                sintomas: [],
                exames: [],
                historicoFamiliar: [],
                exameFisico: []
            },
            selectedOption: null
        };

        // Cache de elementos do DOM
        this.elements = {
            // Telas
            startScreen: document.getElementById('start-screen'),
            gameScreen: document.getElementById('game-screen'),
            endScreen: document.getElementById('end-screen'),
            
            // Tema
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.getElementById('theme-icon'),
            
            // Progresso e Header
            timeLeftDisplay: document.getElementById('time-left'),
            scoreDisplay: document.getElementById('current-score'),
            questionCounter: document.getElementById('question-counter'),
            roundScoreDisplay: document.getElementById('round-score'),
            progressBar: document.getElementById('progress-bar'),
            
            // Interação Jogo
            levelBadge: document.getElementById('level-badge'),
            caseText: document.getElementById('clinical-case-text'),
            optionsContainer: document.getElementById('options-container'),
            btnStart: document.getElementById('btn-start'),
            btnSubmit: document.getElementById('btn-submit'),
            btnNext: document.getElementById('btn-next'),
            btnRestart: document.getElementById('btn-restart'),
            feedbackArea: document.getElementById('feedback-area'),
            cluesContainer: document.getElementById('clues-container'),
            investigateButtons: document.querySelectorAll('.btn-investigate'),
            toastContainer: document.getElementById('toast-container'),
            
            // Resultados
            medalIcon: document.getElementById('medal-icon'),
            medalTitle: document.getElementById('medal-title'),
            finalScore: document.getElementById('final-score'),
            finalCorrect: document.getElementById('final-correct')
        };

        this.timerInterval = null;
    }

    /**
     * Inicializa o jogo configurando eventos e carregando dados
     */
    async init() {
        this.initTheme();
        this.bindEvents();
        await this.loadDiseasesData();
    }

    /**
     * Associa os eventos aos elementos da interface
     */
    bindEvents() {
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.btnStart.addEventListener('click', () => this.startGame());
        this.elements.btnSubmit.addEventListener('click', () => this.handleAnswerSubmit());
        this.elements.btnNext.addEventListener('click', () => this.loadNextQuestion());
        this.elements.btnRestart.addEventListener('click', () => this.startGame());

        // Configura eventos para os botões de investigação
        this.elements.investigateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const type = button.dataset.type;
                const cost = parseInt(button.dataset.cost);
                const name = button.dataset.name;
                this.investigate(type, cost, name, button);
            });
        });
    }

    /**
     * Carrega a base de dados de doenças do arquivo JSON
     */
    async loadDiseasesData() {
        // Desabilita o botão enquanto carrega
        this.elements.btnStart.disabled = true;
        this.elements.btnStart.textContent = "Carregando casos...";
        
        try {
            // Utilizamos fetch para buscar o arquivo JSON
            // Lembre-se: é necessário rodar a aplicação em um servidor local (ex: Live Server no VSCode)
            const response = await fetch('data/diseases.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.state.diseases = await response.json();
            console.log("Base de doenças carregada com sucesso!");
            
            this.elements.btnStart.disabled = false;
            this.elements.btnStart.textContent = "Iniciar Game";
        } catch (error) {
            console.error("Erro ao carregar os dados:", error);
            this.showToast("Erro ao carregar doenças! Você precisa usar um Servidor Local (ex: Live Server).");
            this.elements.btnStart.textContent = "Erro de Conexão";
        }
    }

    /**
     * Configura o tema escuro inicial baseado nas preferências do usuário ou localStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.setAttribute('data-theme', 'dark');
            this.elements.themeIcon.textContent = '☀️';
        }
    }

    /**
     * Alterna entre modo claro e escuro
     */
    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.body.removeAttribute('data-theme');
            this.elements.themeIcon.textContent = '🌙';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            this.elements.themeIcon.textContent = '☀️';
            localStorage.setItem('theme', 'dark');
        }
    }

    /**
     * Inicia o fluxo principal do jogo
     */
    startGame() {
        if (this.state.diseases.length === 0) {
            this.showToast("⚠️ Falha ao iniciar: Banco de doenças não carregado. Verifique o Live Server.");
            return;
        }

        this.state.score = 0;
        this.state.currentQuestionIndex = 0;
        this.state.correctAnswers = 0;
        
        // Clona a lista de doenças para podermos remover as já sorteadas do novo array
        this.state.availableDiseases = [...this.state.diseases];
        
        this.showScreen('game');
        this.updateScoreDisplay();
        this.loadNextQuestion();
    }

    /**
     * Carrega um novo caso clínico na interface
     */
    loadNextQuestion() {
        // Verifica se atingiu o limite de perguntas do round ou se acabaram as doenças
        if (this.state.currentQuestionIndex >= this.state.questionsPerGame || this.state.availableDiseases.length === 0) {
            this.endGame();
            return;
        }

        this.state.currentQuestionIndex++;
        
        // Inicializa estado da rodada investigativa
        this.state.roundScore = 100;
        this.state.cluesUsed = 0;
        
        // Sorteia um índice aleatório e remove a doença da lista de disponíveis
        const randomIndex = Math.floor(Math.random() * this.state.availableDiseases.length);
        this.state.currentCase = this.state.availableDiseases.splice(randomIndex, 1)[0];

        // Carrega pistas do caso atual de forma independente
        this.state.currentClues = {
            sintomas: [...(this.state.currentCase.sintomas || [])],
            exames: [...(this.state.currentCase.exames || [])],
            historicoFamiliar: [...(this.state.currentCase.historicoFamiliar || [])],
            exameFisico: [...(this.state.currentCase.exameFisico || [])]
        };

        // Atualiza a interface com o novo caso clínico
        this.updateProgressDisplay();
        this.updateRoundScoreDisplay();
        this.elements.caseText.textContent = this.state.currentCase.casoClinico;
        this.elements.levelBadge.textContent = this.state.currentCase.nivel;
        
        // Reseta campo de clues
        this.elements.cluesContainer.innerHTML = '';
        
        // --- Geração de Múltipla Escolha ---
        this.elements.optionsContainer.innerHTML = '';
        this.state.selectedOption = null;
        
        const correctDisease = this.state.currentCase.nome;
        
        // Pega todos os nomes exceto o correto
        const otherDiseases = this.state.diseases
            .map(d => d.nome)
            .filter(name => name !== correctDisease);
            
        // Sorteia 4 nomes incorretos
        const shuffledOthers = otherDiseases.sort(() => Math.random() - 0.5).slice(0, 4);
        
        // Junta o correto com os 4 incorretos e embaralha tudo
        const options = [correctDisease, ...shuffledOthers].sort(() => Math.random() - 0.5);
        
        options.forEach(optionText => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.textContent = optionText;
            btn.onclick = () => this.selectOption(btn, optionText);
            this.elements.optionsContainer.appendChild(btn);
        });
        
        // Reseta o estado dos botões e esconde o feedback
        this.elements.btnSubmit.disabled = true; // Só habilita após selecionar uma alternativa
        this.elements.btnNext.disabled = true;
        this.elements.investigateButtons.forEach(btn => btn.disabled = false);
        this.elements.feedbackArea.classList.add('hidden');
        
        // Inicia o cronômetro
        this.startTimer();
    }

    /**
     * Marca a alternativa clicada
     */
    selectOption(clickedBtn, optionText) {
        // Se já respondeu (btnNext tá habilitado), ignora
        if (!this.elements.btnNext.disabled) return;

        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => btn.classList.remove('selected'));
        
        clickedBtn.classList.add('selected');
        this.state.selectedOption = optionText;
        this.elements.btnSubmit.disabled = false;
    }

    /**
     * Realiza uma ação de investigação, revelando pistas e reduzindo os pontos da rodada
     */
    investigate(type, cost, name, buttonElement) {
        const cluesArray = this.state.currentClues[type];
        
        // Verifica se há pistas disponíveis
        if (!cluesArray || cluesArray.length === 0) return;
        
        // Deduz pontuação (mínimo 0)
        this.state.roundScore = Math.max(0, this.state.roundScore - cost);
        this.state.cluesUsed++;
        this.updateRoundScoreDisplay();

        // Remove a primeira pista e exibe na tela
        const clueText = cluesArray.shift();
        
        const clueCard = document.createElement('div');
        clueCard.className = 'clue-card';
        clueCard.innerHTML = `<strong>${name}:</strong> ${clueText}`;
        
        this.elements.cluesContainer.appendChild(clueCard);
        
        // Auto-scroll no container para a pista mais recente
        clueCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Notifica o jogador
        this.showToast(`Você gastou ${cost} pontos para investigar ${name}.`);

        // Desabilita o botão caso acabem as pistas daquela categoria
        if (cluesArray.length === 0) {
            buttonElement.disabled = true;
        }
    }

    /**
     * Processa a resposta enviada pelo jogador
     */
    handleAnswerSubmit() {
        // Impede de submeter múltiplas vezes ou sem ter digitado
        if (this.elements.btnSubmit.disabled) return;

        if (!this.state.selectedOption) {
            this.showToast("Selecione uma das alternativas antes de responder.");
            return;
        }

        const isCorrect = this.state.selectedOption === this.state.currentCase.nome;

        // Para o cronômetro ao responder
        this.stopTimer();
        
        this.elements.investigateButtons.forEach(btn => btn.disabled = true);
        
        // Destacar visualmente os botões (Acerto e Erro)
        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => {
            btn.disabled = true; // Trava todas as opções
            if (btn.textContent === this.state.currentCase.nome) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected')) {
                btn.classList.add('wrong');
            }
        });

        // Lógica de Acerto ou Erro
        if (isCorrect) {
            this.state.score += this.state.roundScore; // Soma os pontos remanescentes da rodada
            this.state.correctAnswers++;
            this.updateScoreDisplay();
            this.showRoundSummary(true);
        } else {
            this.state.roundScore = 0; // Zera a rodada em caso de erro
            this.updateRoundScoreDisplay();
            this.showRoundSummary(false);
        }

        // Atualiza a interface para aguardar a próxima questão
        this.elements.btnSubmit.disabled = true;
        this.elements.btnNext.disabled = false;
        this.elements.btnNext.focus();
    }

    /**
     * Inicia a contagem regressiva
     */
    startTimer() {
        this.stopTimer(); // Garante que não há múltiplos intervalos rodando
        this.state.timeLeft = 60;
        this.updateTimerDisplay();
        this.elements.timeLeftDisplay.parentElement.classList.remove('timer-danger');

        this.timerInterval = setInterval(() => {
            this.state.timeLeft--;
            this.updateTimerDisplay();

            // Adiciona efeito visual de perigo se restar 10 segundos ou menos
            if (this.state.timeLeft <= 10 && this.state.timeLeft > 0) {
                this.elements.timeLeftDisplay.parentElement.classList.add('timer-danger');
            }

            // Encerra a rodada se o tempo acabar
            if (this.state.timeLeft <= 0) {
                this.stopTimer();
                this.handleTimeOut();
            }
        }, 1000);
    }

    /**
     * Interrompe o cronômetro
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    /**
     * Trata o evento de quando o tempo chega a zero (timeout)
     */
    handleTimeOut() {
        // Bloqueia interações e libera botão de próxima
        this.elements.btnSubmit.disabled = true;
        this.elements.btnNext.disabled = false;
        this.elements.investigateButtons.forEach(btn => btn.disabled = true);
        this.elements.btnNext.focus();
        
        // Destacar a resposta correta e desabilitar botões
        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === this.state.currentCase.nome) {
                btn.classList.add('correct');
            }
        });
        
        this.state.roundScore = 0;
        this.updateRoundScoreDisplay();
        
        this.showRoundSummary(false, true);
    }

    /**
     * Mostra o resumo detalhado da rodada (performance de detetive médico)
     */
    showRoundSummary(isCorrect, isTimeout = false) {
        let levelName = "Diagnóstico Difícil";
        const s = this.state.roundScore;
        if (s >= 90) levelName = "Diagnóstico Excelente";
        else if (s >= 70) levelName = "Diagnóstico Muito Bom";
        else if (s >= 50) levelName = "Diagnóstico Bom";
        else if (s >= 30) levelName = "Diagnóstico Regular";

        let titleHTML = isCorrect ? '✅ Diagnóstico Correto!' : '❌ Diagnóstico Incorreto!';
        if (isTimeout) titleHTML = '⏰ Tempo Esgotado!';

        const feedbackHtml = `
            <div class="round-summary">
                <h3 class="summary-title" style="color: var(--${isCorrect ? 'success' : 'error'}-color)">
                    ${titleHTML}
                </h3>
                <p><strong>A Doença era:</strong> ${this.state.currentCase.nome}</p>
                <p><strong>Desempenho:</strong> ${levelName} (${this.state.roundScore} pontos ganhos)</p>
                <p><strong>Pistas Utilizadas:</strong> ${this.state.cluesUsed}</p>
                <hr class="summary-divider">
                <p><strong>Explicação Clínica:</strong> ${this.state.currentCase.explicacao}</p>
            </div>
        `;
        
        this.showFeedback(feedbackHtml, isCorrect ? 'success' : 'error');
    }

    /**
     * Finaliza a partida e exibe a tela de resultados
     */
    endGame() {
        this.showScreen('end');
        
        this.elements.finalScore.textContent = this.state.score;
        this.elements.finalCorrect.textContent = `${this.state.correctAnswers}/${this.state.questionsPerGame}`;
        
        // Cálculo de Medalhas
        const percentage = this.state.correctAnswers / this.state.questionsPerGame;
        let medal = { icon: '💔', title: 'Plantão Difícil' };
        
        if (percentage === 1) {
            medal = { icon: '💎', title: 'Médico Residente (Perfeito!)' };
        } else if (percentage >= 0.8) {
            medal = { icon: '🥇', title: 'Medalha de Ouro' };
        } else if (percentage >= 0.6) {
            medal = { icon: '🥈', title: 'Medalha de Prata' };
        } else if (percentage >= 0.4) {
            medal = { icon: '🥉', title: 'Medalha de Bronze' };
        }
        
        this.elements.medalIcon.textContent = medal.icon;
        this.elements.medalTitle.textContent = medal.title;
    }

    /**
     * Alterna a visualização das telas principais
     * @param {string} screenName - 'start', 'game' ou 'end'
     */
    showScreen(screenName) {
        this.elements.startScreen.classList.add('hidden');
        this.elements.gameScreen.classList.add('hidden');
        this.elements.endScreen.classList.add('hidden');

        if (screenName === 'start') this.elements.startScreen.classList.remove('hidden');
        if (screenName === 'game') this.elements.gameScreen.classList.remove('hidden');
        if (screenName === 'end') this.elements.endScreen.classList.remove('hidden');
    }

    /**
     * Atualiza o display numérico de pontuação na tela
     */
    updateScoreDisplay() {
        this.elements.scoreDisplay.textContent = this.state.score;
    }

    /**
     * Atualiza o display numérico de tempo na tela
     */
    updateTimerDisplay() {
        this.elements.timeLeftDisplay.textContent = this.state.timeLeft;
    }
    
    /**
     * Atualiza o badge do placar específico da rodada
     */
    updateRoundScoreDisplay() {
        this.elements.roundScoreDisplay.textContent = this.state.roundScore;
    }

    /**
     * Atualiza a barra de progresso visual
     */
    updateProgressDisplay() {
        this.elements.questionCounter.textContent = `Questão ${this.state.currentQuestionIndex}/${this.state.questionsPerGame}`;
        const progressPercent = ((this.state.currentQuestionIndex - 1) / this.state.questionsPerGame) * 100;
        this.elements.progressBar.style.width = `${progressPercent}%`;
    }

    /**
     * Exibe mensagens de feedback para o jogador
     * @param {string} message - Texto a ser exibido
     * @param {string} type - Tipo de feedback ('success' ou 'error')
     */
    showFeedback(message, type = 'success') {
        const { feedbackArea } = this.elements;
        // Utiliza innerHTML em vez de textContent para suportar formatações com <strong> e <br>
        feedbackArea.innerHTML = message;
        feedbackArea.className = `feedback-area feedback-${type}`;
        feedbackArea.classList.remove('hidden');
    }

    /**
     * Mostra notificação rápida tipo "Toast"
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Inicializa a aplicação quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    const game = new GameController();
    game.init();
});