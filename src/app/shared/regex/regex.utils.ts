export const TIKZ_NUMBER_PATTERN_SOURCE = String.raw`-?\d+(?:\.\d+)?`;
export const INLINE_MATH_COMMAND_PATTERN_SOURCE = String.raw`\\(?:alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|leftarrow|rightarrow|uparrow|downarrow|leftrightarrow|Rightarrow|Leftarrow|Leftrightarrow|times|div|pm|infty|sum|prod|int|partial|forall|exists|in|notin|cup|cap|e)`;

export const REGEX = {
  ai: {
    diacritic: /\p{Diacritic}/gu,
    questionMark: /\?/,
    trailingPunctuation: /[!¡?¿.]+$/g,
    sceneCount: /\b([2-8])\b/,
    layoutIntent: /\b(ordena|ordenar|millora|mejora|mejorar|improve|arrange|layout)\b/,
    labelIntent: /\b(etiqueta|etiquetes|etiquetas|label|labels)\b/,
    simplifyIntent: /\b(simplifica|simplificar|simplify|reduceix|reduce|reduir)\b/,
    explainIntent: /\b(explica|explicar|explain|describe|descriu|describeix)\b/,
    localExplainIntent: /\b(explica|explicar|explain|describe|descriu|descriure|que es|que representa|what is|what does)\b/,
    whitespaceGlobal: /\s+/g,
    lineItemIdBeforeKind: /^\s*-\s*id[:=][^;\n]+(?:;|\s)+.*\bkind[:=]/im,
    lineItemKindBeforeId: /^\s*-\s*kind[:=][^;\n]+(?:;|\s)+.*\bid[:=]/im,
    fencedJsonObject: /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i,
    trailingJsonCommas: /,\s*([}\]])/g,
    longDecimal: /-?\d+\.\d{6,}/g,
    ellipsisOnly: /^\.{2,}$/,
    openingFence: /^```(?:json|text)?/i,
    closingFence: /```$/i,
    lineStartsId: /^- id[:=]/m,
    lineStartsKind: /^- kind[:=]/m,
    lineStartsFecto: /^FECTO:/m,
    geometryStyleToken: /\b(?:geometry|style|strokeWidth|stroke|fill)[:=]/i,
    pasoCaption: /"?caption"?\s*:\s*"?paso\s+\d+/i,
    uuidReference: /\b(?:id|seleccione)[:= ]+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    geometryAssignment: /\bgeometry\s*[:=]/i,
    styleAssignment: /\bstyle\s*[:=]/i
  },
  color: {
    hex3: /^#[0-9a-f]{3}$/i,
    hex3Capture: /^#([a-f\d])([a-f\d])([a-f\d])$/i,
    hex6: /^#[a-f\d]{6}$/i,
    hex6Strict: /^#[a-f\d]{6}$/,
    optionalHashHex6: /^#?([0-9a-fA-F]{6})$/
  },
  shared: {
    escapeRegExpChars: /[.*+?^${}()|[\]\\]/g,
    lineBreak: /\r?\n/,
    lineBreakGlobal: /\r?\n/g
  },
  copyButton: {
    bindingReference: /^(?<id>[^.[\]]+)(?:\[(?<attribute>[^\]]+)\]|\.(?<property>[\w$]+))?$/
  },
  editor: {
    wordTitleCase: /\w\S*/g,
    slugInvalidChars: /[^a-z0-9]+/g,
    slugTrimDashes: /^-+|-+$/g,
    extensionSuffix: /\.[^/.]+$/g,
    filenameInvalidChars: /[\\/:*?"<>|]+/g,
    macPlatform: /Mac|iPhone|iPad|iPod/,
    toolButtonClass: /class="tool-button/g,
    importFooterActions: /<div class="import-code-modal__footer-actions">([\s\S]*?)<\/div>/,
    importInputPanel: /<section class="import-input-panel"[\s\S]*?<section class="import-workspace">/
  },
  imagePath: {
    unixPrefix: /^(?:\/(?!\/)|\.\.?\/)/,
    windowsPrefix: /^[a-zA-Z]:[\\/]/,
    relative: /^[^/\\]+(?:[/\\][^/\\]+)*$/,
    trailingSeparators: /[\\/]+$/,
    leadingSeparators: /^[/\\]+/,
    separator: /[\\/]/
  },
  importModal: {
    drawLikeCommand: /\\(?:draw|node|path|fill|filldraw|clip)\b/,
    diagramRawTikzWarning: /^(.*?): Unsupported line preserved as raw TikZ: (.*)$/,
    rawTikzWarning: /^Unsupported line preserved as raw TikZ: (.*)$/,
    csvInvalidCoordinatesWarning: /^Skipped CSV row with invalid coordinates: (.*)$/,
    svgPathWarning: /^Unsupported SVG path preserved as warning: (.*)$/
  },
  importSources: {
    tikzPictureEnvironment: /\\begin\{tikzpicture\}(?:\[[^\]]*\])?[\s\S]*?\\end\{tikzpicture\}/g,
    mermaidEdge: /(.+?)\s*(-->|---)\s*(.+)/,
    dotEdge: /"?([^";{}]+?)"?\s*(->|--)\s*"?([^";{}]+?)"?/,
    fileExtension: /\.([a-z0-9]+)$/,
    svgDocument: /<svg[\s>]/i,
    drawioDocument: /<mxfile[\s>]|<mxGraphModel[\s>]/i,
    latexDocumentClass: /^\\documentclass\b/m,
    latexDocumentBegin: /\\begin\{document\}/,
    mermaidDirective:
      /^(?:---[\s\S]*?---\s*)?(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|zenuml|sankey-beta|xychart-beta|block-beta|packet-beta|architecture-beta)\b/im,
    mermaidEdgeLike: /^[A-Za-z0-9_"()[\] .:-]+\s*(?:-->|---|-\.-|==>|~~~)\s*[A-Za-z0-9_"()[\] .:-]+/,
    mermaidFrontMatter: /^---\s*[\s\S]*?---\s*/,
    mermaidFlowchartHeader: /^\s*(?:flowchart|graph)\s+(?<direction>TB|TD|BT|RL|LR)\b/i,
    mermaidMindmapHeader: /^\s*mindmap\b/i,
    mermaidComment: /^\s*%%/,
    mermaidEdgeOperator: /\s*(-->|---|-\.-|==>|~~~)\s*/,
    mermaidFanoutSeparator: /\s*&\s*/,
    mermaidNodeStatement: /^\s*(?<id>[A-Za-z0-9_-]+)\s*(?<shape>\(\(|\{\{|\[|\(|>)\s*(?<label>.*?)\s*(?<close>\)\)|\}\}|\]|\))\s*$/,
    mermaidNodeReference: /^\s*(?<id>[A-Za-z0-9_-]+)\s*(?:(?<shape>\(\(|\{\{|\[|\(|>)\s*(?<label>.*?)\s*(?<close>\)\)|\}\}|\]|\)))?\s*$/,
    mermaidMindmapLine: /^(?<indent>\s*)(?<node>.+?)\s*$/,
    mermaidInvalidIdChars: /[^\w-]/g,
    mermaidLabelQuoteBoundary: /^["']|["']$/g,
    mermaidRootPrefix: /^root\s*/i,
    mermaidDoubleRoundBoundary: /^\(\(|\)\)$/g,
    mermaidDoubleBraceBoundary: /^\{\{|\}\}$/g,
    mermaidSingleRoundBoundary: /^\(|\)$/g,
    htmlBreak: /<br\s*\/?>/gi,
    dotGraphDocument: /^\s*(?:strict\s+)?(?:di)?graph\b[\s\S]*\{[\s\S]*\}/i,
    dotStatementTerminator: /;\s*$/,
    svgPathNumber: /-?\d+(?:\.\d+)?/g,
    svgPathMoveOrLine: /[ML]/i,
    drawioArrowShape: /(?:^|;)shape=(?:singleArrow|doubleArrow|flexArrow|filledEdge)(?:;|$)/,
    drawioArrowWidth: /(?:^|;)arrowWidth=/,
    htmlTag: /<[^>]+>/g,
    graphLinePunctuation: /[;{}]/g,
    csvCellSeparator: /[,;\t]/
  },
  keyboard: {
    command: /⌘|command|cmd/gi,
    control: /control|ctrl/gi,
    option: /option/gi,
    shortcutSeparator: /\s*\+\s*/g,
    letter: /[a-z]/i
  },
  text: {
    whitespace: /\s+/
  },
  tikzCodegen: {
    inlineMathCommand: new RegExp(INLINE_MATH_COMMAND_PATTERN_SOURCE, 'g'),
    triangleOpacityExport: /Triangle\[[^\]]*\bopacity=/,
    latexOpenExport: /-\{Latex\[[^\]]*\bopen\b/,
    latexFillExport: /Latex\[[^\]]*\bfill=/,
    flexOrBendExport: /\bflex'?|\bbend\b/,
    defineColor112233: /\\definecolor\{tikzdrawercolor1\}\{HTML\}\{112233\}/g
  },
  tikzHighlight: {
    command: /(\\[a-zA-Z@]+)/g,
    options: /(\[[^\]]*\])/g,
    brackets: /([()[\]{}])/g,
    color: /(#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}))/g,
    number: /(-?\d+(?:\.\d+)?)/g,
    base64Padding: /=+$/g
  },
  tikzParser: {
    point: new RegExp(String.raw`\(\s*(${TIKZ_NUMBER_PATTERN_SOURCE})\s*,\s*(${TIKZ_NUMBER_PATTERN_SOURCE})\s*\)`),
    arrowDraw: /draw=({[^}]+}|[^,\]]+)/i,
    arrowOpacity: /opacity=([^,\]]+)/i,
    arrowScale: /scale=([^,\]}]+)/i,
    triangle: /^\\draw(?:\[(?<styles>.+)\])?\s*(?<apex>\([^)]*\))\s*--\s*(?<left>\([^)]*\))\s*--\s*(?<right>\([^)]*\))\s*--\s*cycle\s*;?$/,
    smoothLine: /^\\draw(?:\[(?<styles>.+)\])?\s*plot\s*\[\s*smooth\s*\]\s*coordinates\s*\{\s*(?<points>.+?)\s*\}\s*;?$/,
    rectangle: /^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*rectangle\s*(?<to>\([^)]*\))\s*;?$/,
    ellipse: new RegExp(
      String.raw`^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*ellipse\s*\(\s*(?<rx>${TIKZ_NUMBER_PATTERN_SOURCE})\s*and\s*(?<ry>${TIKZ_NUMBER_PATTERN_SOURCE})\s*\)\s*;?$`
    ),
    imageNode: /^\\node(?:\[(?<styles>.+)\])?\s*at\s*(?<point>\([^)]*\))\s*\{\\includegraphics\[(?<imageOptions>[^\]]*)\]\{(?<source>[^}]+)\}\}\s*;?$/,
    imageWidth: /(?:^|,)\s*width\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i,
    imageHeight: /(?:^|,)\s*height\s*=\s*(-?\d+(?:\.\d+)?)\s*cm/i,
    points: new RegExp(String.raw`\(\s*(${TIKZ_NUMBER_PATTERN_SOURCE})\s*,\s*(${TIKZ_NUMBER_PATTERN_SOURCE})\s*\)`, 'g'),
    arrowBend: new RegExp(String.raw`[[,]\s*bend(?:\s*[,}\]])`, 'i'),
    arrowFlexPrime: new RegExp(String.raw`flex'\s*(?:=|[,}\]])`, 'i'),
    arrowFlex: new RegExp(String.raw`flex\s*(?:=|[,}\]])`, 'i'),
    dimension: /^\s*(-?\d+(?:\.\d+)?)\s*(cm|mm|pt|in)?\s*$/i,
    numericExpressionToken: /\d+(?:\.\d+)?|[()+\-*/]/g,
    whitespaceGlobal: /\s+/g,
    wrappedParens: /^\((.*)\)$/,
    polarCoordinate: new RegExp(String.raw`^\s*(${TIKZ_NUMBER_PATTERN_SOURCE})\s*:\s*(.+?)\s*$`),
    commaListSeparator: /\s*,\s*/,
    rgbChannelSeparator: /\s*[:;]\s*/,
    rgbModel: /^rgb\s*,/i,
    colorChannelSeparator: /\s*,\s*/,
    colorMix: /^([a-z]+)!(\d+(?:\.\d+)?)$/i,
    tikzBeginCommand: /\\begin\{tikzpicture\}/,
    nonWhitespace: /\S/,
    foreachRange: /^\s*(-?\d+)\s*,\s*\.\.\.\s*,\s*(-?\d+)\s*$/,
    foreachIn: /\s+in\s+/,
    defVariable: /\\def\\(?<name>[A-Za-z]+)\{(?<value>[^}]*)\}/g,
    pgfMod: /^mod\((.+),\s*(-?\d+(?:\.\d+)?)\)$/,
    pgfMathTruncateMacro: /^\\pgfmathtruncatemacro\{(?<name>\\[A-Za-z]+)\}\{(?<expression>.+)\};?$/,
    nodeDistanceSeparator: /\s+and\s+/i,
    rotateAround: /[{]?\s*(-?\d+(?:\.\d+)?)/,
    arrowOpen: /[[,]\s*open(?:\s*[,}\]])/i,
    arrowRound: /[[,]\s*round(?:\s*[,}\]])/i,
    arrowDimensionUnit: /(?:pt|cm|mm|ex|em)/g,
    namedAnchor: /^([A-Za-z][\w-]*)(?:\.([A-Za-z ]+))?$/,
    interpolation: /^\((?<from>[^)]+)\)\s*!\s*(?<ratio>-?\d+(?:\.\d+)?)\s*!\s*\((?<to>[^)]+)\)$/,
    projection: /^\((?<from>[^)]+)\)\s*!\s*\((?<point>[^)]+)\)\s*!\s*\((?<to>[^)]+)\)$/,
    simpleLine: /^\\draw(?:\[(?<styles>.+)\])?\s*(?<from>\([^)]*\))\s*--\s*(?<to>\([^)]*\))\s*;?$/,
    circle: /^\\draw(?:\[(?<styles>.+)\])?\s*(?<center>\([^)]*\))\s*circle\s*\(\s*(?<radius>-?\d+(?:\.\d+)?)\s*\)\s*;?$/,
    nodeName: /^\(([A-Za-z]\w*)\)/,
    nodeText: /^\{(?<text>[\s\S]*)\}\s*;?$/,
    inlineTikz: /\\tikz\{[^}]*\}/g,
    textbf: /\\textbf\{([^}]*)\}/g,
    underline: /^\\underline\{(?<text>.*)\}$/,
    mathDelimiters: /^\$(.*)\$/,
    nodePart: /\\nodepart\{[^}]+\}/g,
    fitNodeName: /\(([A-Za-z][\w-]*)\)/g,
    labelPosition: /(?:\[[^\]]*\])?(above left|above right|below left|below right|above|below|left|right)\s*:\s*(.+)$/i,
    relativeNodePosition: /^(?:(?<distance>-?\d+(?:\.\d+)?\s*(?:cm|mm|pt|in)?)\s+)?of\s+(?<node>[A-Za-z][\w-]*)$/i,
    coordinateDeclaration: /^\\coordinate\s*\((?<name>[A-Za-z][\w-]*)\)\s*at\s*(?<point>\([^;]+\))\s*;?$/,
    trailingSemicolon: /;$/,
    tikzBegin: /\\begin\{tikzpicture\}(?:\[[^\]]*\])?/,
    tikzEnd: /\\end\{tikzpicture\}/,
    multilineCommand: /^\\(?:draw|node|path|fill|filldraw|clip)\b/,
    ignorableLines: [
      /^\\begin\{tikzpicture\}(?:\[[^\]]*\])?;?$/,
      /^\\end\{tikzpicture\};?$/,
      /^\\begin\{figure\*?\}(?:\[[^\]]*\])?;?$/,
      /^\\end\{figure\*?\};?$/,
      /^\\begin\{adjustbox\}(?:\[[^\]]*\])?\{.*\};?$/,
      /^\\end\{adjustbox\};?$/,
      /^\\begin\{scope\}(?:\[[^\]]*\])?;?$/,
      /^\\end\{scope\};?$/,
      /^\\begin\{center\};?$/,
      /^\\end\{center\};?$/,
      /^\\centering;?$/,
      /^\\raggedright;?$/,
      /^\\raggedleft;?$/,
      /^\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge);?$/,
      /^\\caption(?:\[[^\]]*\])?\{.*\};?$/,
      /^\\label\{.*\};?$/,
      /^\\def\\[A-Za-z]+\{.*\};?$/
    ]
  }
} as const;

