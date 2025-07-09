// 전역 변수
let records = JSON.parse(localStorage.getItem('fitnessRecords')) || [];
let customExercises = JSON.parse(localStorage.getItem('customExercises')) || [];
let weightChart, exerciseTimeChart, exerciseTypeChart, calorieChart, distanceChart, stepsChart;
let filteredRecords = [...records];

// 기본 운동 종류
const defaultExercises = [
    { name: '걷기', icon: '🚶‍♂️', hasDistance: true },
    { name: '달리기', icon: '🏃‍♂️', hasDistance: true },
    { name: '일립티컬', icon: '🏃‍♀️', hasDistance: false },
    { name: '수영', icon: '🏊‍♂️', hasDistance: true },
    { name: '웨이트', icon: '🏋️‍♂️', hasDistance: false }
];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 오늘 날짜 설정
    document.getElementById('date').valueAsDate = new Date();
    
    // 운동 목록 초기화
    initializeExercises();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 모든 UI 업데이트
    updateAll();
});

// 운동 목록 초기화
function initializeExercises() {
    updateExerciseSelects();
    updateExerciseList();
}

// 모든 운동 가져오기 (기본 + 사용자 추가)
function getAllExercises() {
    return [...defaultExercises, ...customExercises];
}

// 운동 선택 드롭다운 업데이트
function updateExerciseSelects() {
    const exercises = getAllExercises();
    
    // 기록 입력 탭의 선택 박스
    const exerciseSelect = document.getElementById('exerciseType');
    exerciseSelect.innerHTML = '<option value="">선택하세요</option>';
    
    // 필터의 선택 박스
    const filterSelect = document.getElementById('filterExercise');
    filterSelect.innerHTML = '<option value="">전체</option>';
    
    exercises.forEach(exercise => {
        const option1 = document.createElement('option');
        option1.value = exercise.name;
        option1.textContent = `${exercise.icon} ${exercise.name}`;
        exerciseSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = exercise.name;
        option2.textContent = `${exercise.icon} ${exercise.name}`;
        filterSelect.appendChild(option2);
    });
}

// 설정 탭의 운동 목록 업데이트
function updateExerciseList() {
    const exerciseList = document.getElementById('exerciseList');
    const exercises = getAllExercises();
    
    exerciseList.innerHTML = exercises.map((exercise, index) => `
        <div class="exercise-item">
            <span class="exercise-name">${exercise.icon} ${exercise.name}</span>
            <div>
                ${exercise.hasDistance ? '<span style="font-size: 12px; color: #666; margin-right: 10px;">거리 기록</span>' : ''}
                ${index >= defaultExercises.length ? 
                    `<button class="exercise-remove-btn" onclick="removeCustomExercise(${index - defaultExercises.length})">삭제</button>` : 
                    '<span style="font-size: 12px; color: #999;">기본 운동</span>'
                }
            </div>
        </div>
    `).join('');
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 운동 종류 선택 시 세부 필드 표시
    document.getElementById('exerciseType').addEventListener('change', function() {
        const exerciseFields = document.getElementById('exerciseFields');
        const distanceField = document.getElementById('distance').parentElement;
        
        if (this.value) {
            exerciseFields.classList.add('show');
            
            // 선택된 운동이 거리 기록이 필요한지 확인
            const selectedExercise = getAllExercises().find(ex => ex.name === this.value);
            if (selectedExercise && selectedExercise.hasDistance) {
                distanceField.style.display = 'block';
            } else {
                distanceField.style.display = 'none';
                document.getElementById('distance').value = '';
            }
        } else {
            exerciseFields.classList.remove('show');
        }
    });

    // 필터 이벤트 리스너
    document.getElementById('filterDate').addEventListener('change', applyFilters);
    document.getElementById('filterExercise').addEventListener('change', applyFilters);
    document.getElementById('filterKeyword').addEventListener('input', applyFilters);

    // 폼 제출 처리
    document.getElementById('recordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newRecord = {
            id: Date.now(),
            date: document.getElementById('date').value,
            weight: parseFloat(document.getElementById('weight').value) || null,
            steps: parseInt(document.getElementById('steps').value) || null,
            exerciseType: document.getElementById('exerciseType').value,
            duration: parseInt(document.getElementById('duration').value) || null,
            calories: parseInt(document.getElementById('calories').value) || null,
            distance: parseFloat(document.getElementById('distance').value) || null,
            notes: document.getElementById('notes').value
        };

        records.unshift(newRecord);
        localStorage.setItem('fitnessRecords', JSON.stringify(records));
        
        // 폼 초기화
        document.getElementById('recordForm').reset();
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('exerciseFields').classList.remove('show');
        
        updateAll();
        alert('기록이 저장되었습니다! 💪');
        
        // 대시보드 탭으로 이동
        switchTab('dashboard');
        document.querySelector('[onclick="switchTab(\'dashboard\')"]').click();
    });

    // 파일 입력 이벤트
    document.getElementById('importFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.records && Array.isArray(data.records)) {
                        records = data.records;
                        localStorage.setItem('fitnessRecords', JSON.stringify(records));
                        
                        if (data.customExercises && Array.isArray(data.customExercises)) {
                            customExercises = data.customExercises;
                            localStorage.setItem('customExercises', JSON.stringify(customExercises));
                            initializeExercises();
                        }
                        
                        updateAll();
                        alert('데이터를 성공적으로 가져왔습니다!');
                    } else {
                        alert('올바른 데이터 파일이 아닙니다.');
                    }
                } catch (error) {
                    alert('파일을 읽는 중 오류가 발생했습니다.');
                }
            };
            reader.readAsText(file);
        }
    });
}

