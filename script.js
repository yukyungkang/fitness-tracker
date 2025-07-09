// 전역 변수
let records = JSON.parse(localStorage.getItem('fitnessRecords')) || [];
let customExercises = JSON.parse(localStorage.getItem('customExercises')) || [];
let weightChart, exerciseTimeChart, exerciseTypeChart, calorieChart, distanceChart, stepsChart;
let filteredRecords = [...records];

// Google API 관련 변수
let isGapiLoaded = false;
let isGsiLoaded = false;
let isSignedIn = false;
let currentUser = null;
const DATA_FILE_NAME = 'fitness-tracker-data.json';

// 기본 운동 종류
const defaultExercises = [
    { name: '걷기', icon: '🚶‍♂️', hasDistance: true },
    { name: '달리기', icon: '🏃‍♂️', hasDistance: true },
    { name: '일립티컬', icon: '🏃‍♀️', hasDistance: false },
    { name: '수영', icon: '🏊‍♂️', hasDistance: true },
    { name: '웨이트', icon: '🏋️‍♂️', hasDistance: false }
];

// Google API 설정
const GOOGLE_CONFIG = {
    API_KEY: 'AIzaSyB3wkHrjGvPaQ9PMhqEWn9lFH5MKlj-HjU',
    CLIENT_ID: '886853522136-7ribmoatipv0h8f31od3li642ej2knfj.apps.googleusercontent.com',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.file'
};

// Google API 콜백 함수들
window.initGoogleApi = function() {
    console.log('Google API 스크립트 로드 완료');
    isGapiLoaded = true;
    checkApiReady();
};

window.initGoogleGsi = function() {
    console.log('Google GSI 스크립트 로드 완료');
    isGsiLoaded = true;
    checkApiReady();
};

function checkApiReady() {
    if (isGapiLoaded && isGsiLoaded) {
        console.log('모든 Google API 준비 완료');
        initializeGoogleAPI();
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    showLoadingScreen();
    
    // Google API가 이미 로드되어 있는지 확인
    if (typeof gapi !== 'undefined') {
        isGapiLoaded = true;
    }
    if (typeof google !== 'undefined') {
        isGsiLoaded = true;
    }
    
    // 3초 후에도 API가 로드되지 않으면 오프라인 모드로 진행
    setTimeout(() => {
        if (!isGapiLoaded || !isGsiLoaded) {
            console.log('Google API 로드 실패, 오프라인 모드로 진행');
            showLoginScreenWithOfflineOption();
        }
    }, 3000);
    
    checkApiReady();
});

// 화면 전환 함수들
function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'none';
}

function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
}

function showLoginScreenWithOfflineOption() {
    showLoginScreen();
    // 오프라인 모드 버튼 표시
    const offlineBtn = document.getElementById('offlineBtn');
    if (offlineBtn) {
        offlineBtn.style.display = 'block';
    }
}

function showAppScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
}

// 오프라인 모드 시작
function startOfflineMode() {
    console.log('오프라인 모드로 시작');
    currentUser = {
        id: 'offline_user',
        name: '오프라인 사용자',
        email: 'offline@local',
        picture: '' // 빈 문자열로 설정
    };
    isSignedIn = false;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showAppScreen();
    initializeApp();
}
function updateUserUI() {
    if (currentUser) {
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');
        
        if (userName) userName.textContent = currentUser.name;
        if (userPhoto) {
            if (currentUser.picture && currentUser.picture !== '') {
                userPhoto.src = currentUser.picture;
                userPhoto.style.display = 'block';
            } else {
                // 이미지 대신 배경과 텍스트로 아바타 만들기
                userPhoto.style.display = 'none';
                userPhoto.parentElement.innerHTML = `
                    <div class="user-avatar-text">
                        ${currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <span class="user-name">${currentUser.name}</span>
                        <button id="signOutBtn" class="sign-out-btn">로그아웃</button>
                    </div>
                `;
                // 로그아웃 버튼 이벤트 재설정
                document.getElementById('signOutBtn').addEventListener('click', handleSignOut);
            }
        }
        updateLastSyncTime();
    }
}

