import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { firebaseConfig } from "./firebase-config.js";
import { initAuth } from "./auth.js";
import { initDB, loadProjectsForUser, createNewProjectInDB, saveProjectToDB, loadProjectContent, deleteProjectFromDB, updateProjectNameInDB } from "./storage.js";
import { setupEditor } from "./editor.js";
import { toggleLoginUI, renderProjectList, updateSidebars, updateSaveStatus, showToast } from "./ui.js";
import { state } from "./state.js";
import { $, $$ } from "./utils.js";

// 1. Firebase 초기화
let app;
try {
    app = initializeApp(firebaseConfig);
    initDB(app);
} catch (e) {
    $('#firebase-error-message').style.display = 'block';
    console.error(e);
}

// 2. 에디터 설정
const editorEl = $('#editor');
const memoEl = $('#memo-editor');

const handleAutoSave = () => {
    clearTimeout(state.autoSaveTimer);
    updateSaveStatus('saving'); // UI 표시
    state.autoSaveTimer = setTimeout(async () => {
        try {
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

// 3. 인증 및 데이터 로드
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

// 4. 주요 로직 함수들
async function refreshProjectList() {
    await loadProjectsForUser(state.currentUser.uid);
    renderProjectList(loadProject, confirmDeleteProject);
}

async function loadProject(id) {
    try {
        const project = await loadProjectContent(id);
        if (project) {
            state.currentProjectId = id;
            localStorage.setItem('lastProjectId', id);
            
            editorEl.innerHTML = project.content;
            memoEl.value = project.memo;
            $('#current-project-title').textContent = project.name;
            $('#current-project-title-wrapper').classList.add('editable');
            
            updateSidebars(editorEl);
            refreshProjectList(); // 활성 상태 갱신
        }
    } catch (e) {
        showToast("프로젝트 로드 실패", "error");
    }
}

async function createNewProject(name) {
    const defaultName = name || `무제 ${state.projects.length + 1}`;
    try {
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
    
    // 이벤트 리스너 중복 방지를 위해 복제
    const oldBtn = $('#confirm-delete-btn');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.onclick = async () => {
        await deleteProjectFromDB(id);
        modal.classList.remove('show');
        if (state.currentProjectId === id) {
            editorEl.innerHTML = '';
            $('#current-project-title').textContent = '프로젝트 없음';
            state.currentProjectId = null;
        }
        await refreshProjectList();
        showToast("삭제되었습니다.");
    };
}

// 5. 버튼 이벤트 연결
$('#add-project-btn').addEventListener('click', () => {
    $('#new-project-modal').classList.add('show');
    $('#new-project-name').focus();
});

$('#create-project-btn').addEventListener('click', () => {
    createNewProject($('#new-project-name').value);
});

// 메모장 저장
memoEl.addEventListener('input', handleAutoSave);

// 기타 모달 닫기 버튼 등은 HTML의 data-action="close" 속성으로 처리됨
$$('[data-action="close"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('show');
    });
});