// 탭 전환 함수
function switchTab(tabName) {
    // 모든 탭 버튼과 콘텐츠를 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // 그래프 탭이 선택되면 그래프 업데이트
    if (tabName === 'charts') {
        setTimeout(updateCharts, 100);
    }
}

// 운동 추가 모달 표시
function showAddExerciseModal() {
    document.getElementById('addExerciseModal').style.display = 'block';
}

// 운동 추가 모달 닫기
function closeAddExerciseModal() {
    document.getElementById('addExerciseModal').style.display = 'none';
    document.getElementById('modalExerciseName').value = '';
    document.getElementById('modalExerciseIcon').value = '';
    document.getElementById('modalExerciseDistance').checked = false;
}

// 모달에서 운동 추가
function addExerciseFromModal() {
    const name = document.getElementById('modalExerciseName').value.trim();
    const icon = document.getElementById('modalExerciseIcon').value.trim();
    const hasDistance = document.getElementById('modalExerciseDistance').checked;
    
    if (!name) {
        alert('운동 이름을 입력해주세요.');
        return;
    }
    
    // 중복 확인
    const allExercises = getAllExercises();
    if (allExercises.some(ex => ex.name === name)) {
        alert('이미 존재하는 운동입니다.');
        return;
    }
    
    const newExercise = {
        name: name,
        icon: icon || '🏃‍♂️',
        hasDistance: hasDistance
    };
    
    customExercises.push(newExercise);
    localStorage.setItem('customExercises', JSON.stringify(customExercises));
    
    initializeExercises();
    closeAddExerciseModal();
    alert('운동이 추가되었습니다!');
}

// 설정에서 운동 추가
function addNewExercise() {
    const name = document.getElementById('newExerciseName').value.trim();
    const icon = document.getElementById('newExerciseIcon').value.trim();
    const hasDistance = document.getElementById('newExerciseDistance').checked;
    
    if (!name) {
        alert('운동 이름을 입력해주세요.');
        return;
    }
    
    // 중복 확인
    const allExercises = getAllExercises();
    if (allExercises.some(ex => ex.name === name)) {
        alert('이미 존재하는 운동입니다.');
        return;
    }
    
    const newExercise = {
        name: name,
        icon: icon || '🏃‍♂️',
        hasDistance: hasDistance
    };
    
    customExercises.push(newExercise);
    localStorage.setItem('customExercises', JSON.stringify(customExercises));
    
    // 입력 필드 초기화
    document.getElementById('newExerciseName').value = '';
    document.getElementById('newExerciseIcon').value = '';
    document.getElementById('newExerciseDistance').checked = false;
    
    initializeExercises();
    alert('운동이 추가되었습니다!');
}

// 사용자 추가 운동 삭제
function removeCustomExercise(index) {
    if (confirm('이 운동을 삭제하시겠습니까?')) {
        customExercises.splice(index, 1);
        localStorage.setItem('customExercises', JSON.stringify(customExercises));
        initializeExercises();
        alert('운동이 삭제되었습니다.');
    }
}