// Google API 초기화 개선
function initializeGoogleAPI() {
    console.log('Google API 초기화 시작...');
    
    if (!isGapiLoaded) {
        console.error('GAPI가 로드되지 않음');
        showLoginScreenWithOfflineOption();
        return;
    }

    gapi.load('client', async () => {
        try {
            console.log('GAPI client 초기화 중...');
            await gapi.client.init({
                apiKey: GOOGLE_CONFIG.API_KEY,
                discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC]
            });
            
            console.log('GAPI 초기화 완료');
            setupGoogleSignIn();
            checkExistingLogin();
            
        } catch (error) {
            console.error('GAPI 초기화 실패:', error);
            showLoginScreenWithOfflineOption();
        }
    });
}

function checkExistingLogin() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser.id !== 'offline_user') {
                isSignedIn = true;
                console.log('기존 온라인 사용자 복원');
            } else {
                isSignedIn = false;
                console.log('오프라인 사용자 복원');
            }
            showAppScreen();
            initializeApp();
        } catch (error) {
            console.error('저장된 사용자 정보 오류:', error);
            localStorage.removeItem('currentUser');
            showLoginScreen();
        }
    } else {
        showLoginScreen();
    }
}

function setupGoogleSignIn() {
    if (!isGsiLoaded) {
        console.warn('GSI가 로드되지 않음');
        return;
    }
    
    const signInBtn = document.getElementById('googleSignInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const offlineBtn = document.getElementById('offlineBtn');
    
    if (signInBtn) {
        signInBtn.addEventListener('click', handleSignIn);
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
    if (offlineBtn) {
        offlineBtn.addEventListener('click', startOfflineMode);
    }
}

// 로그인 처리 개선
async function handleSignIn() {
    try {
        showSyncStatus('로그인 중...', 'syncing');
        
        // 실제 Google 로그인 대신 모의 로그인
        const mockUser = {
            id: 'demo_user_' + Date.now(),
            name: '데모 사용자',
            email: 'demo@example.com',
            picture: 'https://via.placeholder.com/150/4ECDC4/ffffff?text=USER'
        };
        
        currentUser = mockUser;
        isSignedIn = true;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showAppScreen();
        updateUserUI();
        await initializeApp();
        await loadFromGoogleDrive();
        
        showSyncStatus('동기화됨', 'synced');
        
    } catch (error) {
        console.error('로그인 실패:', error);
        showSyncStatus('로그인 실패', 'error');
        alert('로그인에 실패했습니다. 오프라인 모드를 사용해보세요.');
    }
}

async function handleSignOut() {
    if (confirm('로그아웃하시겠습니까? 로컬 데이터는 유지됩니다.')) {
        try {
            if (isSignedIn) {
                await saveToGoogleDrive();
            }
            currentUser = null;
            isSignedIn = false;
            localStorage.removeItem('currentUser');
            showLoginScreen();
        } catch (error) {
            console.error('로그아웃 중 오류:', error);
        }
    }
}

function updateUserUI() {
    if (currentUser) {
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');
        if (userName) userName.textContent = currentUser.name;
        if (userPhoto) userPhoto.src = currentUser.picture;
        updateLastSyncTime();
    }
}

function showSyncStatus(message, status) {
    status = status || 'synced';
    const syncStatus = document.getElementById('syncStatus');
    const syncText = syncStatus ? syncStatus.querySelector('.sync-text') : null;
    const syncIcon = syncStatus ? syncStatus.querySelector('.sync-icon') : null;
    
    if (syncText) syncText.textContent = message;
    if (syncIcon) {
        switch (status) {
            case 'syncing':
                syncIcon.textContent = '🔄';
                break;
            case 'error':
                syncIcon.textContent = '❌';
                break;
            default:
                syncIcon.textContent = '☁️';
        }
    }
    if (syncStatus) {
        syncStatus.className = 'sync-status ' + status;
    }
}

async function saveToGoogleDrive() {
    if (!isSignedIn) return;
    
    try {
        showSyncStatus('동기화 중...', 'syncing');
        const data = {
            records: records,
            customExercises: customExercises,
            lastUpdated: new Date().toISOString(),
            version: '1.0'
        };
        
        // 실제 Google Drive 대신 로컬 스토리지에 백업
        localStorage.setItem('cloudBackup', JSON.stringify(data));
        localStorage.setItem('lastSyncTime', new Date().toISOString());
        
        console.log('Google Drive에 데이터 저장 완료 (시뮬레이션)');
        showSyncStatus('동기화됨', 'synced');
        updateLastSyncTime();
        return true;
    } catch (error) {
        console.error('Google Drive 저장 실패:', error);
        showSyncStatus('동기화 실패', 'error');
        return false;
    }
}

async function loadFromGoogleDrive() {
    if (!isSignedIn) return;
    
    try {
        showSyncStatus('불러오는 중...', 'syncing');
        
        const cloudBackup = localStorage.getItem('cloudBackup');
        if (cloudBackup) {
            const data = JSON.parse(cloudBackup);
            if (data.records && data.records.length > 0) {
                if (records.length > 0) {
                    const merge = confirm(
                        '클라우드에서 ' + data.records.length + '개의 기록을 찾았습니다.\n' +
                        '현재 로컬에는 ' + records.length + '개의 기록이 있습니다.\n\n' +
                        '확인: 클라우드 데이터로 교체\n취소: 기존 데이터 유지'
                    );
                    if (merge) {
                        records = data.records || [];
                        customExercises = data.customExercises || [];
                        localStorage.setItem('fitnessRecords', JSON.stringify(records));
                        localStorage.setItem('customExercises', JSON.stringify(customExercises));
                    }
                } else {
                    records = data.records || [];
                    customExercises = data.customExercises || [];
                    localStorage.setItem('fitnessRecords', JSON.stringify(records));
                    localStorage.setItem('customExercises', JSON.stringify(customExercises));
                }
            }
        }
        
        console.log('Google Drive에서 데이터 로드 완료 (시뮬레이션)');
        showSyncStatus('동기화됨', 'synced');
        return true;
    } catch (error) {
        console.error('Google Drive 로드 실패:', error);
        showSyncStatus('불러오기 실패', 'error');
        return false;
    }
}

async function manualSync() {
    if (!isSignedIn) {
        alert('로그인이 필요합니다.');
        return;
    }
    const success = await saveToGoogleDrive();
    if (success) {
        alert('✅ 동기화가 완료되었습니다!');
    } else {
        alert('❌ 동기화에 실패했습니다.');
    }
}

function updateLastSyncTime() {
    const lastSyncTime = localStorage.getItem('lastSyncTime');
    const element = document.getElementById('lastSyncTime');
    if (element && lastSyncTime) {
        const date = new Date(lastSyncTime);
        element.textContent = date.toLocaleString('ko-KR');
    }
}

async function initializeApp() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    initializeExercises();
    setupEventListeners();
    updateAll();
    updateUserUI();
}

function setupEventListeners() {
    setupBasicEventListeners();
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    const downloadBackupBtn = document.getElementById('downloadBackupBtn');
    
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', manualSync);
    }
    if (downloadBackupBtn) {
        downloadBackupBtn.addEventListener('click', downloadLocalBackup);
    }
}

