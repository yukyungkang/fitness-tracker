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

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    showLoadingScreen();
    initializeGoogleAPI();
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

function showAppScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
}

// Google API 초기화
function initializeGoogleAPI() {
    console.log('Google API 초기화 시작...');
    
    // 단계별로 초기화하여 디버깅 용이하게 변경
    initializeGapi()
        .then(() => {
            console.log('GAPI 초기화 완료');
            return initializeGsi();
        })
        .then(() => {
            console.log('GSI 초기화 완료');
            console.log('모든 API 초기화 완료!');
            checkInitComplete();
        })
        .catch((error) => {
            console.error('API 초기화 실패:', error);
            // 초기화 실패해도 로그인 화면으로 이동
            showLoginScreen();
        });
}

    Promise.all([gapiLoadPromise, gsiLoadPromise])
        .then(() => {
            console.log('모든 API 초기화 완료');
            checkInitComplete();
        })
        .catch((error) => {
            console.error('API 초기화 실패:', error);
            showLoginScreen();
        });

// GAPI 클라이언트 초기화
function initializeGapi() {
    return new Promise((resolve, reject) => {
        if (typeof gapi !== 'undefined') {
            console.log('GAPI 로드 확인됨');
            gapi.load('client', async () => {
                try {
                    console.log('GAPI client 로드 완료, 초기화 시작...');
                    await gapi.client.init({
                        apiKey: GOOGLE_CONFIG.API_KEY,
                        clientId: GOOGLE_CONFIG.CLIENT_ID,
                        discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC],
                        scope: GOOGLE_CONFIG.SCOPES
                    });
                    
                    console.log('GAPI client 초기화 완료!');
                    isGapiLoaded = true;
                    resolve();
                } catch (error) {
                    console.error('GAPI client 초기화 실패:', error);
                    reject(error);
                }
            });
        } else {
            console.error('GAPI 스크립트가 로드되지 않음');
            reject(new Error('GAPI not loaded'));
        }
    });
}
// GSI 초기화를 별도 함수로 분리
function initializeGsi() {
    return new Promise((resolve) => {
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('GSI 로드 확인됨');
            isGsiLoaded = true;
            resolve();
        } else {
            console.warn('GSI 로드되지 않음, 1초 후 재시도...');
            setTimeout(() => {
                if (typeof google !== 'undefined' && google.accounts) {
                    console.log('GSI 재시도 성공');
                    isGsiLoaded = true;
                } else {
                    console.warn('GSI 최종 로드 실패, 모의 인증 사용');
                    isGsiLoaded = true; // 모의 인증으로 진행
                }
                resolve();
            }, 1000);
        }
    });
}

// 초기화 완료 확인
function checkInitComplete() {
    console.log(`초기화 상태 확인: GAPI=${isGapiLoaded}, GSI=${isGsiLoaded}`);
    
    if (isGapiLoaded && isGsiLoaded) {
        console.log('모든 API 준비 완료, 로그인 설정 시작...');
        setupGoogleSignIn();
        
        // 기존 로그인 상태 확인
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                isSignedIn = true;
                console.log('기존 사용자 로그인 상태 복원');
                showAppScreen();
                initializeApp();
            } catch (error) {
                console.error('저장된 사용자 정보 오류:', error);
                localStorage.removeItem('currentUser');
                showLoginScreen();
            }
        } else {
            console.log('신규 사용자, 로그인 화면 표시');
            showLoginScreen();
        }
    } else {
        console.log('API 초기화 대기 중...');
    }
}

