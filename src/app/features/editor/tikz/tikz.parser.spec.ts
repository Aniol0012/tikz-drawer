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

  it('imports state machines with transition labels and relative note nodes', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
font=\small,
state/.style={circle, draw, thick, minimum size=1.8cm, align=center, blur shadow, fill=white},
finalstate/.style={circle, draw, double, double distance=1.2pt, thick, minimum size=1.8cm, align=center, blur shadow, fill=white},
transition/.style={-{Latex[length=2.5mm]}, thick},
condition/.style={midway, fill=white, inner sep=1.5pt, font=\scriptsize}
]
\node[state] (created) at (0,0) {Created};
\node[state] (validated) at (3.2,1.6) {Validated};
\node[state] (pending) at (6.4,0) {Pending\\Execution};
\node[state] (executed) at (9.6,1.6) {Executed};
\node[finalstate] (closed) at (12.8,0) {Closed};
\node[state] (rejected) at (3.2,-2.4) {Rejected};
\node[state] (cancelled) at (8.0,-2.4) {Cancelled};
\draw[transition] (created) -- (validated) node[condition, above left] {valid data};
\draw[transition] (validated) -- (pending) node[condition, above right] {confirmed};
\draw[transition] (pending) -- (executed) node[condition, above left] {processed};
\draw[transition] (executed) -- (closed) node[condition, above right] {balanced};
\draw[transition] (created) -- (rejected) node[condition, left] {invalid};
\draw[transition] (validated) -- (rejected) node[condition, right] {rule error};
\draw[transition] (pending) -- (cancelled) node[condition, right] {manual stop};
\draw[transition] (cancelled) -- (closed) node[condition, below right] {resolved};
\draw[transition] (rejected) to[out=160,in=220,looseness=1.3] (created) node[condition, left] {fix};
\draw[transition] (pending) to[out=130,in=50,looseness=1.1] (validated) node[condition, above] {reopen};
\draw[transition, dashed] (executed) to[out=-120,in=-40] (pending) node[condition, below] {rollback};
\node[draw, rounded corners=2pt, thick, align=left, fill=gray!8, below=1.0cm of cancelled, text width=8.5cm] {
  \textbf{Rule:} only validated entities can be executed. Rollback is available only before final closure.
};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'circle')).toHaveLength(7);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(11);
    expect(result.scene.shapes.some((shape) => shape.kind === 'line' && shape.strokeStyle === 'dashed')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Pending\nExecution')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'valid data')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text.includes('only validated entities'))).toBe(true);
  });

  it('imports isometric cuboid diagrams with projected 3D coordinates and cuboid helpers', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
font=\small,
x={(1cm,0cm)},
y={(0.45cm,0.28cm)},
z={(0cm,1cm)},
block/.style={draw, thick, fill=gray!12},
edge/.style={thick, draw},
arrow/.style={-{Latex[length=2.4mm]}, thick}
]
\newcommand{\cuboid}[5]{
  \coordinate (#1-A) at #2;
  \coordinate (#1-B) at ($(#1-A)+(#3,0,0)$);
  \coordinate (#1-C) at ($(#1-A)+(#3,#4,0)$);
  \coordinate (#1-D) at ($(#1-A)+(0,#4,0)$);
  \coordinate (#1-E) at ($(#1-A)+(0,0,#5)$);
  \coordinate (#1-F) at ($(#1-A)+(#3,0,#5)$);
  \coordinate (#1-G) at ($(#1-A)+(#3,#4,#5)$);
  \coordinate (#1-H) at ($(#1-A)+(0,#4,#5)$);
  \filldraw[block, fill=gray!10] (#1-A) -- (#1-B) -- (#1-C) -- (#1-D) -- cycle;
  \filldraw[block, fill=gray!18] (#1-D) -- (#1-C) -- (#1-G) -- (#1-H) -- cycle;
  \filldraw[block, fill=gray!25] (#1-A) -- (#1-D) -- (#1-H) -- (#1-E) -- cycle;
  \filldraw[block, fill=gray!32] (#1-E) -- (#1-F) -- (#1-G) -- (#1-H) -- cycle;
  \draw[edge] (#1-A) -- (#1-B) -- (#1-C) -- (#1-G) -- (#1-F) -- (#1-B);
  \draw[edge] (#1-A) -- (#1-D) -- (#1-H) -- (#1-G);
  \draw[edge] (#1-A) -- (#1-E) -- (#1-F);
}
\cuboid{core}{(0,0,0)}{3.2}{2.2}{1.0}
\cuboid{api}{(4.4,0.2,0)}{2.8}{2.0}{1.4}
\cuboid{db}{(8.4,0.0,0)}{2.6}{2.3}{1.8}
\cuboid{cache}{(4.8,3.2,0)}{2.4}{1.6}{1.1}
\cuboid{queue}{(8.5,3.0,0)}{2.4}{1.7}{1.2}
\node at ($(core-E)!0.5!(core-G)+(0,0,0.15)$) {Domain Core};
\node at ($(api-E)!0.5!(api-G)+(0,0,0.15)$) {API Layer};
\node at ($(db-E)!0.5!(db-G)+(0,0,0.15)$) {Database};
\node at ($(cache-E)!0.5!(cache-G)+(0,0,0.15)$) {Cache};
\node at ($(queue-E)!0.5!(queue-G)+(0,0,0.15)$) {Queue};
\draw[arrow] ($(core-B)!0.5!(core-C)+(0,0,0.7)$) -- ($(api-A)!0.5!(api-D)+(0,0,0.8)$);
\draw[arrow] ($(api-B)!0.5!(api-C)+(0,0,0.9)$) -- ($(db-A)!0.5!(db-D)+(0,0,1.0)$);
\draw[arrow] ($(api-D)!0.5!(api-C)+(0,0,1.0)$) -- ($(cache-A)!0.5!(cache-B)+(0,0,0.7)$);
\draw[arrow] ($(cache-B)!0.5!(cache-C)+(0,0,0.7)$) -- ($(queue-A)!0.5!(queue-D)+(0,0,0.8)$);
\draw[arrow, dashed] ($(queue-B)!0.5!(queue-C)+(0,0,0.8)$) -- ($(db-D)!0.5!(db-C)+(0,0,1.1)$);
\draw[decorate, decoration={brace, amplitude=5pt}, thick]
  (-0.2,-0.4,0) -- (11.4,-0.4,0)
  node[midway, below=0.35cm] {Execution pipeline};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line').length).toBeGreaterThanOrEqual(66);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Domain Core')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Database')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Execution pipeline')).toBe(true);
  });

  it('imports service architecture diagrams with implicit and relative nodes', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
font=\sffamily\small,
node distance=8mm and 12mm,
box/.style={draw, rounded corners=2pt, thick, fill=white, minimum width=31mm, minimum height=9mm, align=center},
store/.style={draw, cylinder, shape border rotate=90, aspect=0.25, thick, fill=gray!10, minimum height=12mm, minimum width=16mm, align=center},
bus/.style={draw, rounded corners=2pt, thick, fill=gray!12, minimum width=105mm, minimum height=10mm, align=center},
arr/.style={-{Latex[length=2.4mm]}, thick},
darr/.style={-{Latex[length=2.4mm]}, thick, dashed}
]
\node[box] (ui) {Web UI};
\node[box, right=of ui] (api) {REST API};
\node[box, right=of api] (svc) {Application\\Service};
\node[box, right=of svc] (domain) {Domain\\Model};
\node[bus, below=14mm of api, xshift=26mm] (bus) {Event bus / command dispatcher};
\node[store, below=16mm of ui] (cache) {Cache};
\node[store, below=16mm of svc] (db) {SQL\\DB};
\node[box, below=16mm of domain] (worker) {Async\\Worker};
\draw[arr] (ui) -- (api);
\draw[arr] (api) -- (svc);
\draw[arr] (svc) -- (domain);
\draw[arr] (svc) -- (db);
\draw[darr] (api) -- (cache);
\draw[arr] (domain) |- (bus);
\draw[arr] (bus) -| (worker);
\draw[arr] (worker) -- (db);
\draw[darr] (worker.east) to[out=15,in=-35] (domain.east);
\begin{scope}[on background layer]
\node[draw, rounded corners=5pt, thick, fill=gray!5, fit=(ui)(api)(svc)(domain), inner sep=6mm, label={[font=\bfseries]above:Synchronous path}] {};
\node[draw, rounded corners=5pt, thick, fill=gray!3, fit=(cache)(db)(worker)(bus), inner sep=6mm, label={[font=\bfseries]below:Persistence and asynchronous side effects}] {};
\end{scope}
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'rectangle').length).toBeGreaterThanOrEqual(10);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(9);
    expect(result.scene.shapes.some((shape) => shape.kind === 'line' && shape.anchors.length === 1)).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Application\nService')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Synchronous path')).toBe(true);
  });

  it('imports circular process diagrams with foreach loops and polar coordinates', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
font=\sffamily\small,
phase/.style={draw, circle, thick, minimum size=17mm, align=center, fill=white, blur shadow},
arr/.style={-{Latex[length=2.2mm]}, thick},
note/.style={draw, rounded corners=2pt, fill=gray!8, align=center, font=\scriptsize, inner sep=3pt}
]
\def\r{3.0}
\foreach \name/\angle/\text in {
    n1/90/Plan,
    n2/30/Build,
    n3/-30/Test,
    n4/-90/Deploy,
    n5/-150/Monitor,
    n6/150/Improve
}{
    \node[phase] (\name) at (\angle:\r) {\text};
}
\foreach \a/\b in {
    n1/n2,
    n2/n3,
    n3/n4,
    n4/n5,
    n5/n6,
    n6/n1
}{
    \draw[arr] (\a) to[bend left=13] (\b);
}
\node[note] (center) at (0,0) {Iterative\\release cycle};
\draw[arr, dashed] (center) -- (n1);
\draw[arr, dashed] (center) -- (n3);
\draw[arr, dashed] (center) -- (n5);
\draw[decorate, decoration={brace, amplitude=5pt}, thick]
    ($(n2.north east)+(0.15,0.15)$) --
    ($(n3.south east)+(0.15,-0.15)$)
    node[midway, right=7pt, font=\scriptsize, align=left] {Delivery\\risk};
\draw[decorate, decoration={brace, mirror, amplitude=5pt}, thick]
    ($(n5.south west)+(-0.15,-0.15)$) --
    ($(n6.north west)+(-0.15,0.15)$)
    node[midway, left=7pt, font=\scriptsize, align=right] {Feedback\\loop};
\end{tikzpicture}`);

    expect(result.warnings).toHaveLength(0);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'circle')).toHaveLength(6);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(11);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Plan')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Delivery\nrisk')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Feedback\nloop')).toBe(true);
  });

  it('imports relative draw path targets used by timeline tick marks', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
    milestone/.style={
        circle,
        draw,
        thick,
        minimum size=0.75cm
    },
    labelbox/.style={
        rectangle,
        draw,
        rounded corners,
        align=center,
        minimum width=2.3cm,
        minimum height=0.75cm
    },
    line/.style={
        thick,
        -{Latex[length=3mm]}
    }
]
\draw[line] (0, 0) -- (10.5, 0);
\node[milestone] (m1) at (1, 0) {1};
\node[milestone] (m2) at (3.5, 0) {2};
\node[milestone] (m3) at (6, 0) {3};
\node[milestone] (m4) at (8.5, 0) {4};
\node[labelbox, above=0.7cm of m1] {Planning};
\node[labelbox, below=0.7cm of m2] {Prototype};
\node[labelbox, above=0.7cm of m3] {Testing};
\node[labelbox, below=0.7cm of m4] {Release};
\draw[thick] (m1) -- ++(0, 0.35);
\draw[thick] (m2) -- ++(0, -0.35);
\draw[thick] (m3) -- ++(0, 0.35);
\draw[thick] (m4) -- ++(0, -0.35);
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(5);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'Release')).toBe(true);
  });

  it('imports rectangle split entity nodes as separated rows without visible nodepart commands', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
    entity/.style={
        rectangle split,
        rectangle split parts=4,
        draw,
        thick,
        rounded corners,
        text width=3.2cm,
        align=left
    },
    relation/.style={
        -{Latex[length=2.6mm]},
        thick
    },
    node distance=2.2cm and 2.5cm
]
\node[entity] (customer) {
    \textbf{Customer}
    \nodepart{second} id
    \nodepart{third} name
    \nodepart{fourth} fiscalNumber
};
\node[entity, right=of customer] (invoice) {
    \textbf{Invoice}
    \nodepart{second} id
    \nodepart{third} customerId
    \nodepart{fourth} totalAmount
};
\node[entity, below=of invoice] (line) {
    \textbf{InvoiceLine}
    \nodepart{second} id
    \nodepart{third} invoiceId
    \nodepart{fourth} netAmount
};
\node[entity, below=of customer] (payment) {
    \textbf{Payment}
    \nodepart{second} id
    \nodepart{third} invoiceId
    \nodepart{fourth} paidAmount
};
\draw[relation] (customer) -- node[above] {1:N} (invoice);
\draw[relation] (invoice) -- node[right] {1:N} (line);
\draw[relation] (invoice) -- node[below right] {1:N} (payment);
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'rectangle')).toHaveLength(4);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(15);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'InvoiceLine')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'fiscalNumber')).toBe(true);
    expect(result.scene.shapes.every((shape) => shape.kind !== 'text' || !shape.text.includes(String.raw`\nodepart`))).toBe(true);
  });

  it('imports coordinate based triangle diagrams with projections and arcs', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
    point/.style={
        circle,
        fill,
        inner sep=1.5pt
    },
    label/.style={
        font=\small
    },
    edge/.style={
        thick
    }
]
\coordinate (a) at (0, 0);
\coordinate (b) at (5, 0);
\coordinate (c) at (1.4, 3.2);
\draw[edge] (a) -- (b) -- (c) -- cycle;
\node[point, label=below left:$A$] at (a) {};
\node[point, label=below right:$B$] at (b) {};
\node[point, label=above:$C$] at (c) {};
\draw[thick, dashed] (c) -- ($(a)!(c)!(b)$);
\node[label, below] at ($(a)!0.5!(b)$) {$c$};
\node[label, left] at ($(a)!0.5!(c)$) {$b$};
\node[label, right] at ($(b)!0.5!(c)$) {$a$};
\draw (0.7, 0) arc[start angle=0, end angle=66, radius=0.7];
\node[label] at (0.9, 0.35) {$\alpha$};
\draw ($(b)+(-0.7,0)$) arc[start angle=180, end angle=138, radius=0.7];
\node[label] at (4.25, 0.35) {$\beta$};
\draw ($(c)+(-104:0.65)$) arc[start angle=-104, end angle=-42, radius=0.65];
\node[label] at ($(c)+(0,-0.75)$) {$\gamma$};
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'circle')).toHaveLength(3);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(7);
    expect(result.scene.shapes.some((shape) => shape.kind === 'line' && shape.strokeStyle === 'dashed')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === String.raw`\alpha`)).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'A')).toBe(true);
  });

  it('imports 3D projected coordinate diagrams with chained paths', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
    x={(1cm,0cm)},
    y={(0.45cm,0.35cm)},
    z={(0cm,1cm)},
    edge/.style={
        thick
    },
    hidden/.style={
        thick,
        dashed
    }
]
\coordinate (a) at (0, 0, 0);
\coordinate (b) at (3, 0, 0);
\coordinate (c) at (3, 3, 0);
\coordinate (d) at (0, 3, 0);
\coordinate (e) at (0, 0, 3);
\coordinate (f) at (3, 0, 3);
\coordinate (g) at (3, 3, 3);
\coordinate (h) at (0, 3, 3);
\draw[edge] (a) -- (b) -- (c) -- (g) -- (f) -- (b);
\draw[edge] (f) -- (e) -- (h) -- (g);
\draw[edge] (e) -- (a);
\draw[hidden] (a) -- (d) -- (c);
\draw[hidden] (d) -- (h);
\node[below left] at (a) {$A$};
\node[below right] at (b) {$B$};
\node[right] at (c) {$C$};
\node[above] at (g) {$G$};
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line')).toHaveLength(12);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'line' && shape.strokeStyle === 'dashed')).toHaveLength(3);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'G')).toBe(true);
  });

  it('imports nested foreach grids with arithmetic coordinates and pgf math macros', () => {
    const result = parseTikz(String.raw`\begin{tikzpicture}[
    cell/.style={
        rectangle,
        draw,
        minimum width=0.8cm,
        minimum height=0.8cm
    },
    label/.style={
        font=\small
    }
]
\foreach \x in {0,...,5} {
    \foreach \y in {0,...,4} {
        \pgfmathtruncatemacro{\value}{mod(\x*\y+\x+\y, 5)}
        \node[cell] at (\x*0.8, -\y*0.8) {\value};
    }
}
\foreach \x/\name in {0/A,1/B,2/C,3/D,4/E,5/F} {
    \node[label] at (\x*0.8, 0.65) {\name};
}
\foreach \y/\name in {0/R1,1/R2,2/R3,3/R4,4/R5} {
    \node[label, left] at (-0.55, -\y*0.8) {\name};
}
\end{tikzpicture}`);

    expect(result.warnings).toEqual([]);
    expect(result.scene.shapes.filter((shape) => shape.kind === 'rectangle')).toHaveLength(30);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === '4')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'F')).toBe(true);
    expect(result.scene.shapes.some((shape) => shape.kind === 'text' && shape.text === 'R5')).toBe(true);
  });
});
