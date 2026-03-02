import { firebaseConfig } from "./firebase-config.js";
import { state } from "./state.js";
import { $, $$, showToast, downloadFile } from "./utils.js";
import { toggleLoginUI, renderProjectList, updateSidebars, updateSaveStatus } from "./ui.js";
import { setupEditor, editorHistory } from "./editor.js";

// 0. 테마 초기화 (JS 로드 즉시 적용)
function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('borderline-theme', theme);
    document.body.classList.toggle('dark-theme', theme === 'dark');
    const btn = $('#theme-toggle-btn');
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀';
}
applyTheme(state.theme);

// 1. 에디터 설정 (Firebase 무관)
const editorEl = $('#editor');
const memoEl = $('#memo-editor');

const handleAutoSave = () => {
    if (state.isGuest) {
        saveGuestProject();
        return;
    }
    clearTimeout(state.autoSaveTimer);
    updateSaveStatus('saving');
    state.autoSaveTimer = setTimeout(async () => {
        try {
            const { saveProjectToDB } = await import("./storage.js");
            await saveProjectToDB(editorEl.innerHTML, memoEl.value);
            updateSaveStatus('saved');
        } catch(e) {
            updateSaveStatus('error');
        }
    }, 1500);
};

const handleSidebarUpdate = () => {
    clearTimeout(state.sidebarUpdateTimer);
    state.sidebarUpdateTimer = setTimeout(() => updateSidebars(editorEl), 500);
};

setupEditor(editorEl, handleAutoSave, handleSidebarUpdate);

// ============================================================
// 2. 모든 UI 이벤트 리스너 등록 (Firebase 상태와 무관하게 항상 실행)
// ============================================================

// 사이드바 탭 전환
$$('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tab-pane').forEach(p => p.classList.remove('active'));
        const pane = $(`#${tab.dataset.tab}-pane`);
        if (pane) pane.classList.add('active');
    });
});

// 테마 전환
$('#theme-toggle-btn').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
});

// 단축키 도움말 모달
$('#help-btn').addEventListener('click', () => {
    $('#help-modal').classList.add('show');
});

// 모달 닫기 버튼 (data-action="close")
$$('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('show');
    });
});

// 사이드바 토글
$('#toggle-nav-btn').addEventListener('click', () => {
    const sidebar = $('#main-nav');
    const overlay = $('#overlay');
    sidebar.classList.toggle('collapsed');
    if (window.innerWidth <= 768) {
        overlay.classList.toggle('show');
    }
});
$('#overlay').addEventListener('click', () => {
    $('#main-nav').classList.add('collapsed');
    $('#overlay').classList.remove('show');
});

// 새 시나리오 만들기 모달 열기
$('#add-project-btn').addEventListener('click', () => {
    $('#new-project-modal').classList.add('show');
    $('#new-project-name').focus();
});

// 메모장 저장
memoEl.addEventListener('input', handleAutoSave);

// 이름 변경 모달
$('#rename-project-btn').addEventListener('click', () => {
    if (!state.currentProjectId) return;
    const current = state.projects.find(p => p.id === state.currentProjectId);
    if (!current) return;
    $('#rename-project-name').value = current.name;
    $('#rename-project-modal').classList.add('show');
    $('#rename-project-name').focus();
});

// 내보내기 버튼
$('#export-btn').addEventListener('click', () => {
    if (!state.currentProjectId) {
        showToast("시나리오를 먼저 선택하세요.", "error");
        return;
    }
    $('#export-modal').classList.add('show');
});

$$('.export-option').forEach(btn => {
    btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        const title = $('#current-project-title').textContent || '시나리오';
        if (format === 'txt') {
            const text = editorEl.innerText;
            downloadFile(`${title}.txt`, text);
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf || {};
            if (jsPDF && window.html2canvas) {
                html2canvas(editorEl).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const imgWidth = 210;
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    pdf.save(`${title}.pdf`);
                });
            }
        }
        $('#export-modal').classList.remove('show');
    });
});

// 줌 컨트롤
$('#zoom-in-btn').addEventListener('click', () => {
    state.zoomLevel = Math.min(state.zoomLevel + 0.1, 2.0);
    editorEl.style.transform = `scale(${state.zoomLevel})`;
    $('#zoom-reset-btn').textContent = `${Math.round(state.zoomLevel * 100)}%`;
});
$('#zoom-out-btn').addEventListener('click', () => {
    state.zoomLevel = Math.max(state.zoomLevel - 0.1, 0.5);
    editorEl.style.transform = `scale(${state.zoomLevel})`;
    $('#zoom-reset-btn').textContent = `${Math.round(state.zoomLevel * 100)}%`;
});
$('#zoom-reset-btn').addEventListener('click', () => {
    state.zoomLevel = 1.0;
    editorEl.style.transform = `scale(1)`;
    $('#zoom-reset-btn').textContent = '100%';
});

