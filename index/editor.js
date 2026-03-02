import { $, $$ } from "./utils.js";
import { state } from "./state.js";
import { EditorHistory } from "./history.js";

const elementTypes = {
    'scene-heading': { class: 'scene-heading', placeholder: '예: S#1. 카페 - 낮' },
    'action': { class: 'action', placeholder: '행동이나 지문을 입력하세요' },
    'character': { class: 'character', placeholder: '인물 이름' },
    'dialogue': { class: 'dialogue', placeholder: '대사를 입력하세요' },
    'parenthetical': { class: 'parenthetical', placeholder: '(놀라며)' }
};

export const editorHistory = new EditorHistory();

export function setupEditor(editorElement, onAutoSave, onSidebarUpdate) {

    let historyTimer = null;

    // 히스토리에 현재 상태 저장 (디바운스)
    const pushHistory = () => {
        clearTimeout(historyTimer);
        historyTimer = setTimeout(() => {
            editorHistory.push(editorElement.innerHTML);
            updateUndoRedoButtons();
        }, 500);
    };

    // Undo/Redo 버튼 상태 업데이트
    const updateUndoRedoButtons = () => {
        const undoBtn = $('#undo-btn');
        const redoBtn = $('#redo-btn');
        if (undoBtn) undoBtn.disabled = !editorHistory.canUndo();
        if (redoBtn) redoBtn.disabled = !editorHistory.canRedo();
    };
    
    // 요소 생성 헬퍼
    const createNewElement = (type, content = '<br>') => {
        const div = document.createElement('div');
        const config = elementTypes[type];
        div.className = `element ${config.class}`;
        div.dataset.type = type;
        div.dataset.placeholder = config.placeholder;
        div.innerHTML = content;
        return div;
    };

    // 현재 선택된 요소 찾기
    const getActiveElement = () => {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;
        let node = selection.anchorNode;
        if (!editorElement.contains(node)) return null;
        return node.nodeType === Node.TEXT_NODE ? node.parentElement.closest('.element') : node.closest('.element');
    };

    // 포커스 이동
    const setCaret = (element) => {
        const range = document.createRange();
        const sel = window.getSelection();
        if (!element.hasChildNodes() || element.innerHTML === '<br>') element.innerHTML = '\u200B';
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
    };

    // 엔터키 로직
    const handleEnter = (e) => {
        e.preventDefault();
        const current = getActiveElement();
        if (!current) return;
        const currentType = current.dataset.type;

        // Shift + Enter: 같은 타입 줄바꿈
        if (e.shiftKey) {
            const newEl = createNewElement(currentType, '');
            current.after(newEl);
            setCaret(newEl);
            updateActiveFormatButton(currentType);
            pushHistory();
            onAutoSave();
            return;
        }

        // Enter: 다음 추천 타입으로
        const nextTypeMap = {
            'scene-heading': 'action',
            'action': 'character',
            'character': 'dialogue',
            'dialogue': 'character',
            'parenthetical': 'dialogue'
        };
        const nextType = nextTypeMap[currentType] || 'action';
        const newEl = createNewElement(nextType, '');
        current.after(newEl);
        setCaret(newEl);
        updateActiveFormatButton(nextType);
        pushHistory();
        onSidebarUpdate();
        onAutoSave();
    };

    // 백스페이스키 로직: 빈 요소에서 백스페이스 시 이전 요소로 합치기
    const handleBackspace = (e) => {
        const current = getActiveElement();
        if (!current) return;
        const text = current.textContent.replace(/\u200B/g, '').trim();
        if (text === '' && current.previousElementSibling) {
            e.preventDefault();
            const prev = current.previousElementSibling;
            current.remove();
            setCaret(prev);
            updateActiveFormatButton(prev.dataset.type);
            pushHistory();
            onSidebarUpdate();
            onAutoSave();
        }
    };

    // 탭키 로직
    const handleTab = (e) => {
        e.preventDefault();
        const current = getActiveElement();
        if (!current) return;

        const types = Object.keys(elementTypes);
        const idx = types.indexOf(current.dataset.type);
        const nextType = types[(idx + 1) % types.length];

        current.className = `element ${elementTypes[nextType].class}`;
        current.dataset.type = nextType;
        current.dataset.placeholder = elementTypes[nextType].placeholder;

        // 포맷 버튼 UI 업데이트
        updateActiveFormatButton(nextType);
        pushHistory();
        onAutoSave();
    };

    // 포맷 버튼 UI 연동
    const nextTypeNames = {
        'scene-heading': '행동',
        'action': '인물',
        'character': '대사',
        'dialogue': '인물',
        'parenthetical': '대사'
    };

    const updateActiveFormatButton = (type) => {
        $$('.format-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        // 툴바 힌트 업데이트
        const hint = $('#toolbar-hint');
        if (hint && nextTypeNames[type]) {
            hint.textContent = `Enter → ${nextTypeNames[type]}`;
        }
    };

    // 포맷 버튼 클릭으로 현재 요소 타입 변경
    $$('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const current = getActiveElement();
            if (!current) {
                // 에디터에 요소가 없으면 새 요소 생성
                if (editorElement.children.length === 0) {
                    const newEl = createNewElement(btn.dataset.type);
                    editorElement.appendChild(newEl);
                    setCaret(newEl);
                }
                return;
            }
            const type = btn.dataset.type;
            current.className = `element ${elementTypes[type].class}`;
            current.dataset.type = type;
            current.dataset.placeholder = elementTypes[type].placeholder;
            updateActiveFormatButton(type);
            setCaret(current);
            pushHistory();
            onAutoSave();
        });
    });

    // 이벤트 리스너 등록
    editorElement.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter') handleEnter(e);
        if (e.key === 'Tab') handleTab(e);
        if (e.key === 'Backspace') handleBackspace(e);

        // Undo/Redo (Ctrl+Z / Ctrl+Y)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            const prev = editorHistory.undo(editorElement.innerHTML);
            if (prev !== null) {
                editorElement.innerHTML = prev;
                onSidebarUpdate();
                onAutoSave();
            }
            updateUndoRedoButtons();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            const next = editorHistory.redo(editorElement.innerHTML);
            if (next !== null) {
                editorElement.innerHTML = next;
                onSidebarUpdate();
                onAutoSave();
            }
            updateUndoRedoButtons();
            return;
        }

        // 단축키 (Ctrl+1~5)
        if (e.ctrlKey || e.metaKey) {
            const keyMap = {'1':'scene-heading', '2':'action', '3':'character', '4':'dialogue', '5':'parenthetical'};
            if (keyMap[e.key]) {
                e.preventDefault();
                const current = getActiveElement();
                if(current) {
                    const type = keyMap[e.key];
                    current.className = `element ${elementTypes[type].class}`;
                    current.dataset.type = type;
                    current.dataset.placeholder = elementTypes[type].placeholder;
                    updateActiveFormatButton(type);
                    pushHistory();
                    onAutoSave();
                }
            }
        }
    });

    editorElement.addEventListener('click', () => {
        const current = getActiveElement();
        if(current) updateActiveFormatButton(current.dataset.type);
    });

    editorElement.addEventListener('input', () => {
        if (state.isComposing) return;
        if (editorElement.children.length === 0) {
            editorElement.appendChild(createNewElement('action'));
        }
        pushHistory();
        onAutoSave();
    });

    // Undo/Redo 버튼 클릭 이벤트
    const undoBtn = $('#undo-btn');
    const redoBtn = $('#redo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            const prev = editorHistory.undo(editorElement.innerHTML);
            if (prev !== null) {
                editorElement.innerHTML = prev;
                onSidebarUpdate();
                onAutoSave();
            }
            updateUndoRedoButtons();
        });
    }
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            const next = editorHistory.redo(editorElement.innerHTML);
            if (next !== null) {
                editorElement.innerHTML = next;
                onSidebarUpdate();
                onAutoSave();
            }
            updateUndoRedoButtons();
        });
    }

    updateUndoRedoButtons();

    return { createNewElement };
}