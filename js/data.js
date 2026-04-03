class DataManager {
  constructor() {
    this.STORAGE_KEY = 'km_sql_flashcards';
    this.data = { flashcards: [], categories: ['Tous'] };
    this.ready = false;
  }

  async init() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.data = JSON.parse(stored);
      this.ready = true;
      return;
    }
    await this.loadFromFile();
  }

  async loadFromFile() {
    try {
      const response = await fetch('./data/flashcards.json');
      this.data = await response.json();
      this.save();
      this.ready = true;
    } catch (e) {
      console.warn('Impossible de charger les donnees');
      this.ready = true;
    }
  }

  save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
  }

  getFlashcards() { return this.data.flashcards || []; }
  getCategories() { return this.data.categories || ['Tous']; }

  getFlashcardById(id) {
    return this.data.flashcards.find(f => f.id === id);
  }

  getFilteredFlashcards(category, query) {
    let results = this.getFlashcards();
    
    if (category && category !== 'Tous') {
      results = results.filter(f => f.category === category);
    }
    
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      results = results.filter(f => 
        f.title.toLowerCase().includes(q) ||
        f.content.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
      );
    }
    
    return results;
  }

  addFlashcard(flashcard) {
    const newId = Math.max(0, ...this.data.flashcards.map(f => f.id)) + 1;
    const newFlashcard = {
      id: newId,
      title: flashcard.title,
      category: flashcard.category,
      content: flashcard.content,
      author: flashcard.author || 'Anonyme',
      createdAt: new Date().toISOString()
    };
    this.data.flashcards.unshift(newFlashcard);
    this.addCategoryIfNew(flashcard.category);
    this.save();
    return newFlashcard;
  }

  updateFlashcard(id, updates) {
    const index = this.data.flashcards.findIndex(f => f.id === id);
    if (index === -1) return null;
    this.data.flashcards[index] = {
      ...this.data.flashcards[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    if (updates.category) this.addCategoryIfNew(updates.category);
    this.save();
    return this.data.flashcards[index];
  }

  deleteFlashcard(id) {
    const index = this.data.flashcards.findIndex(f => f.id === id);
    if (index === -1) return false;
    this.data.flashcards.splice(index, 1);
    this.save();
    return true;
  }

  addCategoryIfNew(category) {
    if (category && !this.data.categories.includes(category)) {
      this.data.categories.push(category);
    }
  }

  resetToInitial() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.data = { flashcards: [], categories: ['Tous'] };
    this.loadFromFile();
  }

  exportData() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'km_sql_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }
}

const dataManager = new DataManager();