// 데이터 내보내기
function exportData() {
    const data = {
        records: records,
        customExercises: customExercises,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('데이터가 내보내기 되었습니다!');
}

// 데이터 가져오기
function importData() {
    document.getElementById('importFile').click();
}

// 모든 데이터 삭제
function clearAllData() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        if (confirm('마지막 확인: 모든 기록과 사용자 추가 운동이 삭제됩니다.')) {
            records = [];
            customExercises = [];
            localStorage.removeItem('fitnessRecords');
            localStorage.removeItem('customExercises');
            initializeExercises();
            updateAll();
            alert('모든 데이터가 삭제되었습니다.');
        }
    }
}

// 기록 삭제
function deleteRecord(id) {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
        records = records.filter(record => record.id !== id);
        localStorage.setItem('fitnessRecords', JSON.stringify(records));
        updateAll();
    }
}

// 필터 적용
function applyFilters() {
    const dateFilter = document.getElementById('filterDate').value;
    const exerciseFilter = document.getElementById('filterExercise').value;
    const keywordFilter = document.getElementById('filterKeyword').value.toLowerCase();

    filteredRecords = records.filter(record => {
        const dateMatch = !dateFilter || record.date === dateFilter;
        const exerciseMatch = !exerciseFilter || record.exerciseType === exerciseFilter;
        const keywordMatch = !keywordFilter || record.notes.toLowerCase().includes(keywordFilter);
        
        return dateMatch && exerciseMatch && keywordMatch;
    });

    displayFilteredRecords();
}

// 필터 초기화
function clearFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterExercise').value = '';
    document.getElementById('filterKeyword').value = '';
    filteredRecords = [...records];
    displayFilteredRecords();
}

// 모든 UI 업데이트
function updateAll() {
    filteredRecords = [...records];
    displayFilteredRecords();
    displayRecentRecords();
    updateStats();
    updateCharts();
}

// 통계 업데이트 함수 수정 (거리 소수점 두자리)
function updateStats() {
    document.getElementById('totalRecords').textContent = records.length;
    
    const weightRecords = records.filter(r => r.weight).map(r => r.weight);
    const totalExerciseTime = records.filter(r => r.duration).reduce((sum, r) => sum + r.duration, 0);
    const totalCalories = records.filter(r => r.calories).reduce((sum, r) => sum + r.calories, 0);
    const totalDistance = records.filter(r => r.distance).reduce((sum, r) => sum + r.distance, 0);
    
    // 걸음수 통계
    const stepsRecords = records.filter(r => r.steps);
    const totalSteps = stepsRecords.reduce((sum, r) => sum + r.steps, 0);
    const avgSteps = stepsRecords.length > 0 ? Math.round(totalSteps / stepsRecords.length) : 0;
    
    // 기본 통계 업데이트 (거리 소수점 두자리)
    document.getElementById('totalExerciseTime').textContent = totalExerciseTime.toLocaleString();
    document.getElementById('totalCalories').textContent = totalCalories.toLocaleString();
    document.getElementById('totalDistance').textContent = totalDistance.toFixed(2); // 소수점 두자리
    document.getElementById('totalSteps').textContent = totalSteps.toLocaleString();
    document.getElementById('avgSteps').textContent = avgSteps.toLocaleString();
    
    // 체중 관련
    if (weightRecords.length > 0) {
        const currentWeight = weightRecords[0];
        document.getElementById('currentWeight').textContent = currentWeight;
        
        if (weightRecords.length > 1) {
            const weightChange = currentWeight - weightRecords[weightRecords.length - 1];
            const changeElement = document.getElementById('weightChange');
            changeElement.textContent = (weightChange > 0 ? '+' : '') + weightChange.toFixed(1);
            changeElement.style.color = weightChange > 0 ? '#ff6b6b' : '#4ecdc4';
        }
    }
    
    // 새로운 대시보드 통계 업데이트
    updateDashboardStats();
}

// 새로운 대시보드 통계 업데이트
function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = getWeekStart(new Date());
    
    // 오늘 걸음수
    const todayRecord = records.find(r => r.date === today);
    const todaySteps = todayRecord ? todayRecord.steps || 0 : 0;
    document.getElementById('todaySteps').textContent = todaySteps.toLocaleString();
    
    // 이번 주 칼로리
    const weeklyCalories = records
        .filter(r => new Date(r.date) >= thisWeekStart && r.calories)
        .reduce((sum, r) => sum + r.calories, 0);
    document.getElementById('weeklyCalories').textContent = weeklyCalories.toLocaleString();
    
    // 이번 주 운동 횟수
    const weeklyWorkouts = records
        .filter(r => new Date(r.date) >= thisWeekStart && r.exerciseType).length;
    document.getElementById('weeklyWorkoutCount').textContent = weeklyWorkouts;
    
    // 진행률 업데이트
    updateProgressBars(weeklyWorkouts, todaySteps);
    
    // 운동 스트릭 업데이트
    updateStreak();
    
    // 스트릭 달력 업데이트
    updateStreakCalendar();
}

