export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const PREVIEW_DEVICES: { id: PreviewDevice; label: string; width: number | null }[] = [
  { id: "desktop", label: "Masaüstü", width: null },
  { id: "tablet", label: "Tablet", width: 820 },
  { id: "mobile", label: "Telefon", width: 390 },
];

export const DESKTOP_MIN_WIDTH = 1100;
export const PREVIEW_CONTAINER = "dm-page";

export function initialDevice(): PreviewDevice {
  if (window.innerWidth >= DESKTOP_MIN_WIDTH) return "desktop";
  return window.innerWidth >= 700 ? "tablet" : "mobile";
}

const WIDTH_FEATURE = String.raw`\(\s*(?:(?:min|max)-width\s*:\s*[\d.]+(?:px|r?em)|width\s*[<>]=?\s*[\d.]+(?:px|r?em))\s*\)`;
const WIDTH_ONLY = new RegExp(String.raw`^\s*${WIDTH_FEATURE}(?:\s+and\s+${WIDTH_FEATURE})*\s*$`, "i");
const VIEWPORT_WIDTH = /(\d)vw\b/g;

type Parent = CSSStyleSheet | CSSGroupingRule;
type Swap = { parent: Parent; index: number; original: string };
type Restyle = { style: CSSStyleDeclaration; property: string; value: string; priority: string };

function isEditorUi(rule: CSSRule) {
  return rule instanceof CSSStyleRule && rule.selectorText.includes("visual-editor");
}

function rulesOf(parent: Parent): CSSRuleList | null {
  try {
    return parent.cssRules;
  } catch {
    // Cross-origin sheets cannot be read; they hold no page layout rules.
    return null;
  }
}

/**
 * The store's responsive CSS uses viewport media queries, so a narrow editor frame would still render
 * the desktop layout. While the editor is open, width-only media rules are swapped in place (same
 * order and layer) for container queries on the preview frame, and vw lengths become cqw.
 * Nothing is written to files; stop() puts every rule back.
 */
export function startPreviewCss() {
  const swaps: Swap[] = [];
  const restyles: Restyle[] = [];
  const seen = new WeakSet<CSSStyleDeclaration>();

  const visit = (parent: Parent) => {
    const rules = rulesOf(parent);
    if (!rules) return;
    for (let index = 0; index < rules.length; index += 1) {
      const rule = rules[index];
      if (rule instanceof CSSMediaRule) {
        const condition = rule.media.mediaText;
        const inner = [...rule.cssRules];
        if (WIDTH_ONLY.test(condition) && inner.length > 0 && !inner.every(isEditorUi)) {
          const original = rule.cssText;
          const replacement = `@container ${PREVIEW_CONTAINER} ${condition} { ${inner.map((item) => item.cssText).join("\n")} }`;
          try {
            parent.deleteRule(index);
            parent.insertRule(replacement, index);
            swaps.push({ parent, index, original });
          } catch {
            try {
              parent.insertRule(original, index);
            } catch {
              // The rule could not be restored; leave the sheet as the browser has it.
            }
            continue;
          }
          const swapped = rules[index];
          if (swapped instanceof CSSGroupingRule) visit(swapped);
          continue;
        }
      }
      if (rule instanceof CSSStyleRule && !isEditorUi(rule) && !seen.has(rule.style)) {
        seen.add(rule.style);
        for (let i = 0; i < rule.style.length; i += 1) {
          const property = rule.style[i];
          const value = rule.style.getPropertyValue(property);
          if (!VIEWPORT_WIDTH.test(value)) continue;
          VIEWPORT_WIDTH.lastIndex = 0;
          const priority = rule.style.getPropertyPriority(property);
          restyles.push({ style: rule.style, property, value, priority });
          rule.style.setProperty(property, value.replace(VIEWPORT_WIDTH, "$1cqw"), priority);
        }
      }
      if (rule instanceof CSSGroupingRule) visit(rule);
    }
  };

  const scan = () => {
    for (const sheet of [...document.styleSheets]) visit(sheet);
  };

  scan();
  // Development reloads inject fresh stylesheets; convert them as they arrive.
  const observer = new MutationObserver(() => scan());
  observer.observe(document.head, { childList: true, subtree: true });

  return function stop() {
    observer.disconnect();
    for (const { style, property, value, priority } of restyles.reverse()) style.setProperty(property, value, priority);
    for (const { parent, index, original } of swaps.reverse()) {
      const rules = rulesOf(parent);
      if (!rules || !(rules[index] instanceof CSSContainerRule)) continue;
      try {
        parent.deleteRule(index);
        parent.insertRule(original, index);
      } catch {
        // The sheet was replaced in the meantime; the new copy is already in its original form.
      }
    }
  };
}
