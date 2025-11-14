export interface FocusableInputHandle {
  focus: () => void;
}

export type FocusableInputElement = HTMLInputElement | HTMLTextAreaElement;

export type FocusableInputRef = React.RefObject<FocusableInputHandle | FocusableInputElement>;
