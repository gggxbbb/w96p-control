import { createContext, useContext, type ReactNode } from 'react';

const EditModeContext = createContext<boolean>(false);

export function EditModeProvider({ editable, children }: { editable: boolean; children: ReactNode }) {
  return <EditModeContext.Provider value={editable}>{children}</EditModeContext.Provider>;
}

export function useEditMode() {
  return useContext(EditModeContext);
}