// 진행률 바 업데이트
function updateProgressBars(weeklyWorkouts, todaySteps) {
    // 주간 운동 목표 (5회)
    const weeklyGoal = 5;
    const weeklyProgress = Math.min((weeklyWorkouts / weeklyGoal) * 100, 100);
    document.getElementById('weeklyWorkoutProgress').style.width = weeklyProgress + '%';
    document.getElementById('weeklyWorkoutText').textContent = 
        weeklyWorkouts >= weeklyGoal ? 
        '🎉 목표 달성!' : 
        `목표까지 ${weeklyGoal - weeklyWorkouts}회 남음`;
    
    // 일일 걸음 목표 (10,000보)
    const dailyGoal = 10000;
    const dailyProgress = Math.min((todaySteps / dailyGoal) * 100, 100);
    document.getElementById('dailyStepsProgress').style.width = dailyProgress + '%';
    document.getElementById('todayStepsProgress').textContent = todaySteps.toLocaleString();
    document.getElementById('dailyStepsText').textContent = 
        todaySteps >= dailyGoal ? 
        '🎉 목표 달성!' : 
        `목표까지 ${(dailyGoal - todaySteps).toLocaleString()}보 남음`;
}

// 운동 스트릭 계산
function updateStreak() {
    const sortedDates = records
        .filter(r => r.exerciseType)
        .map(r => r.date)
        .sort()
        .reverse();
    
    if (sortedDates.length === 0) {
        document.getElementById('currentStreak').textContent = '0';
        return;
    }
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < sortedDates.length; i++) {
        const recordDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currentDate - recordDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === streak) {
            streak++;
        } else if (diffDays === streak + 1 && streak === 0) {
            // 어제 운동했지만 오늘은 안 함
            streak++;
        } else {
            break;
        }
        
        currentDate = recordDate;
    }
    
    document.getElementById('currentStreak').textContent = streak;
}

// 스트릭 달력 업데이트 (최근 2주)
function updateStreakCalendar() {
    const calendar = document.getElementById('streakCalendar');
    const today = new Date();
    const workoutDates = new Set(records.filter(r => r.exerciseType).map(r => r.date));
    
    calendar.innerHTML = '';
    
    // 최근 14일 표시
    for (let i = 13; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        if (workoutDates.has(dateStr)) {
            dayElement.classList.add('workout');
        }
        
        if (dateStr === today.toISOString().split('T')[0]) {
            dayElement.classList.add('today');
        }
        
        calendar.appendChild(dayElement);
    }
}

// 주의 시작일 구하기 (월요일)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// 걸음수 달성도 표시
function getStepsAchievement(steps) {
    if (steps >= 10000) {
        return '<span class="steps-achievement"><span class="achievement-icon achievement-excellent">🏆</span></span>';
    } else if (steps >= 8000) {
        return '<span class="steps-achievement"><span class="achievement-icon achievement-good">👍</span></span>';
    }
    return '';
}

// 운동 아이콘 가져오기
function getExerciseIcon(exerciseName) {
    const exercise = getAllExercises().find(ex => ex.name === exerciseName);
    return exercise ? exercise.icon : '🏃‍♂️';
}