// Google 로그인 설정
function setupGoogleSignIn() {
    const signInBtn = document.getElementById('googleSignInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    
    if (signInBtn) {
        signInBtn.addEventListener('click', handleSignIn);
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
}

// 로그인 처리
async function handleSignIn() {
    try {
        showSyncStatus('로그인 중...', 'syncing');
        
        // 임시 사용자 정보 (실제로는 Google OAuth 2.0 사용)
        const mockUser = {
            id: 'user123',
            name: '홍길동',
            email: 'user@gmail.com',
            picture: 'https://via.placeholder.com/150/667eea/ffffff?text=User'
        };
        
        currentUser = mockUser;
        isSignedIn = true;
        
        // 사용자 정보 저장
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // UI 전환
        showAppScreen();
        updateUserUI();
        
        // 앱 초기화
        await initializeApp();
        
        // 클라우드에서 데이터 로드
        await loadFromGoogleDrive();
        
        showSyncStatus('동기화됨', 'synced');
    } catch (error) {
        console.error('로그인 실패:', error);
        showSyncStatus('로그인 실패', 'error');
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
    }
}

// 로그아웃 처리
async function handleSignOut() {
    if (confirm('로그아웃하시겠습니까? 로컬 데이터는 유지됩니다.')) {
        try {
            // 마지막으로 데이터 동기화
            await saveToGoogleDrive();
            
            // 로그아웃 처리
            currentUser = null;
            isSignedIn = false;
            localStorage.removeItem('currentUser');
            
            // UI 전환
            showLoginScreen();
        } catch (error) {
            console.error('로그아웃 중 오류:', error);
        }
    }
}

// 사용자 UI 업데이트
function updateUserUI() {
    if (currentUser) {
        const userName = document.getElementById('userName');
        const userPhoto = document.getElementById('userPhoto');
        
        if (userName) userName.textContent = currentUser.name;
        if (userPhoto) userPhoto.src = currentUser.picture;
        
        updateLastSyncTime();
    }
}

// 동기화 상태 표시
function showSyncStatus(message, status = 'synced') {
    const syncStatus = document.getElementById('syncStatus');
    const syncText = syncStatus?.querySelector('.sync-text');
    const syncIcon = syncStatus?.querySelector('.sync-icon');
    
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
        syncStatus.className = `sync-status ${status}`;
    }
}

// Google Drive 데이터 저장
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
        
        // 실제 구현에서는 Google Drive API 사용
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

// Google Drive 데이터 로드
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
                        `클라우드에서 ${data.records.length}개의 기록을 찾았습니다.\n` +
                        `현재 로컬에는 ${records.length}개의 기록이 있습니다.\n\n` +
                        `확인: 클라우드 데이터로 교체\n취소: 기존 데이터 유지`
                    );
                    
                    if (merge) {
                        records = data.records || [];
                        customExercises = data.customExercises || [];
                    }
                } else {
                    records = data.records || [];
                    customExercises = data.customExercises || [];
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

// 수동 동기화
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

// 마지막 동기화 시간 업데이트
function updateLastSyncTime() {
    const lastSyncTime = localStorage.getItem('lastSyncTime');
    const element = document.getElementById('lastSyncTime');
    
    if (element && lastSyncTime) {
        const date = new Date(lastSyncTime);
        element.textContent = date.toLocaleString('ko-KR');
    }
}

// 앱 초기화
async function initializeApp() {
    // 오늘 날짜 설정
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    
    // 운동 목록 초기화
    initializeExercises();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // UI 업데이트
    updateAll();
    
    // 사용자 UI 업데이트
    updateUserUI();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    setupBasicEventListeners();
    
    // 동기화 관련 이벤트 리스너
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    const downloadBackupBtn = document.getElementById('downloadBackupBtn');
    
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', manualSync);
    }
    if (downloadBackupBtn) {
        downloadBackupBtn.addEventListener('click', downloadLocalBackup);
    }
}

// 기본 이벤트 리스너 설정
function setupBasicEventListeners() {
    // 운동 종류 선택 시 세부 필드 표시
    const exerciseType = document.getElementById('exerciseType');
    if (exerciseType) {
        exerciseType.addEventListener('change', function() {
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
    }
    
       // 필터 이벤트 리스너
    const filterDate = document.getElementById('filterDate');
    const filterExercise = document.getElementById('filterExercise');
    const filterKeyword = document.getElementById('filterKeyword');
    
    if (filterDate) filterDate.addEventListener('change', applyFilters);
    if (filterExercise) filterExercise.addEventListener('change', applyFilters);
    if (filterKeyword) filterKeyword.addEventListener('input', applyFilters);
    
    // 폼 제출 처리
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
            
            // 클라우드 동기화
            if (isSignedIn) {
                await saveToGoogleDrive();
            }
            
            // 폼 초기화
            document.getElementById('recordForm').reset();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('exerciseFields').classList.remove('show');
            
            updateAll();
            alert('기록이 저장되었습니다! 💪');
            
            // 대시보드 탭으로 이동
            switchTab('dashboard');
        });
    }
    
    // 파일 입력 이벤트
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', function(e) {
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
                            
                            // 클라우드 동기화
                            if (isSignedIn) {
                                saveToGoogleDrive();
                            }
                            
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
}