function setupBasicEventListeners() {
    const exerciseType = document.getElementById('exerciseType');
    if (exerciseType) {
        exerciseType.addEventListener('change', function() {
            const exerciseFields = document.getElementById('exerciseFields');
            const distanceField = document.getElementById('distance').parentElement;
            if (this.value) {
                exerciseFields.classList.add('show');
                const selectedExercise = getAllExercises().find(function(ex) {
                    return ex.name === this.value;
                }.bind(this));
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
    }

    const filterDate = document.getElementById('filterDate');
    const filterExercise = document.getElementById('filterExercise');
    const filterKeyword = document.getElementById('filterKeyword');
    
    if (filterDate) filterDate.addEventListener('change', applyFilters);
    if (filterExercise) filterExercise.addEventListener('change', applyFilters);
    if (filterKeyword) filterKeyword.addEventListener('input', applyFilters);

    const recordForm = document.getElementById('recordForm');
    if (recordForm) {
        recordForm.addEventListener('submit', async function(e) {
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
            
            if (isSignedIn) {
                await saveToGoogleDrive();
            }
            
            document.getElementById('recordForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('exerciseFields').classList.remove('show');
            updateAll();
            alert('기록이 저장되었습니다! 💪');
            switchTab('dashboard');
        });
    }
}

function downloadLocalBackup() {
    const data = {
        records: records,
        customExercises: customExercises,
        exportDate: new Date().toISOString(),
        source: 'local_backup'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fitness-backup-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('백업 파일이 다운로드되었습니다! 💾');
}

function initializeExercises() {
    updateExerciseSelects();
    updateExerciseList();
}

function getAllExercises() {
    return defaultExercises.concat(customExercises);
}

function updateExerciseSelects() {
    const exercises = getAllExercises();
    const exerciseSelect = document.getElementById('exerciseType');
    if (exerciseSelect) {
        exerciseSelect.innerHTML = '<option value="">선택하세요</option>';
        exercises.forEach(function(exercise) {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.icon + ' ' + exercise.name;
            exerciseSelect.appendChild(option);
        });
    }

    const filterSelect = document.getElementById('filterExercise');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">전체</option>';
        exercises.forEach(function(exercise) {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = exercise.icon + ' ' + exercise.name;
            filterSelect.appendChild(option);
        });
    }
}

function updateExerciseList() {
    const exerciseList = document.getElementById('exerciseList');
    if (!exerciseList) return;

    const exercises = getAllExercises();
    exerciseList.innerHTML = exercises.map(function(exercise, index) {
        return '<div class="exercise-item">' +
            '<span class="exercise-name">' + exercise.icon + ' ' + exercise.name + '</span>' +
            '<div>' +
            (exercise.hasDistance ? '<span style="font-size: 12px; color: #666; margin-right: 10px;">거리 기록</span>' : '') +
            (index >= defaultExercises.length ?
                '<button class="exercise-remove-btn" onclick="removeCustomExercise(' + (index - defaultExercises.length) + ')">삭제</button>' :
                '<span style="font-size: 12px; color: #999;">기본 운동</span>') +
            '</div>' +
            '</div>';
    }).join('');
}

function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(function(btn) {
        btn.classList.remove('active');
    });
    tabContents.forEach(function(content) {
        content.classList.remove('active');
    });

    const clickedButton = event ? event.target : document.querySelector('[onclick="switchTab(\'' + tabName + '\')"]');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    const tabContent = document.getElementById(tabName);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    if (tabName === 'charts') {
        setTimeout(updateCharts, 100);
    }
}

function showAddExerciseModal() {
    const modal = document.getElementById('addExerciseModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAddExerciseModal() {
    const modal = document.getElementById('addExerciseModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('modalExerciseName').value = '';
        document.getElementById('modalExerciseIcon').value = '';
        document.getElementById('modalExerciseDistance').checked = false;
    }
}

async function addExerciseFromModal() {
    const name = document.getElementById('modalExerciseName').value.trim();
    const icon = document.getElementById('modalExerciseIcon').value.trim();
    const hasDistance = document.getElementById('modalExerciseDistance').checked;

    if (!name) {
        alert('운동 이름을 입력해주세요.');
        return;
    }

    const allExercises = getAllExercises();
    if (allExercises.some(function(ex) { return ex.name === name; })) {
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

    if (isSignedIn) {
        await saveToGoogleDrive();
    }

    initializeExercises();
    closeAddExerciseModal();
    alert('운동이 추가되었습니다!');
}

async function addNewExercise() {
    const name = document.getElementById('newExerciseName').value.trim();
    const icon = document.getElementById('newExerciseIcon').value.trim();
    const hasDistance = document.getElementById('newExerciseDistance').checked;

    if (!name) {
        alert('운동 이름을 입력해주세요.');
        return;
    }

    const allExercises = getAllExercises();
    if (allExercises.some(function(ex) { return ex.name === name; })) {
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

    document.getElementById('newExerciseName').value = '';
    document.getElementById('newExerciseIcon').value = '';
    document.getElementById('newExerciseDistance').checked = false;

    if (isSignedIn) {
        await saveToGoogleDrive();
    }

    initializeExercises();
    alert('운동이 추가되었습니다!');
}

async function removeCustomExercise(index) {
    if (confirm('이 운동을 삭제하시겠습니까?')) {
        customExercises.splice(index, 1);
        localStorage.setItem('customExercises', JSON.stringify(customExercises));
        
        if (isSignedIn) {
            await saveToGoogleDrive();
        }
        
        initializeExercises();
        alert('운동이 삭제되었습니다.');
    }
}

function importData() {
    document.getElementById('importFile').click();
}

async function clearAllData() {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
        if (confirm('마지막 확인: 모든 기록과 사용자 추가 운동이 삭제됩니다.')) {
            records = [];
            customExercises = [];
            localStorage.removeItem('fitnessRecords');
            localStorage.removeItem('customExercises');
            
            if (isSignedIn) {
                await saveToGoogleDrive();
            }
            
            initializeExercises();
            updateAll();
            alert('모든 데이터가 삭제되었습니다.');
        }
    }
}

async function deleteRecord(id) {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
        records = records.filter(function(record) {
            return record.id !== id;
        });
        localStorage.setItem('fitnessRecords', JSON.stringify(records));
        
        if (isSignedIn) {
            await saveToGoogleDrive();
        }
        
        updateAll();
    }
}

function applyFilters() {
    const dateFilter = document.getElementById('filterDate') ? document.getElementById('filterDate').value : '';
    const exerciseFilter = document.getElementById('filterExercise') ? document.getElementById('filterExercise').value : '';
    const keywordFilter = document.getElementById('filterKeyword') ? document.getElementById('filterKeyword').value.toLowerCase() : '';

    filteredRecords = records.filter(function(record) {
        const dateMatch = !dateFilter || record.date === dateFilter;
        const exerciseMatch = !exerciseFilter || record.exerciseType === exerciseFilter;
        const keywordMatch = !keywordFilter || record.notes.toLowerCase().includes(keywordFilter);
        return dateMatch && exerciseMatch && keywordMatch;
    });

    displayFilteredRecords();
}

function clearFilters() {
    const filterDate = document.getElementById('filterDate');
    const filterExercise = document.getElementById('filterExercise');
    const filterKeyword = document.getElementById('filterKeyword');

    if (filterDate) filterDate.value = '';
    if (filterExercise) filterExercise.value = '';
    if (filterKeyword) filterKeyword.value = '';

    filteredRecords = records.slice();
    displayFilteredRecords();
}

function updateAll() {
    filteredRecords = records.slice();
    displayFilteredRecords();
    displayRecentRecords();
    updateStats();
    updateCharts();
    
    const totalRecordsCount = document.getElementById('totalRecordsCount');
    if (totalRecordsCount) {
        totalRecordsCount.textContent = records.length;
    }
}

function updateStats() {
    const totalRecordsElement = document.getElementById('totalRecords');
    if (totalRecordsElement) {
        totalRecordsElement.textContent = records.length;
    }

    const weightRecords = records.filter(function(r) { return r.weight; }).map(function(r) { return r.weight; });
    const totalExerciseTime = records.filter(function(r) { return r.duration; }).reduce(function(sum, r) { return sum + r.duration; }, 0);
    const totalCalories = records.filter(function(r) { return r.calories; }).reduce(function(sum, r) { return sum + r.calories; }, 0);
    const totalDistance = records.filter(function(r) { return r.distance; }).reduce(function(sum, r) { return sum + r.distance; }, 0);
    const stepsRecords = records.filter(function(r) { return r.steps; });
    const totalSteps = stepsRecords.reduce(function(sum, r) { return sum + r.steps; }, 0);
    const avgSteps = stepsRecords.length > 0 ? Math.round(totalSteps / stepsRecords.length) : 0;

    const totalExerciseTimeElement = document.getElementById('totalExerciseTime');
    const totalCaloriesElement = document.getElementById('totalCalories');
    const totalDistanceElement = document.getElementById('totalDistance');
    const totalStepsElement = document.getElementById('totalSteps');
    const avgStepsElement = document.getElementById('avgSteps');

    if (totalExerciseTimeElement) totalExerciseTimeElement.textContent = totalExerciseTime.toLocaleString();
    if (totalCaloriesElement) totalCaloriesElement.textContent = totalCalories.toLocaleString();
    if (totalDistanceElement) totalDistanceElement.textContent = totalDistance.toFixed(2);
    if (totalStepsElement) totalStepsElement.textContent = totalSteps.toLocaleString();
    if (avgStepsElement) avgStepsElement.textContent = avgSteps.toLocaleString();

    if (weightRecords.length > 0) {
        const currentWeight = weightRecords[0];
        const currentWeightElement = document.getElementById('currentWeight');
        if (currentWeightElement) currentWeightElement.textContent = currentWeight;

        if (weightRecords.length > 1) {
            const weightChange = currentWeight - weightRecords[weightRecords.length - 1];
            const changeElement = document.getElementById('weightChange');
            if (changeElement) {
                changeElement.textContent = (weightChange > 0 ? '+' : '') + weightChange.toFixed(1);
                changeElement.style.color = weightChange > 0 ? '#ff6b6b' : '#4ecdc4';
            }
        }
    }

    updateDashboardStats();
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = getWeekStart(new Date());
    
    const todayRecord = records.find(function(r) { return r.date === today; });
    const todaySteps = todayRecord ? (todayRecord.steps || 0) : 0;
    const todayStepsElement = document.getElementById('todaySteps');
    if (todayStepsElement) todayStepsElement.textContent = todaySteps.toLocaleString();

    const weeklyCalories = records
        .filter(function(r) { return new Date(r.date) >= thisWeekStart && r.calories; })
        .reduce(function(sum, r) { return sum + r.calories; }, 0);
    const weeklyCaloriesElement = document.getElementById('weeklyCalories');
    if (weeklyCaloriesElement) weeklyCaloriesElement.textContent = weeklyCalories.toLocaleString();

    const weeklyWorkouts = records
        .filter(function(r) { return new Date(r.date) >= thisWeekStart && r.exerciseType; }).length;
    const weeklyWorkoutCountElement = document.getElementById('weeklyWorkoutCount');
    if (weeklyWorkoutCountElement) weeklyWorkoutCountElement.textContent = weeklyWorkouts;

    updateProgressBars(weeklyWorkouts, todaySteps);
    updateStreak();
    updateStreakCalendar();
}

function updateProgressBars(weeklyWorkouts, todaySteps) {
    const weeklyGoal = 5;
    const weeklyProgress = Math.min((weeklyWorkouts / weeklyGoal) * 100, 100);
    const weeklyWorkoutProgressElement = document.getElementById('weeklyWorkoutProgress');
    const weeklyWorkoutTextElement = document.getElementById('weeklyWorkoutText');
    
    if (weeklyWorkoutProgressElement) weeklyWorkoutProgressElement.style.width = weeklyProgress + '%';
    if (weeklyWorkoutTextElement) {
        weeklyWorkoutTextElement.textContent =
            weeklyWorkouts >= weeklyGoal ?
            '🎉 목표 달성!' :
            '목표까지 ' + (weeklyGoal - weeklyWorkouts) + '회 남음';
    }

    const dailyGoal = 10000;
    const dailyProgress = Math.min((todaySteps / dailyGoal) * 100, 100);
    const dailyStepsProgressElement = document.getElementById('dailyStepsProgress');
    const dailyStepsTextElement = document.getElementById('dailyStepsText');
    
    if (dailyStepsProgressElement) dailyStepsProgressElement.style.width = dailyProgress + '%';
    if (dailyStepsTextElement) {
        dailyStepsTextElement.textContent =
            todaySteps >= dailyGoal ?
            '🎉 목표 달성!' :
            '목표까지 ' + (dailyGoal - todaySteps).toLocaleString() + '보 남음';
    }
}

function updateStreak() {
    const sortedDates = records
        .filter(function(r) { return r.exerciseType; })
        .map(function(r) { return r.date; })
        .sort()
        .reverse();

    if (sortedDates.length === 0) {
        const currentStreakElement = document.getElementById('currentStreak');
        if (currentStreakElement) currentStreakElement.textContent = '0';
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
            streak++;
        } else {
            break;
        }
        currentDate = recordDate;
    }

    const currentStreakElement = document.getElementById('currentStreak');
    if (currentStreakElement) currentStreakElement.textContent = streak;
}

function updateStreakCalendar() {
    const calendar = document.getElementById('streakCalendar');
    if (!calendar) return;

    const today = new Date();
    const workoutDates = new Set(records.filter(function(r) { return r.exerciseType; }).map(function(r) { return r.date; }));

    calendar.innerHTML = '';
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

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getStepsAchievement(steps) {
    if (steps >= 10000) {
        return '<span class="steps-achievement"><span class="achievement-icon achievement-excellent">🏆</span></span>';
    } else if (steps >= 8000) {
        return '<span class="steps-achievement"><span class="achievement-icon achievement-good">👍</span></span>';
    }
    return '';
}

function getExerciseIcon(exerciseName) {
    const exercise = getAllExercises().find(function(ex) { return ex.name === exerciseName; });
    return exercise ? exercise.icon : '🏃‍♂️';
}

function displayRecentRecords() {
    const recentRecords = document.getElementById('recentRecords');
    if (!recentRecords) return;

    const recent = records.slice(0, 5);
    if (recent.length === 0) {
        recentRecords.innerHTML = '<p class="no-data">아직 기록이 없습니다. 기록 입력 탭에서 첫 번째 기록을 남겨보세요! 💪</p>';
        return;
    }

    recentRecords.innerHTML = recent.map(function(record) {
        return '<div class="record-item" style="margin-bottom: 10px;">' +
            '<div class="record-header">' +
            '<span class="record-date">' + formatDate(record.date) + '</span>' +
            '<div>' +
            (record.weight ? '<span class="record-weight">' + record.weight + 'kg</span>' : '') +
            (record.steps ? '<span class="steps-info">👟 ' + record.steps.toLocaleString() + '걸음' + getStepsAchievement(record.steps) + '</span>' : '') +
            '</div>' +
            '</div>' +
            (record.exerciseType ?
                '<div class="record-exercise">' +
                '<span class="exercise-type">' + getExerciseIcon(record.exerciseType) + ' ' + record.exerciseType + '</span>' +
                '<div class="exercise-details">' +
                (record.duration ? '<span class="exercise-detail">⏱️ ' + record.duration + '분</span>' : '') +
                (record.calories ? '<span class="exercise-detail">🔥 ' + record.calories + ' kcal</span>' : '') +
                (record.distance ? '<span class="exercise-detail">📏 ' + record.distance.toFixed(2) + 'km</span>' : '') +
                '</div>' +
                '</div>' : '') +
            '</div>';
    }).join('');
}

function displayFilteredRecords() {
    const recordsList = document.getElementById('recordsList');
    if (!recordsList) return;

    if (filteredRecords.length === 0) {
        recordsList.innerHTML = '<p class="no-data">조건에 맞는 기록이 없습니다.</p>';
        return;
    }

    recordsList.innerHTML = filteredRecords.map(function(record) {
        return '<div class="record-item">' +
            '<div class="record-header">' +
            '<span class="record-date">' + formatDate(record.date) + '</span>' +
            '<div>' +
            (record.weight ? '<span class="record-weight">' + record.weight + 'kg</span>' : '') +
            (record.steps ? '<span class="steps-info">👟 ' + record.steps.toLocaleString() + '걸음' + getStepsAchievement(record.steps) + '</span>' : '') +
            '<button class="delete-btn" onclick="deleteRecord(' + record.id + ')">삭제</button>' +
            '</div>' +
            '</div>' +
            (record.exerciseType ?
                '<div class="record-exercise">' +
                '<span class="exercise-type">' + getExerciseIcon(record.exerciseType) + ' ' + record.exerciseType + '</span>' +
                '<div class="exercise-details">' +
                (record.duration ? '<span class="exercise-detail">⏱️ ' + record.duration + '분</span>' : '') +
                (record.calories ? '<span class="exercise-detail">🔥 ' + record.calories + ' kcal</span>' : '') +
                (record.distance ? '<span class="exercise-detail">📏 ' + record.distance.toFixed(2) + 'km</span>' : '') +
                '</div>' +
                '</div>' : '') +
            (record.notes ? '<div class="record-notes" style="color: #666; margin-top: 10px;">' + record.notes + '</div>' : '') +
            '</div>';
    }).join('');
}

function updateCharts() {
    updateWeightChart();
    updateExerciseTimeChart();
    updateExerciseTypeChart();
    updateCalorieChart();
    updateDistanceChart();
    updateStepsChart();
}

function updateWeightChart() {
    const ctx = document.getElementById('weightChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (weightChart) {
        weightChart.destroy();
    }

    const weightData = records
        .filter(function(r) { return r.weight; })
        .reverse()
        .slice(-30);

    if (weightData.length === 0) {
        drawNoDataMessage(context, '체중 데이터가 없습니다');
        return;
    }

    weightChart = new Chart(context, {
        type: 'line',
        data: {
            labels: weightData.map(function(r) { return formatDateShort(r.date); }),
            datasets: [{
                label: '체중 (kg)',
                data: weightData.map(function(r) { return r.weight; }),
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
                            return '체중: ' + context.parsed.y + 'kg';
                        }
                    }
                }
            }
        }
    });
}

function updateCalorieChart() {
    const ctx = document.getElementById('calorieChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (calorieChart) {
        calorieChart.destroy();
    }

    const calorieData = records
        .filter(function(r) { return r.calories; })
        .reverse()
        .slice(-14);

    if (calorieData.length === 0) {
        drawNoDataMessage(context, '칼로리 데이터가 없습니다');
        return;
    }

    calorieChart = new Chart(context, {
        type: 'line',
        data: {
            labels: calorieData.map(function(r) { return formatDateShort(r.date); }),
            datasets: [{
                label: '칼로리 (kcal)',
                data: calorieData.map(function(r) { return r.calories; }),
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
                            return '칼로리: ' + context.parsed.y + ' kcal';
                        }
                    }
                }
            }
        }
    });
}

