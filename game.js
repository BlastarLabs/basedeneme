import { sdk } from 'https://esm.sh/@farcaster/frame-sdk';

// Farcaster SDK hazır
sdk.actions.ready();

// LocalStorage key'leri
const STORAGE_KEY = 'daily-habits';
const DATE_KEY = 'last-check-date';

// DOM elementleri
const habitInput = document.getElementById('habit-input');
const addBtn = document.getElementById('add-btn');
const habitsList = document.getElementById('habits-list');
const emptyState = document.getElementById('empty-state');
const todayCount = document.getElementById('today-count');
const streakCount = document.getElementById('streak-count');

// Habit veri yapısı: { id, name, completedDates: ['2024-01-15', ...], currentStreak: 3 }
let habits = [];

// Sayfa yüklendiğinde
init();

function init() {
    loadHabits();
    checkNewDay();
    renderHabits();
    updateStats();

    // Event listeners
    addBtn.addEventListener('click', addHabit);
    habitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addHabit();
        }
    });

    // Mobil touch desteği
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
}

function handleTouchStart(e) {
    // Touch event'leri için özel işlem gerekmez, CSS touch-action ile halledildi
}

function loadHabits() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            habits = JSON.parse(stored);
        } catch (e) {
            habits = [];
        }
    }
}

function saveHabits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
}

function checkNewDay() {
    const today = getTodayDate();
    const lastCheck = localStorage.getItem(DATE_KEY);

    if (lastCheck !== today) {
        // Yeni gün başladı, önceki günün tamamlanmamış alışkanlıklarını sıfırla
        habits.forEach(habit => {
            // Eğer dün tamamlandıysa streak'i artır, değilse sıfırla
            const yesterday = getYesterdayDate();
            const wasCompletedYesterday = habit.completedDates.includes(yesterday);
            
            if (!wasCompletedYesterday && habit.currentStreak > 0) {
                habit.currentStreak = 0;
            }
        });
        
        localStorage.setItem(DATE_KEY, today);
        saveHabits();
    }
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function addHabit() {
    const name = habitInput.value.trim();
    if (!name) return;

    const newHabit = {
        id: Date.now(),
        name: name,
        completedDates: [],
        currentStreak: 0
    };

    habits.push(newHabit);
    habitInput.value = '';
    saveHabits();
    renderHabits();
    updateStats();
    
    // Input'a focus geri ver
    habitInput.focus();
}

function toggleHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const today = getTodayDate();
    const isCompleted = habit.completedDates.includes(today);

    if (isCompleted) {
        // Tamamlanmayı kaldır
        habit.completedDates = habit.completedDates.filter(d => d !== today);
        // Streak'i yeniden hesapla
        recalculateStreak(habit);
    } else {
        // Tamamlandı olarak işaretle
        habit.completedDates.push(today);
        
        // Streak kontrolü
        const yesterday = getYesterdayDate();
        if (habit.completedDates.includes(yesterday)) {
            habit.currentStreak += 1;
        } else {
            habit.currentStreak = 1;
        }
    }

    saveHabits();
    renderHabits();
    updateStats();
}

function recalculateStreak(habit) {
    // Tarihleri sırala
    const sortedDates = habit.completedDates.sort();
    if (sortedDates.length === 0) {
        habit.currentStreak = 0;
        return;
    }

    // Bugünün tarihini al
    const today = getTodayDate();
    
    // En son tamamlanan tarihten geriye doğru seriyi say
    let streak = 0;
    let currentDate = new Date(today);
    
    // Bugün tamamlandıysa onu sayma (çünkü geri alınıyor)
    const datesToCheck = sortedDates.filter(d => d !== today);
    
    for (let i = datesToCheck.length - 1; i >= 0; i--) {
        const checkDate = new Date(datesToCheck[i]);
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - 1);
        
        if (datesToCheck[i] === expectedDate.toISOString().split('T')[0]) {
            streak++;
            currentDate = checkDate;
        } else {
            break;
        }
    }
    
    habit.currentStreak = streak;
}

function deleteHabit(id) {
    if (!confirm('Bu alışkanlığı silmek istediğinize emin misiniz?')) {
        return;
    }
    
    habits = habits.filter(h => h.id !== id);
    saveHabits();
    renderHabits();
    updateStats();
}

function renderHabits() {
    if (habits.length === 0) {
        habitsList.classList.remove('has-habits');
        emptyState.classList.remove('hidden');
        return;
    }

    habitsList.classList.add('has-habits');
    emptyState.classList.add('hidden');

    const today = getTodayDate();
    habitsList.innerHTML = habits.map(habit => {
        const isCompleted = habit.completedDates.includes(today);
        const streakText = habit.currentStreak > 0 
            ? `🔥 ${habit.currentStreak} gün seri` 
            : 'Yeni başla!';

        return `
            <div class="habit-item">
                <div class="habit-checkbox ${isCompleted ? 'checked' : ''}" 
                     data-id="${habit.id}">
                </div>
                <div class="habit-content">
                    <div class="habit-name">${escapeHtml(habit.name)}</div>
                    <div class="habit-streak ${habit.currentStreak > 0 ? 'active' : ''}">
                        ${streakText}
                    </div>
                </div>
                <button class="habit-delete" data-id="${habit.id}">×</button>
            </div>
        `;
    }).join('');

    // Event listeners ekle
    habitsList.querySelectorAll('.habit-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', () => {
            const id = parseInt(checkbox.dataset.id);
            toggleHabit(id);
        });
    });

    habitsList.querySelectorAll('.habit-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            deleteHabit(id);
        });
    });
}

function updateStats() {
    const today = getTodayDate();
    const completedToday = habits.filter(h => 
        h.completedDates.includes(today)
    ).length;
    const totalHabits = habits.length;

    todayCount.textContent = `${completedToday}/${totalHabits}`;

    // En uzun seriyi bul
    const maxStreak = habits.length > 0 
        ? Math.max(...habits.map(h => h.currentStreak), 0)
        : 0;
    
    streakCount.textContent = maxStreak > 0 ? `${maxStreak} gün` : '0 gün';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

