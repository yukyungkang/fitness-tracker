import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyBasJig37TExc76J3mlcJ9p5uZLXFrY5CQ",
  authDomain: "dietpage-5f49a.firebaseapp.com",
  projectId: "dietpage-5f49a",
  storageBucket: "dietpage-5f49a.firebasestorage.app",
  messagingSenderId: "666434272009",
  appId: "1:666434272009:web:a491c168ac072658bdb1d8",
  measurementId: "G-60RQ5NPWF5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ✅ 전역 변수들
window.currentUser = null;
window.planData = [];
window.goalWeight = 60;
window.bodyRecords = [];
window.userHeight = 165;

let currentUser = null;
let planData = [];
let goalWeight = 60;
let bodyRecords = [];
let userHeight = 165;

// ✅ Toast 함수
function showToast(msg) {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    console.error('Toast 컨테이너를 찾을 수 없습니다');
    return;
  }
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  toastContainer.appendChild(div);
  setTimeout(() => div.classList.add('show'), 100);
  setTimeout(() => {
    div.classList.remove('show');
    setTimeout(() => div.remove(), 400);
  }, 3000);
}

// ✅ BMI 계산 함수
function calculateBMI(height, weight) {
  if (!height || !weight) return 0;
  const heightInM = height / 100;
  return (weight / (heightInM * heightInM)).toFixed(1);
}

// ✅ 탭 전환 함수
function switchTab(tabName) {
  console.log('탭 전환:', tabName);
  
  // 모든 탭 버튼에서 active 클래스 제거
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 모든 섹션 숨기기
  document.querySelectorAll('section').forEach(section => {
    section.classList.remove('active');
  });
  
  // 선택된 탭 버튼들 활성화
  document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(btn => {
    btn.classList.add('active');
  });
  
  // 선택된 섹션 표시
  const selectedSection = document.getElementById(tabName);
  if (selectedSection) {
    selectedSection.classList.add('active');
    console.log('✅ 섹션 활성화:', selectedSection);
    
    if (tabName === 'stats') {
      console.log('📊 통계 탭 감지됨! 차트 그리기 시작');
      setTimeout(() => {
        console.log('📊 차트 함수 호출 시작');
        drawAllCharts();
      }, 300);
    }
  }
}

