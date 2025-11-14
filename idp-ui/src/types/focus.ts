export interface FocusableInputHandle {
  focusIn?: () => void;
  focus?: () => void;
  inputElement?: HTMLInputElement | HTMLTextAreaElement | null;
  element?: HTMLElement | null;
  querySelector?: (selector: string) => Element | null;
}

export type FocusableInputElement = HTMLInputElement | HTMLTextAreaElement;

export type FocusableInputRef = React.RefObject<FocusableInputHandle | FocusableInputElement>;
