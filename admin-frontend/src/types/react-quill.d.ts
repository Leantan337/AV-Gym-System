declare module 'react-quill' {
  import React from 'react';
  
  interface ReactQuillProps {
    id?: string;
    className?: string;
    theme?: string;
    style?: React.CSSProperties;
    readOnly?: boolean;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    tabIndex?: number;
    modules?: unknown;
    formats?: string[];
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement;
    onChange?: (content: string, delta: unknown, source: string, editor: unknown) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onKeyPress?: React.EventHandler<React.KeyboardEvent<HTMLDivElement>>;
    onKeyDown?: React.EventHandler<React.KeyboardEvent<HTMLDivElement>>;
    onKeyUp?: React.EventHandler<React.KeyboardEvent<HTMLDivElement>>;
    preserveWhitespace?: boolean;
  }
  
  class ReactQuill extends React.Component<ReactQuillProps> {
    static Quill: unknown;
    getEditor(): unknown;
    focus(): void;
    blur(): void;
  }
  
  export default ReactQuill;
}