// ✅ 신체 정보 저장 함수
window.saveBodyData = async function() {
  console.log('📊 신체 정보 저장 함수 호출됨');
  
  if (!currentUser) {
    console.log('❌ 로그인되지 않음');
    return showToast("로그인이 필요합니다.");
  }
  
  // DOM 요소들 직접 참조
  const measureDateInput = document.getElementById('measureDate');
  const measureTimeSelect = document.getElementById('measureTime');
  const weightInputField = document.getElementById('weightInput');
  const bodyFatInputField = document.getElementById('bodyFatInput');
  const muscleMassInputField = document.getElementById('muscleMassInput');
  const visceralFatInputField = document.getElementById('visceralFatInput');
  const waterPercentInputField = document.getElementById('waterPercentInput');
  const bmrInputField = document.getElementById('bmrInput');
  const bodyMemoField = document.getElementById('bodyMemo');
  
  const date = measureDateInput?.value;
  const time = measureTimeSelect?.value || 'morning';
  const weight = parseFloat(weightInputField?.value);
  const bodyFat = parseFloat(bodyFatInputField?.value);
  const muscleMass = parseFloat(muscleMassInputField?.value);
  const visceralFat = parseFloat(visceralFatInputField?.value);
  const waterPercent = parseFloat(waterPercentInputField?.value);
  const bmr = parseFloat(bmrInputField?.value);
  const memo = bodyMemoField?.value || '';
  
  if (!date) {
    return showToast("측정 날짜를 선택해주세요.");
  }
  
  if (!weight || isNaN(weight)) {
    return showToast("체중을 올바르게 입력해주세요.");
  }
  
  try {
    showToast("📊 신체 정보 저장 중...");
    
    const bodyData = {
      uid: currentUser.uid,
      userName: currentUser.displayName,
      date: date,
      time: time,
      weight: weight,
      bodyFat: isNaN(bodyFat) ? null : bodyFat,
      muscleMass: isNaN(muscleMass) ? null : muscleMass,
      visceralFat: isNaN(visceralFat) ? null : visceralFat,
      waterPercent: isNaN(waterPercent) ? null : waterPercent,
      bmr: isNaN(bmr) ? null : bmr,
      bmi: parseFloat(calculateBMI(userHeight, weight)),
      memo: memo,
      createdAt: new Date().toISOString(),
      timestamp: new Date().getTime()
    };
    
    const bodyRef = collection(db, "bodyRecords");
    const docRef = await addDoc(bodyRef, bodyData);
    
    showToast("✅ 신체 정보 저장 완료!");
    
        // 입력 폼 초기화
    if (weightInputField) weightInputField.value = '';
    if (bodyFatInputField) bodyFatInputField.value = '';
    if (muscleMassInputField) muscleMassInputField.value = '';
    if (visceralFatInputField) visceralFatInputField.value = '';
    if (waterPercentInputField) waterPercentInputField.value = '';
    if (bmrInputField) bmrInputField.value = '';
    if (bodyMemoField) bodyMemoField.value = '';
    
    // 데이터 다시 로드
    await loadBodyRecords();
    
  } catch (error) {
    console.error("❌ 신체 정보 저장 오류:", error);
    showToast("❌ 신체 정보 저장 실패: " + error.message);
  }
};