export const escapeRegExp = (value: string): string => value.replace(REGEX.shared.escapeRegExpChars, String.raw`\$&`);

export const variableReferenceRegex = (name: string): RegExp => new RegExp(`${escapeRegExp(name)}(?![A-Za-z])`, 'g');

export const literalGlobalRegex = (value: string): RegExp => new RegExp(escapeRegExp(value), 'g');

export const arrowDimensionRegex = (key: 'length' | 'width'): RegExp => new RegExp(`${key}=([^,\\]}]+)`, 'i');

export const keyValueRegex = (key: string): RegExp => new RegExp(`${escapeRegExp(key)}=([^;]+)`);

export const latexEnvironmentBeginRegex = (environment: string): RegExp => new RegExp(String.raw`\\begin\{${escapeRegExp(environment)}\}`, 'g');

export const latexEnvironmentEndRegex = (environment: string): RegExp => new RegExp(String.raw`\\end\{${escapeRegExp(environment)}\}`, 'g');

export const aiWholeTermRegex = (term: string): RegExp => new RegExp(String.raw`(^|[^\p{L}\p{N}_])${escapeRegExp(term)}(?=$|[^\p{L}\p{N}_])`, 'u');

export const aiSectionHeadingRegex = (term: string): RegExp => new RegExp(String.raw`^\s*${escapeRegExp(term)}\s*:`, 'im');