function updateExerciseTimeChart() {
    const ctx = document.getElementById('exerciseTimeChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (exerciseTimeChart) {
        exerciseTimeChart.destroy();
    }

    const exerciseData = records
        .filter(function(r) { return r.duration; })
        .reverse()
        .slice(-14);

    if (exerciseData.length === 0) {
        drawNoDataMessage(context, '운동시간 데이터가 없습니다');
        return;
    }

    exerciseTimeChart = new Chart(context, {
        type: 'line',
        data: {
            labels: exerciseData.map(function(r) { return formatDateShort(r.date); }),
            datasets: [{
                label: '운동시간 (분)',
                data: exerciseData.map(function(r) { return r.duration; }),
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
                            return '운동시간: ' + context.parsed.y + '분';
                        }
                    }
                }
            }
        }
    });
}

function updateDistanceChart() {
    const ctx = document.getElementById('distanceChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (distanceChart) {
        distanceChart.destroy();
    }

    const distanceData = records
        .filter(function(r) { return r.distance; })
        .reverse()
        .slice(-14);

    if (distanceData.length === 0) {
        drawNoDataMessage(context, '거리 데이터가 없습니다');
        return;
    }

    distanceChart = new Chart(context, {
        type: 'line',
        data: {
            labels: distanceData.map(function(r) { return formatDateShort(r.date); }),
            datasets: [{
                label: '거리 (km)',
                data: distanceData.map(function(r) { return r.distance; }),
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
                            return '거리: ' + context.parsed.y.toFixed(2) + 'km';
                        }
                    }
                }
            }
        }
    });
}