// 최근 기록 표시 (대시보드용) - 거리 소수점 두자리
function displayRecentRecords() {
    const recentRecords = document.getElementById('recentRecords');
    const recent = records.slice(0, 5);
    
    if (recent.length === 0) {
        recentRecords.innerHTML = '<p class="no-data">아직 기록이 없습니다. 기록 입력 탭에서 첫 번째 기록을 남겨보세요! 💪</p>';
        return;
    }

    recentRecords.innerHTML = recent.map(record => `
        <div class="record-item" style="margin-bottom: 10px;">
            <div class="record-header">
                <span class="record-date">${formatDate(record.date)}</span>
                <div>
                    ${record.weight ? `<span class="record-weight">${record.weight}kg</span>` : ''}
                    ${record.steps ? `<span class="steps-info">👟 ${record.steps.toLocaleString()}걸음${getStepsAchievement(record.steps)}</span>` : ''}
                </div>
            </div>
            
            ${record.exerciseType ? `
                <div class="record-exercise">
                    <span class="exercise-type">${getExerciseIcon(record.exerciseType)} ${record.exerciseType}</span>
                    <div class="exercise-details">
                        ${record.duration ? `<span class="exercise-detail">⏱️ ${record.duration}분</span>` : ''}
                        ${record.calories ? `<span class="exercise-detail">🔥 ${record.calories} kcal</span>` : ''}
                        ${record.distance ? `<span class="exercise-detail">📏 ${record.distance.toFixed(2)}km</span>` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 필터링된 기록 표시 - 거리 소수점 두자리
function displayFilteredRecords() {
    const recordsList = document.getElementById('recordsList');
    
    if (filteredRecords.length === 0) {
        recordsList.innerHTML = '<p class="no-data">조건에 맞는 기록이 없습니다.</p>';
        return;
    }

    recordsList.innerHTML = filteredRecords.map(record => `
        <div class="record-item">
            <div class="record-header">
                <span class="record-date">${formatDate(record.date)}</span>
                <div>
                    ${record.weight ? `<span class="record-weight">${record.weight}kg</span>` : ''}
                    ${record.steps ? `<span class="steps-info">👟 ${record.steps.toLocaleString()}걸음${getStepsAchievement(record.steps)}</span>` : ''}
                    <button class="delete-btn" onclick="deleteRecord(${record.id})">삭제</button>
                </div>
            </div>
            
            ${record.exerciseType ? `
                <div class="record-exercise">
                    <span class="exercise-type">${getExerciseIcon(record.exerciseType)} ${record.exerciseType}</span>
                    <div class="exercise-details">
                        ${record.duration ? `<span class="exercise-detail">⏱️ ${record.duration}분</span>` : ''}
                        ${record.calories ? `<span class="exercise-detail">🔥 ${record.calories} kcal</span>` : ''}
                        ${record.distance ? `<span class="exercise-detail">📏 ${record.distance.toFixed(2)}km</span>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${record.notes ? `<div class="record-notes" style="color: #666; margin-top: 10px;">${record.notes}</div>` : ''}
        </div>
    `).join('');
}

// 그래프 업데이트
function updateCharts() {
    updateWeightChart();
    updateExerciseTimeChart();
    updateExerciseTypeChart();
    updateCalorieChart();
    updateDistanceChart();
    updateStepsChart();
}

// 체중 변화 그래프 (꺾은선)
function updateWeightChart() {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    if (weightChart) {
        weightChart.destroy();
    }

    const weightData = records
        .filter(r => r.weight)
        .reverse()
        .slice(-30);

    if (weightData.length === 0) {
        drawNoDataMessage(ctx, '체중 데이터가 없습니다');
        return;
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightData.map(r => formatDateShort(r.date)),
            datasets: [{
                label: '체중 (kg)',
                data: weightData.map(r => r.weight),
                borderColor: '#4ECDC4',
                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `체중: ${context.parsed.y}kg`;
                        }
                    }
                }
            }
        }
    });
}

// 칼로리 소모 그래프 (꺾은선)
function updateCalorieChart() {
    const ctx = document.getElementById('calorieChart').getContext('2d');
    
    if (calorieChart) {
        calorieChart.destroy();
    }

    const calorieData = records
        .filter(r => r.calories)
        .reverse()
        .slice(-14);

    if (calorieData.length === 0) {
        drawNoDataMessage(ctx, '칼로리 데이터가 없습니다');
        return;
    }

    calorieChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: calorieData.map(r => formatDateShort(r.date)),
            datasets: [{
                label: '칼로리 (kcal)',
                data: calorieData.map(r => r.calories),
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `칼로리: ${context.parsed.y} kcal`;
                        }
                    }
                }
            }
        }
    });
}

