import { parseTikz } from './tikz.parser';

describe('parseTikz', () => {
  it('parses arrow metadata including length and width scales', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\draw[-{Triangle[draw=#334455, fill=#334455, scale=1.5, length=12pt, width=4.5pt, bend]}] (0, 0) -- (2, 1);
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes).toHaveLength(1);

    const shape = result.scene.shapes[0];
    expect(shape.kind).toBe('line');

    if (shape.kind !== 'line') {
      throw new Error('Expected a line shape');
    }

    expect(shape.arrowEnd).toBe(true);
    expect(shape.arrowStart).toBe(false);
    expect(shape.arrowType).toBe('triangle');
    expect(shape.arrowColor).toBe('#334455');
    expect(shape.arrowScale).toBe(1.5);
    expect(shape.arrowLengthScale).toBe(1.5);
    expect(shape.arrowWidthScale).toBe(0.75);
    expect(shape.arrowBendMode).toBe('bend');
  });

  it('parses additional arrows.meta tip kinds', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\draw[-{Straight Barb[color=#334455]}] (0, 0) -- (2, 1);
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    const shape = result.scene.shapes[0];
    expect(shape.kind).toBe('line');

    if (shape.kind !== 'line') {
      throw new Error('Expected a line shape');
    }

    expect(shape.arrowType).toBe('straight-barb');
  });

  it('preserves unsupported lines as raw TikZ warnings', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\foo{bar}
\end{tikzpicture}`);

    expect(result.scene.shapes).toHaveLength(0);
    expect(result.scene.rawTikzLines).toEqual([String.raw`\foo{bar}`]);
    expect(result.warnings).toEqual([String.raw`Unsupported line preserved as raw TikZ: \foo{bar}`]);
  });

  it('stores rectangle y as the lower edge when importing TikZ rectangles', () => {
    const result = parseTikz(
      String.raw`\begin{tikzpicture}
\draw[fill=#f1f1f1] (-14.857, 9.101) rectangle (4.841, 4.007);
\node[anchor=center] at (-4.536, 7.404) {Text};
\end{tikzpicture}`
    );

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(2);

    const rectangle = result.scene.shapes[0];
    expect(rectangle.kind).toBe('rectangle');

    if (rectangle.kind !== 'rectangle') {
      throw new Error('Expected a rectangle shape');
    }

    expect(rectangle.x).toBeCloseTo(-14.857);
    expect(rectangle.y).toBeCloseTo(4.007);
    expect(rectangle.width).toBeCloseTo(19.698);
    expect(rectangle.height).toBeCloseTo(5.094);
  });

  it('imports TikZ text style commands as editor styles instead of visible text', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\node[text=#161616, text opacity=1, scale=1.714, anchor=center] at (-0.25, 11.25) {\bfseries Tiras de tela};
\node[anchor=center] at (0, 0) {\itshape \underline{Cierre del arnés}};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(2);

    const boldText = result.scene.shapes[0];
    expect(boldText.kind).toBe('text');
    if (boldText.kind !== 'text') {
      throw new Error('Expected text shape');
    }
    expect(boldText.text).toBe('Tiras de tela');
    expect(boldText.fontWeight).toBe('bold');

    const styledText = result.scene.shapes[1];
    expect(styledText.kind).toBe('text');
    if (styledText.kind !== 'text') {
      throw new Error('Expected text shape');
    }
    expect(styledText.text).toBe('Cierre del arnés');
    expect(styledText.fontStyle).toBe('italic');
    expect(styledText.textDecoration).toBe('underline');
  });

  it('ignores figure and adjustbox wrappers around a tikzpicture', () => {
    const result = parseTikz(String.raw`\begin{figure}[H]
\centering
\footnotesize
\begin{adjustbox}{max width=0.9\textwidth,center}
\begin{tikzpicture}
\draw (0, 0) -- (2, 1);
\end{tikzpicture}
\end{adjustbox}
\caption{Example}
\label{fig:example}
\end{figure}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(1);
    expect(result.scene.shapes[0].kind).toBe('line');
  });

  it('parses multiline draw commands split across several lines', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\draw[draw=#334455,
line width=0.4pt,
-{Triangle[scale=1.2]}] (0, 0) -- (1.5, 0.8);
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(1);
    expect(result.scene.shapes[0].kind).toBe('line');
  });

  it('converts TikZ rgb color definitions into CSS hex colors for the editor state', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\draw[draw={rgb,255:red,54;green,48;blue,48}, fill={rgb,255:red,169;green,61;blue,61}] (-1, 1) rectangle (2, -2);
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(1);

    const rectangle = result.scene.shapes[0];
    expect(rectangle.kind).toBe('rectangle');
    if (rectangle.kind !== 'rectangle') {
      throw new Error('Expected rectangle');
    }

    expect(rectangle.stroke).toBe('#363030');
    expect(rectangle.fill).toBe('#a93d3d');
  });

  it('imports includegraphics nodes as image shapes', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}
\node[inner sep=0pt] at (13.175, 67.079) {\includegraphics[width=37.65cm,height=8.359cm]{images/example.png}};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes).toHaveLength(1);
    expect(result.scene.shapes[0].kind).toBe('image');
  });

  it('imports layered architecture diagrams with named styles, relative nodes and anchored draw paths', () => {
    const result = parseTikz(String.raw`\begin{figure}[H]
\centering
\begin{tikzpicture}[
    font=\small,
    layer/.style={
        rounded corners=3pt,
        draw,
        thick,
        minimum width=11.5cm,
        minimum height=1.15cm,
        align=center,
        blur shadow
    },
    module/.style={
        rounded corners=2pt,
        draw,
        thick,
        minimum width=2.6cm,
        minimum height=0.7cm,
        align=center,
        fill=white
    },
    arrow/.style={
        -{Latex[length=2.5mm]},
        thick
    },
    dashedarrow/.style={
        -{Latex[length=2.5mm]},
        thick,
        dashed
    }
]
\node[layer, fill=gray!12] (ui) at (0,0) {Presentation Layer};
\node[layer, fill=gray!8, below=0.7cm of ui] (app) {Application Layer};
\node[layer, fill=gray!12, below=0.7cm of app] (domain) {Domain Layer};
\node[layer, fill=gray!8, below=0.7cm of domain] (infra) {Infrastructure Layer};
\node[module] (screen) at ($(ui.west)+(2.0cm,0)$) {Screens};
\node[module, right=0.45cm of screen] (dialogs) {Dialogs};
\node[module, right=0.45cm of dialogs] (forms) {Forms};
\node[module] (services) at ($(app.west)+(2.0cm,0)$) {Services};
\node[module, right=0.45cm of services] (commands) {Commands};
\node[module, right=0.45cm of commands] (validators) {Validators};
\node[module] (entities) at ($(domain.west)+(2.0cm,0)$) {Entities};
\node[module, right=0.45cm of entities] (rules) {Business Rules};
\node[module, right=0.45cm of rules] (events) {Domain Events};
\node[module] (repo) at ($(infra.west)+(2.0cm,0)$) {Repositories};
\node[module, right=0.45cm of repo] (db) {Database};
\node[module, right=0.45cm of db] (external) {External APIs};
\draw[arrow] (screen.south) -- (services.north);
\draw[arrow] (dialogs.south) -- (commands.north);
\draw[arrow] (forms.south) -- (validators.north);
\draw[arrow] (services.south) -- (entities.north);
\draw[arrow] (commands.south) -- (rules.north);
\draw[arrow] (validators.south) -- (events.north);
\draw[arrow] (services.south east) to[out=-45,in=135] (repo.north west);
\draw[arrow] (repo.north) -- (entities.south);
\draw[dashedarrow] (events.south) to[out=-70,in=110] (external.north);
\draw[decorate, decoration={brace, amplitude=5pt}, thick]
    ($(ui.north west)+(-0.35cm,0.1cm)$) --
    node[left=0.35cm, align=center] {User\\side}
    ($(app.south west)+(-0.35cm,-0.1cm)$);
\draw[decorate, decoration={brace, amplitude=5pt}, thick]
    ($(domain.north east)+(0.35cm,0.1cm)$) --
    node[right=0.35cm, align=center] {Core\\system}
    ($(infra.south east)+(0.35cm,-0.1cm)$);
\end{tikzpicture}
\caption{Layered architecture with application, domain and infrastructure responsibilities}
\end{figure}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'rectangle')).toHaveLength(16);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(11);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'User\nside')).toBe(true);

    const dashedLine = result.scene.shapes.find((shape) => shape.kind === 'line' && shape.strokeStyle === 'dashed');
    expect(dashedLine?.kind).toBe('line');
  });

  it('imports clustered networks with circular nodes, fit clusters and inline edge labels', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
nodepoint/.style={circle, draw, thick, minimum size=0.8cm, fill=white, blur shadow},
critical/.style={circle, draw, thick, minimum size=1.05cm, fill=gray!20, blur shadow},
link/.style={thick},
stronglink/.style={very thick},
weaklink/.style={thick, dashed},
cluster/.style={draw, rounded corners=8pt, thick, inner sep=0.35cm, fill=gray!8}
]
\node[nodepoint] (a1) at (0,1.2) {A1};
\node[critical] (a2) at (1.6,2.0) {A2};
\node[nodepoint] (a3) at (2.8,0.8) {A3};
\node[nodepoint] (a4) at (1.0,0.0) {A4};
\begin{scope}[on background layer]
\node[cluster, fit=(a1)(a2)(a3)(a4), label={[font=\bfseries]above:Cluster A}] {};
\end{scope}
\draw[stronglink] (a1) -- node[above left, font=\scriptsize] {0.91} (a2);
\draw[weaklink] (a3) -- node[below, font=\scriptsize] {0.31} (a4);
\draw[stronglink, -{Latex[length=2.5mm]}] (a2) to[bend left=12] node[above, font=\scriptsize] {sync} (a3);
\node[draw, rounded corners=2pt, fill=white, thick, align=left, anchor=north west] at (0,-2.0) {
  \textbf{Legend}\\
  \tikz{\draw[stronglink] (0,0) -- (0.6,0);} Strong relation
};
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'circle')).toHaveLength(4);
    expect(result.scene.shapes.some((shape) => shape.kind === 'rectangle' && shape.name === 'Imported node')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Cluster A')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'line' && shape.strokeStyle === 'dashed')).toBe(true);
  });

  it('imports isometric cuboid diagrams with projected 3D coordinates and cuboid helpers', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
font=\small,
x={(1cm,0cm)},
y={(0.45cm,0.28cm)},
z={(0cm,1cm)},
edge/.style={thick, draw},
arrow/.style={-{Latex[length=2.4mm]}, thick}
]
\newcommand{\cuboid}[5]{
  \coordinate (#1-A) at #2;
}
\cuboid{core}{(0,0,0)}{3.2}{2.2}{1.0}
\cuboid{api}{(4.4,0.2,0)}{2.8}{2.0}{1.4}
\node at ($(core-E)!0.5!(core-G)+(0,0,0.15)$) {Domain Core};
\draw[arrow] ($(core-B)!0.5!(core-C)+(0,0,0.7)$) -- ($(api-A)!0.5!(api-D)+(0,0,0.8)$);
\draw[decorate, decoration={brace, amplitude=5pt}, thick]
  (-0.2,-0.4,0) -- (11.4,-0.4,0)
  node[midway, below=0.35cm] {Execution pipeline};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(26);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Domain Core')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Execution pipeline')).toBe(true);
  });
});
