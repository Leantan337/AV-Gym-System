declare module 'dompurify' {
  interface DOMPurifyConfig {
    ADD_ATTR?: string[];
    ADD_DATA_URI_TAGS?: string[];
    ADD_TAGS?: string[];
    ALLOW_DATA_ATTR?: boolean;
    ALLOW_UNKNOWN_PROTOCOLS?: boolean;
    ALLOWED_ATTR?: string[];
    ALLOWED_TAGS?: string[];
    FORBID_ATTR?: string[];
    FORBID_TAGS?: string[];
    FORCE_BODY?: boolean;
    KEEP_CONTENT?: boolean;
    RETURN_DOM?: boolean;
    RETURN_DOM_FRAGMENT?: boolean;
    RETURN_DOM_IMPORT?: boolean;
    RETURN_TRUSTED_TYPE?: boolean;
    SAFE_FOR_JQUERY?: boolean;
    SAFE_FOR_TEMPLATES?: boolean;
    SANITIZE_DOM?: boolean;
    USE_PROFILES?: {
      html?: boolean;
      mathMl?: boolean;
      svg?: boolean;
      svgFilters?: boolean;
    };
    WHOLE_DOCUMENT?: boolean;
  }

  interface DOMPurify {
    sanitize(
      dirty: string | Node,
      config?: DOMPurifyConfig | undefined
    ): string;
    addHook(
      hook: string,
      cb: (node: Node, data: any, config: any) => Node | void
    ): DOMPurify;
    removeHook(hook: string): DOMPurify;
    removeHooks(hook: string): DOMPurify;
    removeAllHooks(): DOMPurify;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
    setConfig(cfg: DOMPurifyConfig): DOMPurify;
    clearConfig(): void;
    version: string;
  }

  const domPurify: DOMPurify;
  export default domPurify;
}
