const App = {
  view: 'home',
  currentFlashcard: null,
  currentCategory: 'Tous',
  searchQuery: '',
  pendingDeleteId: null,
  quizState: {
    category: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    selectedAnswer: null,
    answered: false
  },

  async init() {
    this.cacheElements();
    await dataManager.init();
    this.bindEvents();
    this.render();
  },

  cacheElements() {
    this.app = document.getElementById('app');
  },

  bindEvents() {
    document.addEventListener('click', (e) => this.handleClick(e));
    document.addEventListener('input', (e) => this.handleInput(e));
    document.addEventListener('change', (e) => this.handleChange(e));
    document.addEventListener('submit', (e) => this.handleSubmit(e));
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
  },

  handleClick(e) {
    const target = e.target;

    if (target.matches('input, textarea, select')) return;

    const closestAction = target.closest('[data-action]');
    if (!closestAction) return;

    const action = closestAction.dataset.action;
    if (!action) return;

    e.preventDefault();
    e.stopPropagation();

    switch (action) {
      case 'home':
      case 'back':
        this.goHome();
        break;
      case 'add':
        this.showAddModal();
        break;
      case 'view':
        const viewId = parseInt(closestAction.dataset.id);
        if (viewId) this.viewFlashcard(viewId);
        break;
      case 'edit':
        const editId = parseInt(closestAction.dataset.id);
        if (editId) this.showEditModal(editId);
        break;
      case 'delete':
        const deleteId = parseInt(closestAction.dataset.id);
        if (deleteId) this.showDeleteModal(deleteId);
        break;
      case 'close-modal':
        this.closeAllModals();
        break;
      case 'cancel-delete':
        this.closeDeleteModal();
        break;
      case 'confirm-delete':
        this.executeDelete();
        break;
      case 'clear-search':
        this.searchQuery = '';
        this.renderHome();
        break;
      case 'export':
        dataManager.exportData();
        break;
      case 'reset':
        if (confirm('Reinitialiser toutes les donnees ?')) {
          dataManager.resetToInitial();
        }
        break;
      case 'submit-form':
        this.handleFormSubmit();
        break;
      case 'quiz':
        this.view = 'quiz';
        this.renderQuizHome();
        break;
      case 'start-quiz':
        const category = closestAction.dataset.category;
        if (category) this.startQuiz(category);
        break;
      case 'select-answer':
        const answerIndex = parseInt(closestAction.dataset.index);
        if (!isNaN(answerIndex)) this.selectAnswer(answerIndex);
        break;
      case 'next-question':
        this.nextQuestion();
        break;
      case 'restart-quiz':
        this.startQuiz(this.quizState.category);
        break;
    }
  },

  handleInput(e) {
    if (e.target.id === 'searchInput') {
      this.searchQuery = e.target.value;
      this.renderHome();
    }
    if (e.target.id === 'deleteConfirmInput') {
      const btn = document.getElementById('confirmDeleteBtn');
      if (btn) {
        btn.disabled = e.target.value.trim().toUpperCase() !== 'SUPPRIMER';
      }
    }
  },

  handleChange(e) {
    if (e.target.id === 'categoryFilter') {
      this.currentCategory = e.target.value;
      this.renderHome();
    }
  },

  handleSubmit(e) {
    if (e.target.id === 'flashcardForm') {
      e.preventDefault();
      this.handleFormSubmit();
    }
  },

  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.closeAllModals();
    }
  },

  goHome() {
    this.view = 'home';
    this.currentFlashcard = null;
    this.renderHome();
  },

  viewFlashcard(id) {
    const flashcard = dataManager.getFlashcardById(id);
    if (!flashcard) return;
    this.currentFlashcard = flashcard;
    this.view = 'view';
    this.renderFlashcardView();
  },

  showAddModal() {
    const categories = dataManager.getCategories();
    const html = this.renderModalHTML(null, categories);
    this.openModal(html);
  },

  showEditModal(id) {
    const flashcard = dataManager.getFlashcardById(id);
    if (!flashcard) return;
    const categories = dataManager.getCategories();
    const html = this.renderModalHTML(flashcard, categories);
    this.openModal(html);
  },

  renderModalHTML(flashcard, categories) {
    const isEdit = !!flashcard;
    const existingCategories = categories.filter(c => c !== 'Tous');

    return `
      <div class="modal-overlay" id="formModal">
        <div class="modal">
          <div class="modal-header">
            <h2>
              <i class="fas ${isEdit ? 'fa-pen' : 'fa-plus'}"></i>
              ${isEdit ? 'Modifier la fiche' : 'Nouvelle fiche'}
            </h2>
            <button class="modal-close" data-action="close-modal">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form id="flashcardForm">
            ${isEdit ? `<input type="hidden" name="id" value="${flashcard.id}">` : ''}
            <div class="form-group">
              <label for="title">
                <i class="fas fa-heading"></i> Titre *
              </label>
              <input type="text" id="title" name="title" required
                value="${isEdit ? this.escapeHtml(flashcard.title) : ''}"
                placeholder="Ex: SELECT - Selection de donnees">
            </div>
            <div class="form-group">
              <label for="category">
                <i class="fas fa-folder"></i> Categorie
              </label>
              <input type="text" id="category" name="category" list="categoriesList"
                value="${isEdit ? this.escapeHtml(flashcard.category) : ''}"
                placeholder="Ex: Requetes de base">
              <datalist id="categoriesList">
                ${existingCategories.map(c => `<option value="${this.escapeHtml(c)}">`).join('')}
              </datalist>
            </div>
            <div class="form-group">
              <label for="author">
                <i class="fas fa-user"></i> Auteur
              </label>
              <input type="text" id="author" name="author"
                value="${isEdit ? this.escapeHtml(flashcard.author) : 'Anonyme'}"
                placeholder="Votre nom">
            </div>
            <div class="form-group">
              <label for="content">
                <i class="fas fa-align-left"></i> Contenu *
              </label>
              <textarea id="content" name="content" required rows="8"
                placeholder="Ecrivez le contenu de votre fiche...">${isEdit ? this.escapeHtml(flashcard.content) : ''}</textarea>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" data-action="close-modal">
                <i class="fas fa-times"></i> Annuler
              </button>
              <button type="button" class="btn btn-primary" data-action="submit-form">
                <i class="fas ${isEdit ? 'fa-save' : 'fa-plus'}"></i>
                ${isEdit ? 'Enregistrer' : 'Creer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  showDeleteModal(id) {
    const flashcard = dataManager.getFlashcardById(id);
    if (!flashcard) return;

    this.pendingDeleteId = id;
    const html = `
      <div class="modal-overlay" id="deleteConfirmModal">
        <div class="modal modal-confirm">
          <div class="modal-header">
            <h2>
              <i class="fas fa-exclamation-triangle"></i>
              Confirmer la suppression
            </h2>
            <button class="modal-close" data-action="cancel-delete">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <p class="confirm-text">Vous etes sur le point de supprimer la fiche :</p>
            <p class="confirm-title">"${this.escapeHtml(flashcard.title)}"</p>
            <p class="confirm-instruction">
              Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
            </p>
            <input type="text" id="deleteConfirmInput" class="confirm-input"
              placeholder="Tapez SUPPRIMER" autocomplete="off">
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="cancel-delete">
              <i class="fas fa-times"></i> Annuler
            </button>
            <button class="btn btn-danger" id="confirmDeleteBtn" data-action="confirm-delete" disabled>
              <i class="fas fa-trash"></i> Supprimer
            </button>
          </div>
        </div>
      </div>
    `;
    this.openModal(html);
  },

  openModal(html) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper.firstElementChild);

    if (html.includes('flashcardForm')) {
      document.getElementById('title')?.focus();
    } else if (html.includes('deleteConfirmInput')) {
      document.getElementById('deleteConfirmInput')?.focus();
    }
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  },

  closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.remove();
    this.pendingDeleteId = null;
  },

  handleFormSubmit() {
    const form = document.getElementById('flashcardForm');
    if (!form) return;

    const formData = new FormData(form);
    const idValue = formData.get('id');
    const id = idValue ? Number(idValue) : null;

    const data = {
      title: formData.get('title'),
      category: formData.get('category') || 'General',
      content: formData.get('content'),
      author: formData.get('author') || 'Anonyme'
    };

    if (!data.title || !data.content) {
      alert('Titre et contenu sont obligatoires');
      return;
    }

    if (id && !isNaN(id)) {
      console.log('Updating ID:', id, 'with data:', data);
      const result = dataManager.updateFlashcard(id, data);
      console.log('Update result:', result);
      console.log('Flashcards after update:', dataManager.getFlashcards());
    } else {
      console.log('Creating new flashcard with data:', data);
      dataManager.addFlashcard(data);
      console.log('Flashcards after add:', dataManager.getFlashcards());
    }

    this.closeAllModals();
    this.renderHome();
  },

  executeDelete() {
    if (this.pendingDeleteId) {
      dataManager.deleteFlashcard(this.pendingDeleteId);
      this.closeDeleteModal();
      this.renderHome();
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  render() {
    if (this.view === 'quiz') {
      if (this.quizState.questions.length === 0) {
        this.renderQuizHome();
      } else {
        this.renderQuiz();
      }
    } else if (this.view === 'view' && this.currentFlashcard) {
      this.renderFlashcardView();
    } else {
      this.renderHome();
    }
  },

  renderQuizHome() {
    const categories = dataManager.getQuizCategories();
    this.app.innerHTML = `
      <header class="header">
        <div class="header-content">
          <div class="header-brand">
            <i class="fas fa-database header-icon"></i>
            <h1 class="logo">SQL Knowledge</h1>
          </div>
          <nav class="nav">
            <button class="nav-btn" data-action="home">
              <i class="fas fa-home"></i> <span>Accueil</span>
            </button>
            <button class="nav-btn" data-action="add">
              <i class="fas fa-plus"></i> <span>Nouvelle Fiche</span>
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
        <section class="hero">
          <div class="hero-content">
            <i class="fas fa-brain hero-icon"></i>
            <h2>Quiz SQL</h2>
            <p>Testez vos connaissances en SQL</p>
          </div>
        </section>

        <section class="quiz-categories">
          <h3 class="section-title">Choisir une catégorie</h3>
          <div class="category-grid">
            ${categories.map(cat => {
              const count = dataManager.getQuizByCategory(cat).length;
              return `
                <button class="quiz-category-card" data-action="start-quiz" data-category="${this.escapeHtml(cat)}">
                  <i class="fas fa-clipboard-list"></i>
                  <span class="quiz-cat-name">${this.escapeHtml(cat)}</span>
                  <span class="quiz-cat-count">${count} questions</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <div class="footer-info">
            <i class="fas fa-code"></i>
            <span>SQL Knowledge Manager</span>
          </div>
        </div>
      </footer>
    `;
  },

  startQuiz(category) {
    const questions = dataManager.getQuizByCategory(category);
    this.quizState = {
      category: category,
      questions: questions,
      currentIndex: 0,
      score: 0,
      selectedAnswer: null,
      answered: false
    };
    this.view = 'quiz';
    this.renderQuiz();
  },

  renderQuiz() {
    const { category, questions, currentIndex, score, selectedAnswer, answered } = this.quizState;
    const question = questions[currentIndex];
    const total = questions.length;

    this.app.innerHTML = `
      <header class="header">
        <div class="header-content">
          <div class="header-brand">
            <i class="fas fa-database header-icon"></i>
            <h1 class="logo">SQL Knowledge</h1>
          </div>
          <nav class="nav">
            <button class="nav-btn" data-action="quiz">
              <i class="fas fa-arrow-left"></i> <span>Quitter</span>
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
        <section class="quiz-view">
          <div class="quiz-progress">
            <span class="quiz-progress-text">Question ${currentIndex + 1} sur ${total}</span>
            <div class="quiz-progress-bar">
              <div class="quiz-progress-fill" style="width: ${((currentIndex + 1) / total) * 100}%"></div>
            </div>
          </div>

          <div class="quiz-score-display">
            <i class="fas fa-star"></i>
            <span>Score: ${score}/${currentIndex + (answered ? 1 : 0)}</span>
          </div>

          <div class="quiz-question-card">
            <div class="quiz-category-tag">
              <i class="fas fa-tag"></i>
              ${this.escapeHtml(category)}
            </div>
            <h3 class="quiz-question">${this.escapeHtml(question.question)}</h3>

            <div class="quiz-options">
              ${question.options.map((opt, idx) => {
                let classes = 'quiz-option';
                if (answered) {
                  if (idx === question.correctAnswer) classes += ' correct';
                  else if (idx === selectedAnswer) classes += ' incorrect';
                } else if (selectedAnswer === idx) {
                  classes += ' selected';
                }
                return `
                  <button class="${classes}" data-action="select-answer" data-index="${idx}" ${answered ? 'disabled' : ''}>
                    <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                    <span class="option-text">${this.escapeHtml(opt)}</span>
                  </button>
                `;
              }).join('')}
            </div>

            ${answered ? `
              <div class="quiz-feedback ${selectedAnswer === question.correctAnswer ? 'correct' : 'incorrect'}">
                <i class="fas ${selectedAnswer === question.correctAnswer ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                <span>${selectedAnswer === question.correctAnswer ? 'Correct !' : 'Incorrect. La réponse correcte est ' + String.fromCharCode(65 + question.correctAnswer)}</span>
              </div>
              <button class="btn btn-primary quiz-next-btn" data-action="next-question">
                ${currentIndex < total - 1 ? '<i class="fas fa-arrow-right"></i> Question suivante' : '<i class="fas fa-flag-checkered"></i> Voir les résultats'}
              </button>
            ` : `
              <button class="btn btn-primary quiz-next-btn" data-action="select-answer" data-index="${selectedAnswer}" ${selectedAnswer === null ? 'disabled' : ''}>
                Valider la réponse
              </button>
            `}
          </div>
        </section>
      </main>
    `;
  },

  selectAnswer(index) {
    const { answered, selectedAnswer, questions, currentIndex, score } = this.quizState;

    if (answered) return;

    this.quizState.selectedAnswer = index;
    this.quizState.answered = true;

    if (index === questions[currentIndex].correctAnswer) {
      this.quizState.score++;
    }

    this.renderQuiz();
  },

  nextQuestion() {
    const { currentIndex, questions, category } = this.quizState;

    if (currentIndex < questions.length - 1) {
      this.quizState.currentIndex++;
      this.quizState.selectedAnswer = null;
      this.quizState.answered = false;
      this.renderQuiz();
    } else {
      this.showQuizResults();
    }
  },

  showQuizResults() {
    const { score, questions, category } = this.quizState;
    const total = questions.length;
    const percentage = Math.round((score / total) * 100);

    let message = '';
    let icon = '';
    if (percentage >= 80) {
      message = 'Excellent !';
      icon = 'fa-trophy';
    } else if (percentage >= 60) {
      message = 'Bien joué !';
      icon = 'fa-thumbs-up';
    } else if (percentage >= 40) {
      message = 'Pas mal !';
      icon = 'fa-meh';
    } else {
      message = 'Continuez à pratiquer !';
      icon = 'fa-book-open';
    }

    this.app.innerHTML = `
      <header class="header">
        <div class="header-content">
          <div class="header-brand">
            <i class="fas fa-database header-icon"></i>
            <h1 class="logo">SQL Knowledge</h1>
          </div>
          <nav class="nav">
            <button class="nav-btn" data-action="quiz">
              <i class="fas fa-arrow-left"></i> <span>Retour aux quiz</span>
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
        <section class="quiz-result">
          <div class="result-icon">
            <i class="fas ${icon}"></i>
          </div>
          <h2>${message}</h2>

          <div class="result-score">
            <span class="score-number">${score}</span>
            <span class="score-separator">/</span>
            <span class="score-total">${total}</span>
          </div>

          <p class="result-percentage">${percentage}% de bonnes réponses</p>
          <p class="result-category">Catégorie: ${this.escapeHtml(category)}</p>

          <div class="result-actions">
            <button class="btn btn-primary" data-action="restart-quiz">
              <i class="fas fa-redo"></i> Rejouer
            </button>
            <button class="btn btn-secondary" data-action="quiz">
              <i class="fas fa-list"></i> Choisir une autre catégorie
            </button>
            <button class="btn btn-secondary" data-action="home">
              <i class="fas fa-home"></i> Retour à l'accueil
            </button>
          </div>
        </section>
      </main>
    `;
  },

  renderHome() {
    const flashcards = dataManager.getFlashcards();
    const categories = dataManager.getCategories();
    const filtered = dataManager.getFilteredFlashcards(this.currentCategory, this.searchQuery);

    this.app.innerHTML = `
      <header class="header">
        <div class="header-content">
          <div class="header-brand">
            <i class="fas fa-database header-icon"></i>
            <h1 class="logo">SQL Knowledge</h1>
          </div>
          <nav class="nav">
            <button class="nav-btn" data-action="home">
              <i class="fas fa-home"></i> <span>Accueil</span>
            </button>
            <button class="nav-btn" data-action="quiz">
              <i class="fas fa-brain"></i> <span>Quiz</span>
            </button>
            <button class="nav-btn" data-action="add">
              <i class="fas fa-plus"></i> <span>Nouvelle Fiche</span>
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
        <section class="hero">
          <div class="hero-content">
            <i class="fas fa-graduation-cap hero-icon"></i>
            <h2>Bienvenue sur SQL Knowledge</h2>
            <p>Explorez, apprenez et partagez vos connaissances en SQL</p>
          </div>
        </section>

        <section class="features-bar">
          <div class="feature-item">
            <i class="fas fa-file-alt"></i>
            <span>${flashcards.length} Fiches</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-folder"></i>
            <span>${categories.length - 1} Categories</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-search"></i>
            <span>Recherche</span>
          </div>
          <div class="feature-item">
            <i class="fas fa-edit"></i>
            <span>Modification</span>
          </div>
        </section>

        <section class="controls">
          <div class="search-wrapper">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="searchInput" class="search-input"
              placeholder="Rechercher une fiche..." value="${this.escapeHtml(this.searchQuery)}">
            ${this.searchQuery ? '<button class="search-clear" data-action="clear-search"><i class="fas fa-times"></i></button>' : ''}
          </div>
          <div class="filter-wrapper">
            <i class="fas fa-filter filter-icon"></i>
            <select id="categoryFilter" class="filter-select">
              ${categories.map(c => `
                <option value="${this.escapeHtml(c)}" ${c === this.currentCategory ? 'selected' : ''}>
                  ${this.escapeHtml(c)}
                </option>
              `).join('')}
            </select>
          </div>
        </section>

        <section class="results-info">
          <span>${filtered.length} fiche${filtered.length !== 1 ? 's' : ''} trouvee${filtered.length !== 1 ? 's' : ''}</span>
        </section>

        <section class="flashcards-grid">
          ${filtered.length === 0 ? `
            <div class="empty-state">
              <i class="fas fa-folder-open empty-icon"></i>
              <p>Aucune fiche trouvee</p>
              <button class="btn btn-primary" data-action="add">
                <i class="fas fa-plus"></i> Creer une fiche
              </button>
            </div>
          ` : filtered.map(f => this.renderFlashcardCard(f)).join('')}
        </section>
      </main>

      <footer class="footer">
        <div class="footer-content">
          <div class="footer-info">
            <i class="fas fa-code"></i>
            <span>SQL Knowledge Manager</span>
          </div>
          <div class="footer-actions">
            <button data-action="export">
              <i class="fas fa-download"></i> Exporter
            </button>
            <button data-action="reset" class="danger">
              <i class="fas fa-trash-alt"></i> Reinitialiser
            </button>
          </div>
        </div>
      </footer>
    `;
  },

  renderFlashcardCard(f) {
    const excerpt = f.content.substring(0, 120) + (f.content.length > 120 ? '...' : '');
    return `
      <article class="flashcard-card" data-action="view" data-id="${f.id}">
        <div class="card-category">
          <i class="fas fa-tag"></i>
          ${this.escapeHtml(f.category)}
        </div>
        <h3 class="card-title">${this.escapeHtml(f.title)}</h3>
        <p class="card-excerpt">${this.escapeHtml(excerpt).replace(/\n/g, '<br>')}</p>
        <div class="card-footer">
          <div class="card-author">
            <i class="fas fa-user"></i>
            ${this.escapeHtml(f.author)}
          </div>
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" data-id="${f.id}" title="Modifier">
              <i class="fas fa-pen"></i>
            </button>
            <button class="icon-btn danger" data-action="delete" data-id="${f.id}" title="Supprimer">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </article>
    `;
  },

  renderFlashcardView() {
    const f = this.currentFlashcard;
    const formattedDate = new Date(f.createdAt).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.app.innerHTML = `
      <header class="header">
        <div class="header-content">
          <div class="header-brand">
            <i class="fas fa-database header-icon"></i>
            <h1 class="logo">SQL Knowledge</h1>
          </div>
          <nav class="nav">
            <button class="nav-btn" data-action="back">
              <i class="fas fa-arrow-left"></i> <span>Retour</span>
            </button>
            <button class="nav-btn" data-action="edit" data-id="${f.id}">
              <i class="fas fa-pen"></i> <span>Modifier</span>
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
        <article class="flashcard-view">
          <div class="flashcard-header">
            <div class="flashcard-category">
              <i class="fas fa-tag"></i>
              ${this.escapeHtml(f.category)}
            </div>
            <h2>${this.escapeHtml(f.title)}</h2>
            <div class="flashcard-meta">
              <span><i class="fas fa-user"></i> ${this.escapeHtml(f.author)}</span>
              <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
            </div>
          </div>
          <div class="flashcard-content">
            ${f.content.split('\n').map(line =>
              `<p>${this.escapeHtml(line) || '&nbsp;'}</p>`
            ).join('')}
          </div>
        </article>
      </main>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());