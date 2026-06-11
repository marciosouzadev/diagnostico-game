/**
 * Matemática em 60s: Salve a Cidade dos Números!
 * Controlador refatorado para a nova temática educacional.
 */

class GameController {
    constructor() {
        // Estado da aplicação
        this.state = {
            score: 0,
            timeLeft: 60,
            currentCase: null,
            isPlaying: false,
            questions: [],
            availableQuestions: [], 
            questionsPerGame: 10,
            currentQuestionIndex: 0,
            correctAnswers: 0,
            lives: 3,
            combo: 0,
            maxCombo: 0,
            selectedOption: null,
            playerName: ''
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
            progressBar: document.getElementById('progress-bar'),
            
            // Interação Jogo
            worldBadge: document.getElementById('world-badge'),
            categoryBadge: document.getElementById('category-badge'),
            introText: document.getElementById('intro-text'),
            questionText: document.getElementById('question-text'),
            optionsContainer: document.getElementById('options-container'),
            playerNameInput: document.getElementById('player-name'),
            btnStart: document.getElementById('btn-start'),
            btnHowTo: document.getElementById('btn-how-to'),
            btnRanking: document.getElementById('btn-ranking'),
            btnHint: document.getElementById('btn-hint'),
            btnSubmit: document.getElementById('btn-submit'),
            btnRestart: document.getElementById('btn-restart'),
            hintBox: document.getElementById('hint-box'),
            hintText: document.getElementById('hint-text'),
            btnCloseHint: document.getElementById('btn-close-hint'),
            feedbackArea: document.getElementById('feedback-area'),
            toastContainer: document.getElementById('toast-container'),
            
            // Modais
            modalContainer: document.getElementById('modal-container'),
            btnCloseModal: document.getElementById('btn-close-modal'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),

            // Resultados
            endTitle: document.getElementById('end-title'),
            endPlayerName: document.getElementById('end-player-name'),
            medalIcon: document.getElementById('medal-icon'),
            medalTitle: document.getElementById('medal-title'),
            finalScore: document.getElementById('final-score'),
            finalCorrect: document.getElementById('final-correct'),
            finalStats: document.getElementById('final-stats'),
            livesDisplay: document.getElementById('lives-display'),
            comboDisplay: document.getElementById('combo-display')
        };

        this.timerInterval = null;
        this.autoNextTimeout = null;
    }

    /**
     * Inicializa o jogo configurando eventos e carregando dados
     */
    async init() {
        this.initTheme();
        this.bindEvents();
        await this.loadQuestionsData();
    }