// 로그아웃
$('#logout-btn').addEventListener('click', async () => {
    if (state.isGuest) {
        state.isGuest = false;
        location.reload();
        return;
    }
    try {
        const { getAuth, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        const auth = getAuth();
        await signOut(auth);
    } catch(e) {
        location.reload();
    }
});

// ============================================================
// 3. 게스트 모드
// ============================================================

$('#guest-btn').addEventListener('click', () => {
    state.isGuest = true;
    state.currentUser = { uid: 'guest', displayName: '게스트', photoURL: '' };

    $('#login-container').style.display = 'none';
    $('#app-container').style.display = 'flex';
    $('#user-photo').src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="%2364748b"/><text x="16" y="21" text-anchor="middle" fill="white" font-size="16">G</text></svg>';
    $('#user-name').textContent = '게스트';

    // 게스트 배너 표시
    const banner = document.createElement('div');
    banner.className = 'guest-banner';
    banner.innerHTML = '<span>게스트 모드 — 데이터가 브라우저에만 저장됩니다.</span><button id="guest-login-switch">Google로 로그인</button>';
    const mainContent = document.querySelector('.main-content');
    mainContent.prepend(banner);
    mainContent.style.gridTemplateRows = 'auto 46px 1fr';
    $('#guest-login-switch').addEventListener('click', () => {
        location.reload();
    });

    // 로컬 스토리지에서 게스트 데이터 로드
    const guestProjects = JSON.parse(localStorage.getItem('guest-projects') || '[]');
    state.projects = guestProjects;
    renderProjectList(loadGuestProject, confirmDeleteGuestProject);

    if (guestProjects.length > 0) {
        loadGuestProject(guestProjects[0].id);
    }
});

// 게스트 모드: 새 시나리오 만들기 (첫 번째 핸들러 - 게스트용)
$('#create-project-btn').addEventListener('click', () => {
    if (!state.isGuest) return;
    const name = $('#new-project-name').value || `무제 ${state.projects.length + 1}`;
    const newProject = {
        id: 'guest-' + Date.now(),
        name: name,
        content: '<div class="element scene-heading" data-type="scene-heading" data-placeholder="예: S#1. 카페 - 낮"><br></div>',
        memo: '',
        lastModified: Date.now()
    };
    state.projects.unshift(newProject);
    localStorage.setItem('guest-projects', JSON.stringify(state.projects));
    loadGuestProject(newProject.id);
    $('#new-project-modal').classList.remove('show');
    $('#new-project-name').value = '';
});

// 게스트 모드용 프로젝트 관리 함수들
function loadGuestProject(id) {
    const project = state.projects.find(p => p.id === id);
    if (project) {
        state.currentProjectId = id;
        editorEl.innerHTML = project.content || '<div class="element scene-heading" data-type="scene-heading" data-placeholder="예: S#1. 카페 - 낮"><br></div>';
        memoEl.value = project.memo || '';
        $('#current-project-title').textContent = project.name;
        $('#current-project-title-wrapper').classList.add('editable');

        editorHistory.clear();
        editorHistory.push(editorEl.innerHTML);

        updateSidebars(editorEl);
        renderProjectList(loadGuestProject, confirmDeleteGuestProject);
    }
}

function saveGuestProject() {
    if (!state.isGuest || !state.currentProjectId) return;
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (project) {
        project.content = editorEl.innerHTML;
        project.memo = memoEl.value;
        project.lastModified = Date.now();
        localStorage.setItem('guest-projects', JSON.stringify(state.projects));
    }
}

function confirmDeleteGuestProject(id, name) {
    const modal = $('#confirm-delete-modal');
    $('#confirm-delete-message').textContent = `'${name}' 삭제하시겠습니까?`;
    modal.classList.add('show');

    const oldBtn = $('#confirm-delete-btn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.onclick = () => {
        state.projects = state.projects.filter(p => p.id !== id);
        localStorage.setItem('guest-projects', JSON.stringify(state.projects));
        modal.classList.remove('show');
        if (state.currentProjectId === id) {
            editorEl.innerHTML = '';
            $('#current-project-title').textContent = '시나리오 없음';
            state.currentProjectId = null;
        }
        renderProjectList(loadGuestProject, confirmDeleteGuestProject);
        showToast("삭제되었습니다.");
    };
}

// 게스트 모드: 자동 저장 연동
editorEl.addEventListener('input', () => {
    if (state.isGuest) saveGuestProject();
});
memoEl.addEventListener('input', () => {
    if (state.isGuest) saveGuestProject();
});

// 이름 변경 저장
$('#save-rename-btn').addEventListener('click', async () => {
    const newName = $('#rename-project-name').value.trim();
    if (!newName || !state.currentProjectId) return;
    if (state.isGuest) {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        if (project) {
            project.name = newName;
            localStorage.setItem('guest-projects', JSON.stringify(state.projects));
            $('#current-project-title').textContent = newName;
            renderProjectList(loadGuestProject, confirmDeleteGuestProject);
        }
    } else {
        try {
            const { updateProjectNameInDB } = await import("./storage.js");
            await updateProjectNameInDB(state.currentProjectId, newName);
            $('#current-project-title').textContent = newName;
            await refreshProjectList();
        } catch(e) {
            showToast("이름 변경 실패", "error");
        }
    }
    $('#rename-project-modal').classList.remove('show');
});

// ============================================================
// 4. Firebase 초기화 (실패해도 앱이 깨지지 않도록 안전하게 감쌈)
// ============================================================

let app = null;

async function initFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        app = initializeApp(firebaseConfig);

        const { initDB } = await import("./storage.js");
        initDB(app);

        const { initAuth } = await import("./auth.js");
        initAuth(app,
            // 로그인 성공 시
            async (user) => {
                toggleLoginUI(true, user);
                await refreshProjectList();

                const lastId = localStorage.getItem('lastProjectId');
                if (lastId) loadProject(lastId);
            },
            // 로그아웃 시
            () => {
                toggleLoginUI(false);
                editorEl.innerHTML = '';
                state.projects = [];
            }
        );

        // Firebase 로그인 모드에서 새 시나리오 만들기
        $('#create-project-btn').addEventListener('click', () => {
            if (state.isGuest) return;
            createNewProject($('#new-project-name').value);
        });

    } catch (e) {
        console.error("Firebase 초기화 실패:", e);
        $('#firebase-error-message').style.display = 'block';
    }
}

