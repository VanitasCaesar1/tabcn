/**
 * Reads a registry design's props from its source, for the props table on its page of the site
 * and for scripts/check-registry.ts (docs/designs/website.md, "Props tables on each design's
 * page"). It parses one file at a time with `ts.createSourceFile`: syntax only, no type checker,
 * so it's fast and doesn't need React Native's types. Types are kept as written.
 *
 * For each member of the component's props (the interface `<Component>Props`, or else the type
 * of the component's first parameter) it records:
 *   - name and optionality;
 *   - type, as written (`Partial<SoftPillColors>`, `'glass' | 'tint'`), with the names it uses
 *     that the file itself declares, so the page can link them to their line in the source;
 *   - default: the destructured parameter's initializer (a same-file `const` is resolved to its
 *     value), else a `@default` tag, else a leading "Default <value>" in the doc comment;
 *   - description: the doc comment's text. `colors` and `haptics` mean the same in every
 *     design, so a member without one gets the shared text in SHARED_DESCRIPTIONS.
 */
import ts from 'typescript';

export interface TypeRef {
  /** A name declared in the design file, such as `SoftPillColors`. */
  name: string;
  /** 1-based line of its declaration. */
  line: number;
}

export interface DesignProp {
  name: string;
  optional: boolean;
  type: string;
  /** Names in `type` that the design file declares. */
  refs: TypeRef[];
  default: string | null;
  /** The doc comment's text, the shared text for `colors` or `haptics`, or ''. */
  description: string;
}

/** Descriptions for the props every design shares, used when the member has no doc comment. */
export const SHARED_DESCRIPTIONS: Readonly<Record<string, string>> = {
  colors: 'Overrides any of the default colors; the rest keep their defaults.',
  haptics: 'Haptic feedback on press (expo-haptics).',
};

export interface DesignProps {
  component: string;
  /** The props interface or type alias, or null when the parameter's type is written inline. */
  typeName: string | null;
  /** 1-based line of the props declaration. */
  line: number;
  props: DesignProp[];
}

const lineOf = (file: ts.SourceFile, pos: number) =>
  file.getLineAndCharacterOfPosition(pos).line + 1;

/** Collapses the whitespace a multi-line type keeps when printed as written. */
const oneLine = (text: string) =>
  text
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/;\s*}/g, ' }')
    .trim();

function docText(node: ts.Node) {
  const docs = ts.getJSDocCommentsAndTags(node).filter(ts.isJSDoc);
  const doc = docs[docs.length - 1];
  if (!doc) return { description: '', defaultTag: null as string | null };
  const description = (ts.getTextOfJSDocComment(doc.comment) ?? '').replace(/\s+/g, ' ').trim();
  const tag = doc.tags?.find((t) => t.tagName.text === 'default');
  const defaultTag = tag ? (ts.getTextOfJSDocComment(tag.comment) ?? '').trim() || null : null;
  return { description, defaultTag };
}