    /**
     * Associa os eventos aos elementos da interface
     */
    bindEvents() {
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.btnStart.addEventListener('click', () => this.startGame());
        this.elements.btnHint.addEventListener('click', () => this.showHint());
        this.elements.btnSubmit.addEventListener('click', () => this.handleAnswerSubmit());
        this.elements.btnRestart.addEventListener('click', () => this.startGame());

        // Modais e dicas
        this.elements.btnHowTo.addEventListener('click', () => this.openModal("📖 Como Jogar", "<p>1. Você tem 60 segundos para responder cada missão.</p><p>2. Cada acerto vale 100 pontos.</p><p>3. Respostas consecutivas corretas geram <strong>Combos</strong>, multiplicando sua glória!</p><p>4. Você possui 3 vidas (❤️). Erros descontam vidas.</p><p>5. Use a 💡 Dica se precisar, ela ficará na tela, mas o tempo continuará correndo!</p>"));
        this.elements.btnRanking.addEventListener('click', () => this.showRanking());
        this.elements.btnCloseModal.addEventListener('click', () => this.closeModal());
        this.elements.btnCloseHint.addEventListener('click', () => this.elements.hintBox.classList.add('hidden'));

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (!this.state.isPlaying) return;

            if (['1', '2', '3', '4'].includes(e.key)) {
                const index = parseInt(e.key) - 1;
                const buttons = this.elements.optionsContainer.querySelectorAll('.btn-option');
                if (buttons[index] && !buttons[index].disabled) {
                    this.selectOption(buttons[index], buttons[index].dataset.value);
                }
            } else if (e.key === 'Enter') {
                if (!this.elements.btnSubmit.classList.contains('hidden') && !this.elements.btnSubmit.disabled) {
                    this.handleAnswerSubmit();
                }
            } else if (e.key === 'Escape') {
                this.showToast("⏸️ Jogo Pausado (Simulação)");
            }
        });
    }

    /**
     * Configura o tema escuro inicial baseado nas preferências do usuário ou localStorage
     */
    initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            this.elements.themeIcon.textContent = '☀️';
        } else {
            this.elements.themeIcon.textContent = '🌙';
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
     * Carrega a base de dados de questões de matemática
     */
    async loadQuestionsData() {
        this.elements.btnStart.disabled = true;
        this.elements.btnStart.textContent = "Carregando mundos...";
        
        try {
            const response = await fetch('data/math_questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.state.questions = await response.json();
            
            this.elements.btnStart.disabled = false;
            this.elements.btnStart.textContent = "▶ Começar aventura";
        } catch (error) {
            console.error("Erro ao carregar os dados:", error);
            this.showToast("Erro ao carregar as missões! Verifique o Live Server.");
            this.elements.btnStart.textContent = "Erro de Conexão";
        }
    }

    /**
     * Inicia o fluxo principal do jogo
     */
    startGame() {
        const name = this.elements.playerNameInput.value.trim();
        if (!name) {
            this.showToast("⚠️ Por favor, insira seu nome de explorador antes de começar!");
            this.elements.playerNameInput.focus();
            return;
        }
        this.state.playerName = name;

        if (this.state.questions.length === 0) {
            this.showToast("⚠️ Banco de missões vazio!");
            return;
        }

        this.state.isPlaying = true;
        this.state.score = 0;
        this.state.currentQuestionIndex = 0;
        this.state.correctAnswers = 0;
        this.state.lives = 3;
        this.state.combo = 0;
        this.state.maxCombo = 0;
        
        this.state.availableQuestions = [...this.state.questions];
        
        this.showScreen('game');
        this.updateScoreDisplay();
        this.updateLivesDisplay();
        this.updateComboDisplay();
        this.loadNextQuestion();
    }

    /**
     * Carrega a próxima fase na interface
     */
    loadNextQuestion() {
        // Limpa o temporizador automático caso o usuário tenha clicado antes do tempo acabar
        if (this.autoNextTimeout) {
            clearTimeout(this.autoNextTimeout);
            this.autoNextTimeout = null;
        }
        
        if (this.state.lives <= 0 || this.state.currentQuestionIndex >= this.state.questionsPerGame || this.state.availableQuestions.length === 0) {
            this.endGame();
            return;
        }

        this.state.currentQuestionIndex++;
        
        const randomIndex = Math.floor(Math.random() * this.state.availableQuestions.length);
        this.state.currentCase = this.state.availableQuestions.splice(randomIndex, 1)[0];

        this.updateProgressDisplay();
        
        this.elements.introText.textContent = this.state.currentCase.introducao;
        this.elements.questionText.textContent = this.state.currentCase.pergunta;
        this.elements.worldBadge.textContent = this.state.currentCase.mundo;
        this.elements.categoryBadge.textContent = this.state.currentCase.categoria;
        
        this.elements.optionsContainer.innerHTML = '';
        this.state.selectedOption = null;
        
        const options = [...this.state.currentCase.opcoes].sort(() => Math.random() - 0.5);
        const optionKeys = ['1', '2', '3', '4'];
        
        options.forEach((optionText, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.innerHTML = `<span class="option-key">${optionKeys[index]}</span> ${optionText}`;
            btn.dataset.value = optionText;
            btn.onclick = () => this.selectOption(btn, optionText);
            this.elements.optionsContainer.appendChild(btn);
        });
        
        this.elements.btnHint.disabled = false;
        this.elements.btnHint.classList.remove('hidden');
        
        this.elements.btnSubmit.disabled = true; 
        this.elements.btnSubmit.classList.remove('hidden');
        this.elements.hintBox.classList.add('hidden');
        this.elements.feedbackArea.classList.add('hidden');
        
        // Inicia o cronômetro
        this.startTimer();
    }

    /**
     * Marca a alternativa clicada
     */
    selectOption(clickedBtn, optionText) {
        // Se já respondeu (temporizador rodando), ignora
        if (this.autoNextTimeout) return;

        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => btn.classList.remove('selected'));
        
        clickedBtn.classList.add('selected');
        this.state.selectedOption = optionText;
        this.elements.btnSubmit.disabled = false;
    }

    /**
     * Mostra a dica educacional da pergunta atual
     */
    showHint() {
        this.elements.hintText.innerHTML = `<strong>Dica de Sobrevivência:</strong> ${this.state.currentCase.dica}`;
        this.elements.hintBox.classList.remove('hidden');
        this.elements.btnHint.disabled = true;
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

        const isCorrect = this.state.selectedOption === this.state.currentCase.resposta;

        this.stopTimer();
        this.elements.btnHint.classList.add('hidden'); // Oculta botão de dica
        this.elements.hintBox.classList.add('hidden'); // Oculta a dica ao responder
        
        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => {
            btn.disabled = true; 
            if (btn.dataset.value === this.state.currentCase.resposta) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected')) {
                btn.classList.add('wrong');
            }
        });

        if (isCorrect) {
            this.state.score += 100;
            this.state.correctAnswers++;
            this.state.combo++;
            if (this.state.combo > this.state.maxCombo) {
                this.state.maxCombo = this.state.combo;
            }
            this.updateScoreDisplay();
            this.updateComboDisplay();
            this.showRoundSummary(true);
            this.createConfetti();
            
            this.elements.gameScreen.classList.add('pop');
            setTimeout(() => this.elements.gameScreen.classList.remove('pop'), 400);
        } else {
            this.state.combo = 0;
            this.state.lives--;
            this.updateLivesDisplay();
            this.updateComboDisplay();
            
            if (this.state.lives > 0) {
                this.elements.gameScreen.classList.add('shake');
                setTimeout(() => this.elements.gameScreen.classList.remove('shake'), 500);
            }
            this.showRoundSummary(false);
        }

        this.elements.btnSubmit.classList.add('hidden');
        
        if (this.state.lives <= 0) {
            this.autoNextTimeout = setTimeout(() => this.endGame(), 2000); // Avança rápido
        } else {
            this.autoNextTimeout = setTimeout(() => this.loadNextQuestion(), 2000); // Avança rápido
        }
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
        this.elements.btnHint.classList.add('hidden');
        this.elements.hintBox.classList.add('hidden');
        this.state.combo = 0;
        this.state.lives--;
        this.updateLivesDisplay();
        this.updateComboDisplay();
        
        const allOptions = this.elements.optionsContainer.querySelectorAll('.btn-option');
        allOptions.forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.value === this.state.currentCase.resposta) {
                btn.classList.add('correct');
            }
        });
        
        this.showRoundSummary(false, true);
        
        this.elements.btnSubmit.classList.add('hidden');
        
        if (this.state.lives <= 0) {
            this.autoNextTimeout = setTimeout(() => this.endGame(), 2000);
        } else {
            this.autoNextTimeout = setTimeout(() => this.loadNextQuestion(), 2000);
        }
    }

    /**
     * Mostra o feedback educacional
     */
    showRoundSummary(isCorrect, isTimeout = false) {
        let titleHTML = isCorrect ? '🎉 Excelente!' : '😵 Ops!';
        if (isTimeout) titleHTML = '⏰ Tempo Esgotado!';
        if (!isCorrect && this.state.lives <= 0) titleHTML = '💔 Fim de Jogo!';

        const feedbackHtml = `
            <div class="round-summary">
                <h3 class="summary-title" style="color: var(--${isCorrect ? 'success' : 'error'}-color)">
                    ${titleHTML}
                </h3>
                ${!isCorrect ? `<p><strong>A resposta correta era:</strong> ${this.state.currentCase.resposta}</p>` : ''}
                <hr class="summary-divider">
                <p><strong>Explicação:</strong> ${this.state.currentCase.explicacao}</p>
            </div>
        `;
        
        this.showFeedback(feedbackHtml, isCorrect ? 'success' : 'error');
    }

    /**
     * Efeito visual de confete para acertos
     */
    createConfetti() {
        const colors = ['#f59e0b', '#00ffcc', '#00ff00', '#008080', '#dc2626'];
        for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = `${Math.random() * 1.5 + 1}s`;
            confetti.style.animationDelay = `${Math.random() * 0.2}s`;
            document.body.appendChild(confetti);

            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    /**
     * Finaliza a partida
     */
    endGame() {
        // Limpa o temporizador automático se existir
        if (this.autoNextTimeout) {
            clearTimeout(this.autoNextTimeout);
            this.autoNextTimeout = null;
        }
        this.state.isPlaying = false;
        this.showScreen('end');
        
        const isVictory = this.state.lives > 0;
        this.elements.endTitle.textContent = isVictory ? '🏆 Parabéns! Você salvou a Cidade!' : '💥 Fim de Jogo!';
        this.elements.endTitle.style.color = isVictory ? 'var(--gold-color)' : 'var(--error-color)';
        this.elements.endPlayerName.textContent = `Explorador(a): ${this.state.playerName}`;

        this.elements.finalScore.textContent = this.state.score;
        this.elements.finalCorrect.textContent = `${this.state.correctAnswers}/${this.state.questionsPerGame}`;
        
        let extraStats = `
            <div class="result-item extra-stat">
                <span class="result-label">Vidas Restantes</span>
                <span class="result-value">${this.state.lives}</span>
            </div>
            <div class="result-item extra-stat">
                <span class="result-label">Maior Combo</span>
                <span class="result-value">x${this.state.maxCombo}</span>
            </div>
        `;
        
        const existingExtra = this.elements.finalStats.querySelectorAll('.extra-stat');
        existingExtra.forEach(el => el.remove());
        this.elements.finalStats.insertAdjacentHTML('beforeend', extraStats);
        
        let medal = { icon: '💔', title: 'Explorador Novato' };
        
        if (isVictory) {
            if (this.state.lives === 3 && this.state.correctAnswers === this.state.questionsPerGame) {
                medal = { icon: '💎', title: 'Mestre da Matemática' };
            } else if (this.state.correctAnswers >= 8) {
                medal = { icon: '🥇', title: 'Ouro Matemático' };
            } else if (this.state.correctAnswers >= 5) {
                medal = { icon: '🥈', title: 'Prata Matemática' };
            } else {
                medal = { icon: '🥉', title: 'Bronze Matemático' };
            }
        }
        
        this.elements.medalIcon.textContent = medal.icon;
        this.elements.medalTitle.textContent = medal.title;

        this.saveRanking(); // Salva a pontuação no final do jogo
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
    
    updateLivesDisplay() {
        let hearts = '';
        for(let i=0; i<3; i++) {
            hearts += i < this.state.lives ? '❤️' : '🖤';
        }
        this.elements.livesDisplay.textContent = hearts;
    }

    updateComboDisplay() {
        if (this.state.combo >= 3) {
            this.elements.comboDisplay.classList.remove('hidden');
            this.elements.comboDisplay.classList.add('combo-anim');
            
            setTimeout(() => {
                this.elements.comboDisplay.classList.remove('combo-anim');
            }, 500);

            if (this.state.combo >= 10) {
                this.elements.comboDisplay.textContent = '🌟 Mestre!';
            } else if (this.state.combo >= 5) {
                this.elements.comboDisplay.textContent = `⚡ x${this.state.combo}`;
            } else {
                this.elements.comboDisplay.textContent = `🔥 x${this.state.combo}`;
            }
        } else {
            this.elements.comboDisplay.classList.add('hidden');
        }
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
     * Salva a pontuação do jogador atual no LocalStorage
     */
    saveRanking() {
        const currentScore = {
            name: this.state.playerName || 'Explorador',
            score: this.state.score,
            date: new Date().toLocaleDateString('pt-BR')
        };

        let ranking = JSON.parse(localStorage.getItem('math_ranking')) || [];
        ranking.push(currentScore);
        ranking.sort((a, b) => b.score - a.score); // Ordena do maior para o menor
        ranking = ranking.slice(0, 10); // Mantém apenas o Top 10
        
        localStorage.setItem('math_ranking', JSON.stringify(ranking));
    }

    /**
     * Monta e exibe o Ranking com os dados reais salvos
     */
    showRanking() {
        const ranking = JSON.parse(localStorage.getItem('math_ranking')) || [];
        let content = "";
        if (ranking.length === 0) {
            content = "<p style='text-align: center; margin-top: 1rem;'>Nenhum explorador concluiu a aventura ainda. Seja o primeiro!</p>";
        } else {
            content = "<ol style='text-align: left; margin-left: 2rem; margin-top: 1rem;'>";
            ranking.forEach(entry => {
                content += `<li style='margin-bottom: 0.5rem;'><strong>${entry.name}</strong> - ${entry.score} pts <span style='font-size: 0.8em; color: var(--text-muted);'>(${entry.date})</span></li>`;
            });
            content += "</ol>";
        }
        this.openModal("🏆 Ranking dos Exploradores", content);
    }

    /**
     * Funções de Controle de Modal
     */
    openModal(title, content) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalBody.innerHTML = content;
        this.elements.modalContainer.classList.remove('hidden');
    }
    closeModal() {
        this.elements.modalContainer.classList.add('hidden');
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