import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { state } from "./state.js";
import { showToast } from "./utils.js";

let db;

export function initDB(app) {
    db = getFirestore(app);
}

// 프로젝트 목록 불러오기
export async function loadProjectsForUser(userId) {
    const projectsRef = collection(db, 'projects');
    const q = query(projectsRef, where("ownerId", "==", userId), orderBy("lastModified", "desc"));

    try {
        const snapshot = await getDocs(q);
        state.projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return state.projects;
    } catch (error) {
        console.error("Load Projects Error:", error);
        showToast("프로젝트 목록을 불러오지 못했습니다.", 'error');
        return [];
    }
}

// 프로젝트 내용 불러오기 (보안 적용됨)
export async function loadProjectContent(projectId) {
    try {
        const projectRef = doc(db, 'projects', projectId);
        const projectSnap = await getDoc(projectRef);

        if (projectSnap.exists()) {
            const data = projectSnap.data();
            
            // [중요] XSS 방지: 서버에서 가져온 HTML을 소독합니다.
            const cleanContent = DOMPurify.sanitize(data.content);
            const cleanMemo = DOMPurify.sanitize(data.memo || '');

            return { id: projectSnap.id, ...data, content: cleanContent, memo: cleanMemo };
        }
        return null;
    } catch (error) {
        console.error("Load Content Error:", error);
        throw error;
    }
}

// 새 프로젝트 생성
export async function createNewProjectInDB(name) {
    const newProjectData = {
        name: name,
        content: `<div class="element scene-heading" data-type="scene-heading" data-placeholder="예: S#1. 카페 - 낮"><br></div>`,
        memo: '',
        ownerId: state.currentUser.uid,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'projects'), newProjectData);
    return docRef.id;
}

// 프로젝트 저장
export async function saveProjectToDB(content, memo) {
    if (!state.currentUser || !state.currentProjectId) return;
    
    const projectRef = doc(db, 'projects', state.currentProjectId);
    await updateDoc(projectRef, {
        content: content,
        memo: memo,
        lastModified: serverTimestamp()
    });
}

// 프로젝트 이름 변경
export async function updateProjectNameInDB(projectId, newName) {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { name: newName });
}

// 프로젝트 삭제
export async function deleteProjectFromDB(projectId) {
    await deleteDoc(doc(db, 'projects', projectId));
}