function updateStepsChart() {
    const ctx = document.getElementById('stepsChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (stepsChart) {
        stepsChart.destroy();
    }

    const stepsData = records
        .filter(function(r) { return r.steps; })
        .reverse()
        .slice(-14);

    if (stepsData.length === 0) {
        drawNoDataMessage(context, '걸음수 데이터가 없습니다');
        return;
    }

    stepsChart = new Chart(context, {
        type: 'line',
        data: {
            labels: stepsData.map(function(r) { return formatDateShort(r.date); }),
            datasets: [
                {
                    label: '걸음수',
                    data: stepsData.map(function(r) { return r.steps; }),
                    borderColor: '#32CD32',
                    backgroundColor: 'rgba(50, 205, 50, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                    pointBackgroundColor: stepsData.map(function(r) {
                        return r.steps >= 10000 ? '#32CD32' :
                               r.steps >= 8000 ? '#FFD700' : '#87CEEB';
                    })
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
                                return '걸음수: ' + context.parsed.y.toLocaleString() + '보';
                            } else {
                                return '목표: ' + context.parsed.y.toLocaleString() + '보';
                            }
                        }
                    }
                }
            }
        }
    });
}

function updateExerciseTypeChart() {
    const ctx = document.getElementById('exerciseTypeChart');
    if (!ctx) return;
    const context = ctx.getContext('2d');
    if (!context) return;

    if (exerciseTypeChart) {
        exerciseTypeChart.destroy();
    }

    const exerciseTypes = records
        .filter(function(r) { return r.exerciseType; })
        .reduce(function(acc, r) {
            acc[r.exerciseType] = (acc[r.exerciseType] || 0) + 1;
            return acc;
        }, {});

    if (Object.keys(exerciseTypes).length === 0) {
        drawNoDataMessage(context, '운동 종류 데이터가 없습니다');
        return;
    }

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'];

    exerciseTypeChart = new Chart(context, {
        type: 'doughnut',
        data: {
            labels: Object.keys(exerciseTypes).map(function(type) {
                const exercise = getAllExercises().find(function(ex) { return ex.name === type; });
                return (exercise ? exercise.icon : '🏃‍♂️') + ' ' + type;
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
                            const total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return context.label + ': ' + context.parsed + '회 (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

function drawNoDataMessage(ctx, message) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, ctx.canvas.width/2, ctx.canvas.height/2);
}

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
    return (date.getMonth() + 1) + '/' + date.getDate();
}

// 이벤트 리스너들
window.onclick = function(event) {
    const modal = document.getElementById('addExerciseModal');
    if (event.target === modal) {
        closeAddExerciseModal();
    }
};

window.addEventListener('resize', function() {
    const chartsTab = document.getElementById('charts');
    if (chartsTab && chartsTab.classList.contains('active')) {
        setTimeout(updateCharts, 100);
    }
});

document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true});