// 로컬 백업 다운로드
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
    a.download = `fitness-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('백업 파일이 다운로드되었습니다! 💾');
}

// 운동 관련 함수들
function initializeExercises() {
    updateExerciseSelects();
    updateExerciseList();
}

function getAllExercises() {
    return [...defaultExercises, ...customExercises];
}

function updateExerciseSelects() {
    const exercises = getAllExercises();
    
    // 기록 입력 탭의 선택 박스
    const exerciseSelect = document.getElementById('exerciseType');
    if (exerciseSelect) {
        exerciseSelect.innerHTML = '<option value="">선택하세요</option>';
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = `${exercise.icon} ${exercise.name}`;
            exerciseSelect.appendChild(option);
        });
    }
    
    // 필터의 선택 박스
    const filterSelect = document.getElementById('filterExercise');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">전체</option>';
        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.name;
            option.textContent = `${exercise.icon} ${exercise.name}`;
            filterSelect.appendChild(option);
        });
    }
}

function updateExerciseList() {
    const exerciseList = document.getElementById('exerciseList');
    if (!exerciseList) return;
    
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

// 탭 전환 함수
function switchTab(tabName) {
    // 모든 탭 버튼과 콘텐츠를 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 현재 클릭된 버튼 찾기
    const clickedButton = event ? event.target : document.querySelector(`[onclick="switchTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    // 선택된 탭 활성화
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // 그래프 탭이 선택되면 그래프 업데이트
    if (tabName === 'charts') {
        setTimeout(updateCharts, 100);
    }
}

// 운동 추가 모달 관련 함수들
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
    
    // 클라우드 동기화
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
    
    // 클라우드 동기화
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
        
        // 클라우드 동기화
        if (isSignedIn) {
            await saveToGoogleDrive();
        }
        
        initializeExercises();
        alert('운동이 삭제되었습니다.');
    }
}

// 데이터 관리 함수들
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
            
            // 클라우드에서도 삭제
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
        records = records.filter(record => record.id !== id);
        localStorage.setItem('fitnessRecords', JSON.stringify(records));
        
        // 클라우드 동기화
        if (isSignedIn) {
            await saveToGoogleDrive();
        }
        
        updateAll();
    }
}