// Firebase 로그인 모드용 함수들
async function refreshProjectList() {
    try {
        const { loadProjectsForUser } = await import("./storage.js");
        await loadProjectsForUser(state.currentUser.uid);
        renderProjectList(loadProject, confirmDeleteProject);
    } catch(e) {
        console.error("프로젝트 목록 로드 실패:", e);
    }
}

async function loadProject(id) {
    try {
        const { loadProjectContent } = await import("./storage.js");
        const project = await loadProjectContent(id);
        if (project) {
            state.currentProjectId = id;
            localStorage.setItem('lastProjectId', id);

            editorEl.innerHTML = project.content;
            memoEl.value = project.memo;
            $('#current-project-title').textContent = project.name;
            $('#current-project-title-wrapper').classList.add('editable');

            editorHistory.clear();
            editorHistory.push(project.content);

            updateSidebars(editorEl);
            refreshProjectList();
        }
    } catch (e) {
        showToast("시나리오 로드 실패", "error");
    }
}

async function createNewProject(name) {
    const defaultName = name || `무제 ${state.projects.length + 1}`;
    try {
        const { createNewProjectInDB } = await import("./storage.js");
        const newId = await createNewProjectInDB(defaultName);
        await refreshProjectList();
        await loadProject(newId);
        $('#new-project-modal').classList.remove('show');
    } catch (e) {
        showToast("생성 실패", "error");
    }
}

function confirmDeleteProject(id, name) {
    const modal = $('#confirm-delete-modal');
    $('#confirm-delete-message').textContent = `'${name}' 삭제하시겠습니까?`;
    modal.classList.add('show');

    const oldBtn = $('#confirm-delete-btn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.onclick = async () => {
        try {
            const { deleteProjectFromDB } = await import("./storage.js");
            await deleteProjectFromDB(id);
            modal.classList.remove('show');
            if (state.currentProjectId === id) {
                editorEl.innerHTML = '';
                $('#current-project-title').textContent = '시나리오 없음';
                state.currentProjectId = null;
            }
            await refreshProjectList();
            showToast("삭제되었습니다.");
        } catch(e) {
            showToast("삭제 실패", "error");
        }
    };
}

// Firebase 초기화 실행
initFirebase();
