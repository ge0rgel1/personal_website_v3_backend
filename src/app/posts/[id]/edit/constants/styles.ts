// Custom CSS styles for the markdown editor
export const customStyles = `
  /* KaTeX Display Math Styling */
  .katex-display {
    display: block !important;
    text-align: center !important;
    margin: 1.5rem 0 !important;
    font-size: 1.2em !important;
    overflow-x: auto !important;
    padding: 0.5rem !important;
  }
  
  .math.math-display {
    display: block !important;
    text-align: center !important;
    margin: 1.5rem 0 !important;
    font-size: 1.2em !important;
    overflow-x: auto !important;
    padding: 0.5rem !important;
  }
  
  /* Handle multi-line math expressions */
  .katex-display .katex-html {
    text-align: center !important;
  }
  
  .katex-display .katex .base {
    margin: 0 auto !important;
  }
  
  /* Matrix and multiline support */
  .katex .mord + .mord,
  .katex .mrel + .mrel,
  .katex .mbin + .mbin,
  .katex .mopen + .mopen,
  .katex .mclose + .mclose {
    margin-left: 0.16667em;
  }
  
  /* Inline math styling */
  .katex {
    font-size: 1.1em !important;
  }
  
  /* Toolbar Configuration Variables */
  :root {
    --toolbar-icon-size: 18px;
    --toolbar-text-size: 14px;
    --toolbar-button-padding-x: 8px;
    --toolbar-button-padding-y: 4px;
    --toolbar-dropdown-icon-size: 12px;
    --dropdown-text-size: 14px;
    --dropdown-padding-x: 12px;
    --dropdown-padding-y: 8px;
  }
  
  /* Toolbar Button Styles */
  .toolbar-button {
    padding: var(--toolbar-button-padding-y) var(--toolbar-button-padding-x);
    font-size: var(--toolbar-text-size);
  }
  
  .toolbar-icon {
    width: var(--toolbar-icon-size);
    height: var(--toolbar-icon-size);
  }
  
  .toolbar-dropdown-icon {
    width: var(--toolbar-dropdown-icon-size);
    height: var(--toolbar-dropdown-icon-size);
  }
  
  .toolbar-text {
    font-size: var(--toolbar-text-size);
  }
  
  .dropdown-item {
    padding: var(--dropdown-padding-y) var(--dropdown-padding-x);
    font-size: var(--dropdown-text-size);
  }
`