/** "Default 24." or "Default `'player'`: …" at the start of a sentence of the doc comment. */
function defaultInText(description: string) {
  const m = description.match(
    /(?:^|[.:;]\s)Default (`[^`]+`|"[^"]+"|[\w.'%-]+?)(?=[.,:;]?(?:\s|$))/,
  );
  if (!m?.[1]) return null;
  return m[1].replace(/^`|`$/g, '').replace(/^"(.*)"$/, "'$1'");
}

/** A literal-ish initializer (`24`, `'auto'`, `SPACING`, `['50%', '100%']`) as source text. */
function valueText(file: ts.SourceFile, expr: ts.Expression, consts: Map<string, ts.Expression>) {
  if (ts.isIdentifier(expr)) {
    const value = consts.get(expr.text);
    if (value && !ts.isIdentifier(value)) return oneLine(value.getText(file));
  }
  return oneLine(expr.getText(file));
}

/**
 * The props of the design's exported component, or null if the file has no exported function
 * component or its props can't be found.
 */
export function readDesignProps(source: string, fileName = 'design.tsx'): DesignProps | null {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const declared = new Map<string, number>();
  const consts = new Map<string, ts.Expression>();
  const interfaces = new Map<string, ts.InterfaceDeclaration>();
  const aliases = new Map<string, ts.TypeAliasDeclaration>();
  let component: ts.FunctionDeclaration | undefined;

  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      interfaces.set(statement.name.text, statement);
      declared.set(statement.name.text, lineOf(file, statement.getStart(file)));
    } else if (ts.isTypeAliasDeclaration(statement)) {
      aliases.set(statement.name.text, statement);
      declared.set(statement.name.text, lineOf(file, statement.getStart(file)));
    } else if (ts.isEnumDeclaration(statement) || ts.isClassDeclaration(statement)) {
      if (statement.name) declared.set(statement.name.text, lineOf(file, statement.getStart(file)));
    } else if (ts.isVariableStatement(statement)) {
      const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
      for (const d of statement.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && isConst && d.initializer) {
          consts.set(d.name.text, d.initializer);
        }
      }
    } else if (
      ts.isFunctionDeclaration(statement) &&
      !component &&
      statement.name &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) &&
      /^[A-Z]/.test(statement.name.text)
    ) {
      component = statement;
    }
  }
  if (!component?.name) return null;
  const name = component.name.text;
  const param = component.parameters[0];

  // Defaults from the destructured parameter, keyed by the property name (`colors: custom`).
  const defaults = new Map<string, string>();
  if (param && ts.isObjectBindingPattern(param.name)) {
    for (const el of param.name.elements) {
      if (el.dotDotDotToken || !el.initializer) continue;
      const key = el.propertyName ?? el.name;
      if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
        defaults.set(key.text, valueText(file, el.initializer, consts));
      }
    }
  }

  // The props declaration: `<Component>Props`, else the first parameter's type.
  let typeName: string | null = null;
  let members: ts.NodeArray<ts.TypeElement> | undefined;
  let line = 0;
  const fromName = (n: string) => {
    const iface = interfaces.get(n);
    if (iface) {
      typeName = n;
      line = lineOf(file, iface.getStart(file));
      return iface.members;
    }
    const alias = aliases.get(n);
    if (alias && ts.isTypeLiteralNode(alias.type)) {
      typeName = n;
      line = lineOf(file, alias.getStart(file));
      return alias.type.members;
    }
    return undefined;
  };
  members = fromName(`${name}Props`);
  if (!members && param?.type) {
    if (ts.isTypeReferenceNode(param.type) && ts.isIdentifier(param.type.typeName)) {
      members = fromName(param.type.typeName.text);
    } else if (ts.isTypeLiteralNode(param.type)) {
      members = param.type.members;
      line = lineOf(file, param.type.getStart(file));
    }
  }
  if (!members) return null;

  const props: DesignProp[] = [];
  for (const member of members) {
    if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member)) continue;
    const key = member.name;
    if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) continue;
    const doc = docText(member);
    const description = doc.description || SHARED_DESCRIPTIONS[key.text] || '';
    const { defaultTag } = doc;
    let type: string;
    if (ts.isMethodSignature(member)) {
      const params = member.parameters.map((p) => p.getText(file)).join(', ');
      type = oneLine(`(${params}) => ${member.type?.getText(file) ?? 'void'}`);
    } else {
      type = member.type ? oneLine(member.type.getText(file)) : 'any';
    }
    const refs = [...new Set(type.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])]
      .filter((n) => declared.has(n))
      .map((n) => ({ name: n, line: declared.get(n) as number }));
    props.push({
      name: key.text,
      optional: Boolean(member.questionToken),
      type,
      refs,
      default: defaults.get(key.text) ?? defaultTag ?? defaultInText(description),
      description,
    });
  }
  return { component: name, typeName, line, props };
}