// ✅ DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM 로드 완료');
  
  // 요소 존재 확인
  const loginBtn = document.getElementById('loginBtn');
  const userSection = document.getElementById('userSection');
  const logoutBtn = document.getElementById('logoutBtn');
  const userInfo = document.getElementById('userInfo');
  
  // 초기 상태 설정
  if (loginBtn) {
    loginBtn.style.display = 'block';
  }
  if (userSection) {
    userSection.style.display = 'none';
  }
  
  // ✅ 네비게이션 이벤트 통합 처리
  const desktopNavItems = document.querySelectorAll('.nav-item');
  const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
  
  // 공통 탭 전환 함수
  function handleTabSwitch(tabName) {
    // 모든 네비게이션 아이템에서 active 클래스 제거
    [...desktopNavItems, ...mobileNavItems].forEach(item => {
      item.classList.remove('active');
    });
    
    // 해당 탭 활성화
    document.querySelectorAll(`[data-tab="${tabName}"]`).forEach(item => {
      item.classList.add('active');
    });
    
    // 섹션 전환
    switchTab(tabName);
  }
  
  // PC 네비게이션 이벤트
  desktopNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const tabName = this.dataset.tab;
      handleTabSwitch(tabName);
    });
  });
  
  // 모바일 네비게이션 이벤트
  mobileNavItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 햅틱 피드백 (지원하는 경우)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      const tabName = this.dataset.tab;
      handleTabSwitch(tabName);
    });
  });
  
  // DOM 요소 참조
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const addBodyDataBtn = document.getElementById('addBodyDataBtn');
  const measureDate = document.getElementById('measureDate');
  const prevPeriodStartInput = document.getElementById('prevPeriodStart');
  const periodStartInput = document.getElementById('periodStart');
  const cycleLengthInput = document.getElementById('cycleLength');
  const menstrualLengthInput = document.getElementById('menstrualLength');
  const goalWeightInput = document.getElementById('goalWeight');
  const userHeightInput = document.getElementById('userHeight');
  const avgCycleDisplay = document.getElementById('avgCycleDisplay');
  
  // 오늘 날짜 기본값 설정
  if (measureDate) {
    measureDate.value = new Date().toISOString().split('T')[0];
  }
  
  // ✅ 로그인 이벤트
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('🔐 로그인 버튼 클릭됨');
      try {
        showToast("🔄 로그인 시도 중...");
        await setPersistence(auth, browserLocalPersistence);
        const res = await signInWithPopup(auth, provider);
        currentUser = res.user;
        window.currentUser = res.user;
        console.log('✅ 로그인 성공:', currentUser.displayName);
        showToast("✅ 로그인 성공!");
      } catch (error) {
        console.error('❌ 로그인 오류:', error);
        showToast("❌ 로그인 실패: " + error.message);
      }
    });
  }
  
  // ✅ 로그아웃 이벤트
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      console.log('🚪 로그아웃 버튼 클릭됨');
      try {
        await signOut(auth);
        showToast("✅ 로그아웃 완료!");
      } catch (error) {
        console.error('❌ 로그아웃 오류:', error);
      }
    });
  }
  
  // ✅ 신체 정보 저장 버튼 이벤트
  if (addBodyDataBtn) {
    addBodyDataBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log('📊 신체 정보 저장 버튼 클릭 이벤트 발생');
      await window.saveBodyData();
    });
  }
  
  // ✅ 평균 주기 자동 계산
  function calcAvgCycle() {
    if (!prevPeriodStartInput || !periodStartInput) return;
    const prev = new Date(prevPeriodStartInput.value);
    const last = new Date(periodStartInput.value);
    if (!isNaN(prev) && !isNaN(last)) {
      const diff = Math.round((last - prev) / (1000 * 60 * 60 * 24));
      if (diff > 15 && diff < 60) {
        if (cycleLengthInput) cycleLengthInput.value = diff;
        if (avgCycleDisplay) avgCycleDisplay.textContent = diff;
      }
    }
  }
  
  if (prevPeriodStartInput) prevPeriodStartInput.addEventListener('change', calcAvgCycle);
  if (periodStartInput) periodStartInput.addEventListener('change', calcAvgCycle);
  
  // ✅ 설정 저장
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      console.log('💾 설정 저장 버튼 클릭됨');
      if (!currentUser) {
        return showToast("로그인이 필요합니다.");
      }
      
      const start = periodStartInput?.value;
      const prevStart = prevPeriodStartInput?.value;
      const cycleLength = parseInt(cycleLengthInput?.value || 28);
      const menstrualLength = parseInt(menstrualLengthInput?.value || 5);
      goalWeight = parseFloat(goalWeightInput?.value || 60);
      userHeight = parseFloat(userHeightInput?.value || 165);
      
      window.goalWeight = goalWeight;
      window.userHeight = userHeight;
      
      if (!start || !cycleLength || !menstrualLength) {
        return showToast("모든 항목을 입력해주세요!");
      }
      
      try {
        showToast("💾 설정 저장 중...");
        
        const ref = doc(db, "userData", currentUser.uid);
        await setDoc(ref, {
          periodStart: start,
          prevPeriodStart: prevStart,
          cycleLength,
          menstrualLength,
          goalWeight,
          userHeight,
          updatedAt: new Date().toISOString()
        });
        
        const now = new Date();
        const historyData = {
          uid: currentUser.uid,
          userName: currentUser.displayName,
          savedAt: now.toISOString(),
          savedAtKST: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
          periodStart: start,
          prevPeriodStart: prevStart,
          cycleLength,
          menstrualLength,
          timestamp: now.getTime()
        };
        
        const historyRef = collection(db, "settingsHistory");
        await addDoc(historyRef, historyData);
        
        showToast("✅ 설정 저장 완료!");
        
        generatePlan(start, cycleLength, menstrualLength);
        renderPlanTable();
        updateBodySummary();
        
        setTimeout(async () => {
          await loadSettingsHistory();
        }, 1000);
        
      } catch (error) {
        console.error("❌ 설정 저장 오류:", error);
        showToast("❌ 설정 저장 실패: " + error.message);
      }
    });
  }
  
  // ✅ 신체 기록 불러오기
  window.loadBodyRecords = async function() {
    if (!currentUser) return;
    try {
      console.log('📥 신체 기록 불러오기 시작...');
      const bodyCollection = collection(db, "bodyRecords");
      const q = query(bodyCollection, where("uid", "==", currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      bodyRecords = [];
      window.bodyRecords = [];
      
      querySnapshot.forEach(docSnap => {
        const record = {
          id: docSnap.id,
          ...docSnap.data()
        };
        bodyRecords.push(record);
        window.bodyRecords.push(record);
      });
      
      bodyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      window.bodyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('📥 신체 기록 로드 완료:', bodyRecords.length, '개');
      
      renderBodyRecordsTable();
      updateBodySummary();
      updateStatsCards();
      
    } catch (error) {
      console.error("❌ 신체 기록 불러오기 오류:", error);
    }
  };
  
  // ✅ 설정 불러오기
  async function loadSettings() {
    if (!currentUser) return;
    try {
      console.log('📥 설정 불러오기 시작...');
      const ref = doc(db, "userData", currentUser.uid);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        console.log('📥 설정 데이터 로드:', data);
        
        if (prevPeriodStartInput) prevPeriodStartInput.value = data.prevPeriodStart || '';
        if (periodStartInput) periodStartInput.value = data.periodStart || '';
        if (cycleLengthInput) cycleLengthInput.value = data.cycleLength || 28;
        if (menstrualLengthInput) menstrualLengthInput.value = data.menstrualLength || 5;
        if (goalWeightInput) goalWeightInput.value = data.goalWeight || 60;
        if (userHeightInput) userHeightInput.value = data.userHeight || 165;
        if (avgCycleDisplay) avgCycleDisplay.textContent = data.cycleLength || 28;
        
        goalWeight = data.goalWeight || 60;
        userHeight = data.userHeight || 165;
        window.goalWeight = goalWeight;
        window.userHeight = userHeight;
        
        generatePlan(data.periodStart, data.cycleLength, data.menstrualLength);
        renderPlanTable();
        
        console.log('✅ 설정 불러오기 완료');
      } else {
        console.log('📭 저장된 설정이 없습니다');
        generatePlan(null, 28, 5);
        renderPlanTable();
      }
      
      await loadSettingsHistory();
      
    } catch (error) {
      console.error("❌ 설정 불러오기 오류:", error);
      generatePlan(null, 28, 5);
      renderPlanTable();
    }
  }
  
  // ✅ 설정 히스토리 불러오기
  async function loadSettingsHistory() {
    const historyContainer = document.getElementById('settingsHistoryList');
    if (!currentUser) {
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="no-login">로그인 후 설정 기록을 확인할 수 있습니다.</div>';
      }
      return;
    }
    
    try {
      console.log('📚 설정 히스토리 로드 시작...');
      const historyCollection = collection(db, "settingsHistory");
      const querySnapshot = await getDocs(historyCollection);
      
      let historyList = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.uid === currentUser.uid) {
          historyList.push({
            id: docSnap.id,
            ...data
          });
        }
      });
      
      historyList.sort((a, b) => {
        const timeA = a.timestamp || new Date(a.savedAt).getTime();
        const timeB = b.timestamp || new Date(b.savedAt).getTime();
        return timeB - timeA;
      });
      
      historyList = historyList.slice(0, 5);
      
      let html = '';
      if (historyList.length === 0) {
        html = '<div class="no-history">저장된 설정 기록이 없습니다. 설정을 저장해보세요!</div>';
      } else {
        historyList.forEach((item, index) => {
          const date = item.savedAtKST || item.savedAt.slice(0, 10);
          const prevDate = item.prevPeriodStart || '미설정';
          const lastDate = item.periodStart || '미설정';
          const cycle = item.cycleLength || '28';
          html += `
            <div class="history-item">
              <div class="history-date">📅 ${date}</div>
              <div class="history-details">
                이전 생리: ${prevDate} | 마지막 생리: ${lastDate} | 주기: ${cycle}일
              </div>
            </div>
          `;
        });
      }
      
      if (historyContainer) {
        historyContainer.innerHTML = html;
      }
      
    } catch (error) {
      console.error("❌ 히스토리 불러오기 오류:", error);
      if (historyContainer) {
        historyContainer.innerHTML = '<div class="error">히스토리를 불러오는 중 오류가 발생했습니다: ' + error.message + '</div>';
      }
    }
  }
  
  // ✅ 신체 기록 테이블 렌더링
  function renderBodyRecordsTable() {
    const tbody = document.getElementById('bodyRecordsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const recentRecords = bodyRecords.slice(0, 10);
    
    recentRecords.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${record.time === 'morning' ? '아침' : '저녁'}</td>
        <td>${record.weight}kg</td>
        <td>${record.bodyFat ? record.bodyFat + '%' : '-'}</td>
        <td>${record.muscleMass ? record.muscleMass + 'kg' : '-'}</td>
        <td>${record.bmi}</td>
        <td>${record.memo || '-'}</td>
        <td><button class="delete-btn" onclick="deleteBodyRecord('${record.id}')">삭제</button></td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // ✅ 신체 기록 삭제
  window.deleteBodyRecord = async function(recordId) {
    if (!currentUser) return;
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    
    try {
      await deleteDoc(doc(db, "bodyRecords", recordId));
      showToast("✅ 기록이 삭제되었습니다.");
      await window.loadBodyRecords();
    } catch (error) {
      console.error("❌ 기록 삭제 오류:", error);
      showToast("❌ 기록 삭제 실패");
    }
  };
  
  // ✅ 신체 정보 요약 업데이트
  function updateBodySummary() {
    const currentWeightDisplay = document.getElementById('currentWeightDisplay');
    const currentBodyFatDisplay = document.getElementById('currentBodyFatDisplay');
    const currentMuscleDisplay = document.getElementById('currentMuscleDisplay');
    const remainingWeightDisplay = document.getElementById('remainingWeightDisplay');
    
    if (bodyRecords.length > 0) {
      const latest = bodyRecords[0];
      if (currentWeightDisplay) currentWeightDisplay.textContent = latest.weight + 'kg';
      if (currentBodyFatDisplay) currentBodyFatDisplay.textContent = latest.bodyFat ? latest.bodyFat + '%' : '-%';
      if (currentMuscleDisplay) currentMuscleDisplay.textContent = latest.muscleMass ? latest.muscleMass + 'kg' : '-kg';
      if (remainingWeightDisplay) {
        const remaining = latest.weight - goalWeight;
        remainingWeightDisplay.textContent = remaining > 0 ? remaining.toFixed(1) + 'kg' : '목표 달성!';
      }
    } else {
      if (currentWeightDisplay) currentWeightDisplay.textContent = '-kg';
      if (currentBodyFatDisplay) currentBodyFatDisplay.textContent = '-%';
      if (currentMuscleDisplay) currentMuscleDisplay.textContent = '-kg';
      if (remainingWeightDisplay) remainingWeightDisplay.textContent = '-kg';
    }
  }
  
  // ✅ 통계 카드 업데이트
  function updateStatsCards() {
    const weightChangeDisplay = document.getElementById('weightChangeDisplay');
    const bodyFatChangeDisplay = document.getElementById('bodyFatChangeDisplay');
    const muscleGainDisplay = document.getElementById('muscleGainDisplay');
    const currentBMIDisplay = document.getElementById('currentBMIDisplay');
    
    if (bodyRecords.length < 2) {
      if (weightChangeDisplay) weightChangeDisplay.textContent = '0kg';
      if (bodyFatChangeDisplay) bodyFatChangeDisplay.textContent = '0%';
      if (muscleGainDisplay) muscleGainDisplay.textContent = '0kg';
      if (currentBMIDisplay) currentBMIDisplay.textContent = bodyRecords.length > 0 ? bodyRecords[0].bmi : '0';
      return;
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recent = bodyRecords[0];
    const thirtyDaysAgoRecord = bodyRecords.find(r => new Date(r.date) <= thirtyDaysAgo) || bodyRecords[bodyRecords.length - 1];
    
    const weightChange = recent.weight - thirtyDaysAgoRecord.weight;
    const bodyFatChange = (recent.bodyFat || 0) - (thirtyDaysAgoRecord.bodyFat || 0);
    const muscleChange = (recent.muscleMass || 0) - (thirtyDaysAgoRecord.muscleMass || 0);
    
    if (weightChangeDisplay) {
      weightChangeDisplay.textContent = (weightChange > 0 ? '+' : '') + weightChange.toFixed(1) + 'kg';
      weightChangeDisplay.style.color = weightChange > 0 ? '#e74c3c' : '#27ae60';
    }
    
    if (bodyFatChangeDisplay) {
      bodyFatChangeDisplay.textContent = (bodyFatChange > 0 ? '+' : '') + bodyFatChange.toFixed(1) + '%';
      bodyFatChangeDisplay.style.color = bodyFatChange > 0 ? '#e74c3c' : '#27ae60';
    }
    
    if (muscleGainDisplay) {
      muscleGainDisplay.textContent = (muscleChange > 0 ? '+' : '') + muscleChange.toFixed(1) + 'kg';
      muscleGainDisplay.style.color = muscleChange > 0 ? '#27ae60' : '#e74c3c';
    }
    
    if (currentBMIDisplay) {
      currentBMIDisplay.textContent = recent.bmi;
    }
  }
  
  // ✅ 로그인 상태 감지
  onAuthStateChanged(auth, async (user) => {
    console.log('🔄 로그인 상태 변경:', user ? '로그인됨' : '로그아웃됨');
    
    if (user) {
      currentUser = user;
      window.currentUser = user;
      console.log('✅ 사용자 정보:', currentUser.displayName);
      
      if (userInfo) {
        userInfo.textContent = currentUser.displayName;
      }
      
      if (loginBtn) {
        loginBtn.style.display = 'none';
      }
      
      if (userSection) {
        userSection.style.display = 'flex';
      }
      
      await loadSettings();
      await window.loadBodyRecords();
      
    } else {
      currentUser = null;
      window.currentUser = null;
      console.log('❌ 로그아웃 상태');
      
      if (loginBtn) {
        loginBtn.style.display = 'block';
      }
      
      if (userSection) {
        userSection.style.display = 'none';
      }
      
      if (userInfo) {
        userInfo.textContent = '';
      }
      
      await loadSettingsHistory();
    }
  });
  
  // ✅ 초기 플랜 생성
  generatePlan(null, 28, 5);
  renderPlanTable();
  
  // ✅ 강제로 첫 번째 탭 활성화
  setTimeout(() => {
    switchTab('guide');
  }, 100);
  
  console.log('🎉 DOM 초기화 완료');
});

// ✅ 플랜 생성
function generatePlan(startDateStr, cycle, menstrual) {
  planData = [];
  window.planData = [];
  
  let startDate = startDateStr ? new Date(startDateStr) : new Date();
  const today = new Date();
  
  for (let i = 0; i < 90; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    
    const weekday = day.getDay();
    if (weekday === 0 || weekday === 6) continue;
    
    const diff = Math.floor((day - startDate) / (1000 * 60 * 60 * 24));
    const phaseDay = diff % cycle;
    
    let phase = '여포기';
    if (phaseDay < menstrual) phase = '월경기';
    else if (phaseDay < 14) phase = '여포기';
    else if (phaseDay === 14) phase = '배란기';
    else phase = '황체기';
    
    let cardio = "경사6%, 속도4.5, 30분";
    let home = "IMPT 루틴";
    
    if (phase === '월경기') { 
      cardio = "가볍게 걷기 20분"; 
      home = "스트레칭"; 
    }
    if (phase === '배란기') { 
      cardio = "속도5.0, 35분"; 
      home = "IMPT + 코어"; 
    }
    
    const planItem = {
      day: i + 1,
      date: `${day.getMonth() + 1}/${day.getDate()} (${['일','월','화','수','목','금','토'][weekday]})`,
      phase, 
      cardio, 
      home, 
      morningDone: false, 
      eveningDone: false
    };
    
    planData.push(planItem);
    window.planData.push(planItem);
  }
}

// ✅ 플랜 테이블 렌더링
function renderPlanTable() {
  const tbody = document.getElementById('planTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  planData.forEach((p) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.day}</td>
      <td>${p.date}</td>
      <td>${p.phase}</td>
      <td>${p.cardio}</td>
      <td>${p.home}</td>
      <td><input type="checkbox" ${p.morningDone ? 'checked' : ''}></td>
      <td><input type="checkbox" ${p.eveningDone ? 'checked' : ''}></td>
    `;
    
    const checkboxes = row.querySelectorAll('input[type="checkbox"]');
    const am = checkboxes[0];
    const pm = checkboxes[1];
    
    if (am) am.addEventListener('change', () => {
      p.morningDone = am.checked;
      updateProgress();
    });
    
    if (pm) pm.addEventListener('change', () => {
      p.eveningDone = pm.checked;
      updateProgress();
    });
    
    tbody.appendChild(row);
  });
  
  updateProgress();
}

// ✅ 진행률 업데이트
function updateProgress() {
  const total = planData.length * 2;
  const done = planData.filter(p => p.morningDone).length + planData.filter(p => p.eveningDone).length;
  const percent = Math.round((done / total) * 100);
  
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) progressFill.style.width = percent + '%';
  if (progressText) progressText.textContent = percent + '%';
  
  const statsSection = document.getElementById('stats');
  if (statsSection && statsSection.classList.contains('active')) {
    setTimeout(() => {
      drawWorkoutChart();
    }, 100);
  }
}

// ✅ 모든 차트 그리기
function drawAllCharts() {
  console.log('📊 모든 차트 그리기 시작');
  drawWeightChart();
  drawBodyFatChart();
  drawMuscleChart();
  drawWorkoutChart();
}

// ✅ 체중 변화 차트
function drawWeightChart() {
  console.log('📊 체중 차트 그리기 시작...');
  const ctx = document.getElementById('weightChart');
  if (!ctx) return;
  
  if (window.weightChartInstance) {
    window.weightChartInstance.destroy();
  }
  
  try {
    if (bodyRecords.length === 0) {
      window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['데이터가 없습니다'],
          datasets: [{
            label: '체중 (kg)',
            data: [goalWeight],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: '체중 (kg)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: '체중 변화 추이 (신체 정보 탭에서 데이터를 추가해주세요)'
            }
          }
        }
      });
    } else {
      const recentData = bodyRecords.slice(0, 30).reverse();
      window.weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: recentData.map(r => r.date),
          datasets: [{
            label: '체중 (kg)',
            data: recentData.map(r => r.weight),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: true,
            tension: 0.4
          }, {
            label: '목표 체중',
            data: recentData.map(() => goalWeight),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            borderDash: [5, 5],
            fill: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: '체중 (kg)'
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: '체중 변화 추이'
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('❌ 체중 차트 그리기 실패:', error);
  }
}

// sw.js
const CACHE_NAME = 'diet-app-v1';
const urlsToCache = [
  '/',
  '/style.css',
  '/script.js',
  '/index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('캐시 열림');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
