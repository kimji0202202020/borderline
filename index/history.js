// Undo/Redo 히스토리 관리자
const MAX_HISTORY = 50;

export class EditorHistory {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.lastSavedContent = '';
    }

    // 현재 상태를 히스토리에 추가
    push(content) {
        // 이전 상태와 동일하면 무시
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === content) {
            return;
        }
        this.undoStack.push(content);
        this.redoStack = []; // 새 변경 시 redo 스택 초기화

        // 최대 히스토리 초과 시 오래된 항목 제거
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
    }

    // Undo: 이전 상태로
    undo(currentContent) {
        if (this.undoStack.length === 0) return null;

        this.redoStack.push(currentContent);
        return this.undoStack.pop();
    }

    // Redo: 되돌린 상태 복원
    redo(currentContent) {
        if (this.redoStack.length === 0) return null;

        this.undoStack.push(currentContent);
        return this.redoStack.pop();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    // 히스토리 초기화 (프로젝트 전환 시)
    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
