import { create } from 'zustand';

interface ConfirmState {
    isOpen: boolean;
    title?: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    resolve: ((value: boolean) => void) | null;
}

interface ConfirmOptions {
    title?: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
}

interface ConfirmStore extends ConfirmState {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    close: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
    isOpen: false,
    message: '',
    resolve: null,

    confirm: (options) => {
        return new Promise<boolean>((resolve) => {
            set({
                isOpen: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || 'Confirm',
                cancelText: options.cancelText || 'Cancel',
                resolve,
            });
        });
    },

    close: (result) => {
        const { resolve } = get();
        if (resolve) {
            resolve(result);
        }
        set({ isOpen: false, resolve: null });
    },
}));