// 필터 관련 함수들
function applyFilters() {
    const dateFilter = document.getElementById('filterDate')?.value;
    const exerciseFilter = document.getElementById('filterExercise')?.value;
    const keywordFilter = document.getElementById('filterKeyword')?.value.toLowerCase();
    
    filteredRecords = records.filter(record => {
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
    
    filteredRecords = [...records];
    displayFilteredRecords();
}

// UI 업데이트 함수들
function updateAll() {
    filteredRecords = [...records];
    displayFilteredRecords();
    displayRecentRecords();
    updateStats();
    updateCharts();
    
    // 총 기록 수 업데이트
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
    
    const weightRecords = records.filter(r => r.weight).map(r => r.weight);
    const totalExerciseTime = records.filter(r => r.duration).reduce((sum, r) => sum + r.duration, 0);
    const totalCalories = records.filter(r => r.calories).reduce((sum, r) => sum + r.calories, 0);
    const totalDistance = records.filter(r => r.distance).reduce((sum, r) => sum + r.distance, 0);
    
    // 걸음수 통계
    const stepsRecords = records.filter(r => r.steps);
    const totalSteps = stepsRecords.reduce((sum, r) => sum + r.steps, 0);
    const avgSteps = stepsRecords.length > 0 ? Math.round(totalSteps / stepsRecords.length) : 0;
    
    // 기본 통계 업데이트
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
    
    // 체중 관련
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
    
    // 대시보드 통계 업데이트
    updateDashboardStats();
}

function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = getWeekStart(new Date());
    
    // 오늘 걸음수
    const todayRecord = records.find(r => r.date === today);
    const todaySteps = todayRecord ? todayRecord.steps || 0 : 0;
    const todayStepsElement = document.getElementById('todaySteps');
    if (todayStepsElement) todayStepsElement.textContent = todaySteps.toLocaleString();
    
    // 이번 주 칼로리
    const weeklyCalories = records
        .filter(r => new Date(r.date) >= thisWeekStart && r.calories)
        .reduce((sum, r) => sum + r.calories, 0);
    const weeklyCaloriesElement = document.getElementById('weeklyCalories');
    if (weeklyCaloriesElement) weeklyCaloriesElement.textContent = weeklyCalories.toLocaleString();
    
    // 이번 주 운동 횟수
    const weeklyWorkouts = records
        .filter(r => new Date(r.date) >= thisWeekStart && r.exerciseType).length;
    const weeklyWorkoutCountElement = document.getElementById('weeklyWorkoutCount');
    if (weeklyWorkoutCountElement) weeklyWorkoutCountElement.textContent = weeklyWorkouts;
    
    // 진행률 업데이트
    updateProgressBars(weeklyWorkouts, todaySteps);
    
    // 운동 스트릭 업데이트
    updateStreak();
    
    // 스트릭 달력 업데이트
    updateStreakCalendar();
}

function updateProgressBars(weeklyWorkouts, todaySteps) {
    // 주간 운동 목표 (5회)
    const weeklyGoal = 5;
    const weeklyProgress = Math.min((weeklyWorkouts / weeklyGoal) * 100, 100);
    const weeklyWorkoutProgressElement = document.getElementById('weeklyWorkoutProgress');
    const weeklyWorkoutTextElement = document.getElementById('weeklyWorkoutText');
    
    if (weeklyWorkoutProgressElement) weeklyWorkoutProgressElement.style.width = weeklyProgress + '%';
    if (weeklyWorkoutTextElement) {
        weeklyWorkoutTextElement.textContent = 
            weeklyWorkouts >= weeklyGoal ? 
            '🎉 목표 달성!' : 
            `목표까지 ${weeklyGoal - weeklyWorkouts}회 남음`;
    }
    
    // 일일 걸음 목표 (10,000보)
    const dailyGoal = 10000;
    const dailyProgress = Math.min((todaySteps / dailyGoal) * 100, 100);
    const dailyStepsProgressElement = document.getElementById('dailyStepsProgress');
    const dailyStepsTextElement = document.getElementById('dailyStepsText');
    
    if (dailyStepsProgressElement) dailyStepsProgressElement.style.width = dailyProgress + '%';
    if (dailyStepsTextElement) {
        dailyStepsTextElement.textContent = 
            todaySteps >= dailyGoal ? 
            '🎉 목표 달성!' : 
            `목표까지 ${(dailyGoal - todaySteps).toLocaleString()}보 남음`;
    }
}

function updateStreak() {
    const sortedDates = records
        .filter(r => r.exerciseType)
        .map(r => r.date)
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
    const exercise = getAllExercises().find(ex => ex.name === exerciseName);
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

function displayFilteredRecords() {
    const recordsList = document.getElementById('recordsList');
    if (!recordsList) return;
    
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

// 차트 관련 함수들
function updateCharts() {
    updateWeightChart();
    updateExerciseTimeChart();
    updateExerciseTypeChart();
    updateCalorieChart();
    updateDistanceChart();
    updateStepsChart();
}

function updateWeightChart() {
    const ctx = document.getElementById('weightChart')?.getContext('2d');
    if (!ctx) return;
    
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

function updateCalorieChart() {
    const ctx = document.getElementById('calorieChart')?.getContext('2d');
    if (!ctx) return;
    
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
                intersect: false,                mode: 'index'
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

function updateExerciseTimeChart() {
    const ctx = document.getElementById('exerciseTimeChart')?.getContext('2d');
    if (!ctx) return;
    
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

function updateDistanceChart() {
    const ctx = document.getElementById('distanceChart')?.getContext('2d');
    if (!ctx) return;
    
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

function updateStepsChart() {
    const ctx = document.getElementById('stepsChart')?.getContext('2d');
    if (!ctx) return;
    
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

function updateExerciseTypeChart() {
    const ctx = document.getElementById('exerciseTypeChart')?.getContext('2d');
    if (!ctx) return;
    
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

function drawNoDataMessage(ctx, message) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, ctx.canvas.width/2, ctx.canvas.height/2);
}

// 유틸리티 함수들
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

// 이벤트 리스너들
window.onclick = function(event) {
    const modal = document.getElementById('addExerciseModal');
    if (event.target === modal) {
        closeAddExerciseModal();
    }
}

window.addEventListener('resize', function() {
    const chartsTab = document.getElementById('charts');
    if (chartsTab && chartsTab.classList.contains('active')) {
        setTimeout(updateCharts, 100);
    }
});

// 터치 이벤트 최적화 (모바일)
document.addEventListener('touchstart', function() {}, {passive: true});
document.addEventListener('touchmove', function() {}, {passive: true});