// 운동시간 그래프 (꺾은선)
function updateExerciseTimeChart() {
    const ctx = document.getElementById('exerciseTimeChart').getContext('2d');
    
    if (exerciseTimeChart) {
        exerciseTimeChart.destroy();
    }

    const exerciseData = records
        .filter(r => r.duration)
        .reverse()
        .slice(-14);

    if (exerciseData.length === 0) {
        drawNoDataMessage(ctx, '운동시간 데이터가 없습니다');
        return;
    }

    exerciseTimeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: exerciseData.map(r => formatDateShort(r.date)),
            datasets: [{
                label: '운동시간 (분)',
                data: exerciseData.map(r => r.duration),
                borderColor: '#45B7D1',
                backgroundColor: 'rgba(69, 183, 209, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `운동시간: ${context.parsed.y}분`;
                        }
                    }
                }
            }
        }
    });
}

// 운동 거리 그래프 (꺾은선) - 소수점 두자리 표시
function updateDistanceChart() {
    const ctx = document.getElementById('distanceChart').getContext('2d');
    
    if (distanceChart) {
        distanceChart.destroy();
    }

    const distanceData = records
        .filter(r => r.distance)
        .reverse()
        .slice(-14);

    if (distanceData.length === 0) {
        drawNoDataMessage(ctx, '거리 데이터가 없습니다');
        return;
    }

    distanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distanceData.map(r => formatDateShort(r.date)),
            datasets: [{
                label: '거리 (km)',
                data: distanceData.map(r => r.distance),
                borderColor: '#96CEB4',
                backgroundColor: 'rgba(150, 206, 180, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toFixed(2) + 'km';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `거리: ${context.parsed.y.toFixed(2)}km`;
                        }
                    }
                }
            }
        }
    });
}

// 걸음수 그래프 (꺾은선 + 목표선)
function updateStepsChart() {
    const ctx = document.getElementById('stepsChart').getContext('2d');
    
    if (stepsChart) {
        stepsChart.destroy();
    }

    const stepsData = records
        .filter(r => r.steps)
        .reverse()
        .slice(-14);

    if (stepsData.length === 0) {
        drawNoDataMessage(ctx, '걸음수 데이터가 없습니다');
        return;
    }

    stepsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: stepsData.map(r => formatDateShort(r.date)),
            datasets: [
                {
                    label: '걸음수',
                    data: stepsData.map(r => r.steps),
                    borderColor: '#32CD32',
                    backgroundColor: 'rgba(50, 205, 50, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    pointBackgroundColor: stepsData.map(r => 
                        r.steps >= 10000 ? '#32CD32' : 
                        r.steps >= 8000 ? '#FFD700' : '#87CEEB'
                    )
                },
                {
                    label: '목표 (10,000보)',
                    data: new Array(stepsData.length).fill(10000),
                    borderColor: '#FF6B6B',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    pointRadius: 0,
                    borderWidth: 2,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `걸음수: ${context.parsed.y.toLocaleString()}보`;
                            } else {
                                return `목표: ${context.parsed.y.toLocaleString()}보`;
                            }
                        }
                    }
                }
            }
        }
    });
}

// 운동 종류별 분포 그래프 (도넛 차트)
function updateExerciseTypeChart() {
    const ctx = document.getElementById('exerciseTypeChart').getContext('2d');
    
    if (exerciseTypeChart) {
        exerciseTypeChart.destroy();
    }

    const exerciseTypes = records
        .filter(r => r.exerciseType)
        .reduce((acc, r) => {
            acc[r.exerciseType] = (acc[r.exerciseType] || 0) + 1;
            return acc;
        }, {});

    if (Object.keys(exerciseTypes).length === 0) {
        drawNoDataMessage(ctx, '운동 종류 데이터가 없습니다');
        return;
    }

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'];

    exerciseTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(exerciseTypes).map(type => {
                const exercise = getAllExercises().find(ex => ex.name === type);
                return `${exercise ? exercise.icon : '🏃‍♂️'} ${type}`;
            }),
            datasets: [{
                data: Object.values(exerciseTypes),
                backgroundColor: colors.slice(0, Object.keys(exerciseTypes).length),
                borderWidth: 2,
                borderColor: '#fff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed}회 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 데이터 없음 메시지 그리기
function drawNoDataMessage(ctx, message) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, ctx.canvas.width/2, ctx.canvas.height/2);
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return '오늘';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return '어제';
    } else {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    }
}

function formatDateShort(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('addExerciseModal');
    if (event.target === modal) {
        closeAddExerciseModal();
    }
}

// 차트 반응형 처리
window.addEventListener('resize', function() {
    if (document.getElementById('charts').classList.contains('active')) {
        setTimeout(updateCharts, 100);
    }
});

// 터치 이벤트 최적화 (모바일)
document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true});
