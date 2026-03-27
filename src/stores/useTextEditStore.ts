import { create } from "zustand";

type TextEditState = {
  requestedElementId: string | null;
  requestKey: number;
  requestTextEdit: (id: string) => void;
  consumeTextEditRequest: (requestKey: number) => void;
  clearTextEditRequest: () => void;
};

export const useTextEditStore = create<TextEditState>((set) => ({
  requestedElementId: null,
  requestKey: 0,
  requestTextEdit: (id) =>
    set((state) =>
      ({
        requestedElementId: id,
        requestKey: state.requestKey + 1,
      }),
    ),
  consumeTextEditRequest: (requestKey) =>
    set((state) =>
      state.requestKey === requestKey
        ? { requestedElementId: null }
        : state,
    ),
  clearTextEditRequest: () => set({ requestedElementId: null }),
}));