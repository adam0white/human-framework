/* No dependencies. Loaded as an ES module on static hosts, or as a local script for file://.
 * The explicit global API keeps the pure helpers testable in either loading mode. */
(() => {
  function buildTimeline(recordings) {
    const points = new Map();
    for (const recording of recordings) {
      for (const { e, s } of recording.frames) points.set(`${e}:${s}`, { e, s });
    }
    return [...points.values()].sort((a, b) => a.e - b.e || a.s - b.s);
  }

  function frameAt(recording, point) {
    return recording.frames.find((frame) => frame.e === point.e && frame.s === point.s) ?? null;
  }

  function trailAt(recording, point) {
    return recording.frames
      .filter((frame) => frame.e === point.e && frame.s <= point.s)
      .sort((a, b) => a.s - b.s)
      .slice(-20)
      .map((frame) => frame.me);
  }

  function indexPaths(value) {
    const entries = Array.isArray(value) ? value : value?.recordings;
    if (!Array.isArray(entries)) throw new Error('The index needs an array of recording filenames.');
    return entries.map((entry) => {
      const path = typeof entry === 'string' ? entry : (entry?.file ?? entry?.path ?? entry?.url);
      if (
        typeof path !== 'string' ||
        !path.endsWith('.json') ||
        path.startsWith('/') ||
        /[:\\?#%]/.test(path) ||
        path.split('/').some((part) => part === '..')
      ) {
        throw new Error('Each index entry needs a relative JSON filename inside runs/.');
      }
      return path;
    });
  }

  function sparklinePoints(values, width, height) {
    const paths = [];
    let segment = [];
    values.forEach((value, index) => {
      if (!Number.isFinite(value)) {
        if (segment.length) paths.push(segment.join(' '));
        segment = [];
        return;
      }
      const x = values.length < 2 ? 0 : (index / (values.length - 1)) * width;
      const y = (1 - Math.max(0, Math.min(1, value))) * height;
      segment.push(`${Number(x.toFixed(2))},${Number(y.toFixed(2))}`);
    });
    if (segment.length) paths.push(segment.join(' '));
    return paths;
  }

  function validateRecording(recording) {
    const finite = (value) => typeof value === 'number' && Number.isFinite(value);
    const natural = (value) => Number.isInteger(value) && value >= 0;
    const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
    const cell = (value) =>
      value &&
      natural(value.x) &&
      natural(value.y) &&
      value.x < recording.world?.size &&
      value.y < recording.world?.size;
    const numbers = (value) => value && typeof value === 'object' && Object.values(value).every(finite);
    const goals = (value) =>
      Array.isArray(value) &&
      value.every(
        (goal) =>
          goal &&
          typeof goal.id === 'string' &&
          typeof goal.label === 'string' &&
          natural(goal.minute) &&
          ['active', 'achieved', 'abandoned'].includes(goal.status) &&
          ['hf', 'task'].includes(goal.source) &&
          typeof goal.proposed === 'boolean' &&
          typeof goal.adopted === 'boolean',
      );
    const inner = (value) =>
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.entries(value).every(([key, item]) => (key === 'goals' ? goals(item) : finite(item)));
    if (
      recording?.format !== 'island-recording@1' ||
      typeof recording.mind !== 'string' ||
      !finite(recording.seed) ||
      typeof recording.hf !== 'string' ||
      !natural(recording.world?.size) ||
      recording.world.size < 2 ||
      recording.world.size > 100 ||
      !cell(recording.world.spire) ||
      !Array.isArray(recording.world.height) ||
      recording.world.height.length !== recording.world.size ||
      !recording.world.height.every(
        (row) =>
          Array.isArray(row) && row.length === recording.world.size && row.every((h) => natural(h) && h <= 4),
      ) ||
      !natural(recording.config?.freeEpisodes) ||
      !natural(recording.config.stepsPerEpisode) ||
      !natural(recording.config.taskSteps) ||
      typeof recording.config.task !== 'string' ||
      !Array.isArray(recording.frames) ||
      !recording.frames.every(
        (frame) =>
          natural(frame.e) &&
          natural(frame.s) &&
          cell(frame.me) &&
          (frame.carrying === null || typeof frame.carrying === 'string') &&
          typeof frame.action === 'string' &&
          strings(frame.events) &&
          (frame.why === undefined || typeof frame.why === 'string') &&
          (frame.inner === undefined || inner(frame.inner)) &&
          Array.isArray(frame.objects) &&
          frame.objects.every(
            (object) => typeof object.id === 'string' && cell(object) && natural(object.level),
          ),
      ) ||
      !strings(recording.notes) ||
      !Array.isArray(recording.selfReports) ||
      !recording.selfReports.every(
        (report) => natural(report.episode) && typeof report.text === 'string' && finite(report.boredom),
      ) ||
      !numbers(recording.measures) ||
      !numbers(recording.cost) ||
      !['calls', 'inputTokens', 'outputTokens', 'usd'].every((key) => finite(recording.cost[key]))
    ) {
      throw new Error('This file does not match the island-recording@1 contract.');
    }
    return recording;
  }

  // Deliberately synthetic, short recordings. These are also supplied as fixture-*.json.
  // They demonstrate the viewer; they are not observations or results from a mind.
  function fixture(mind) {
    const height = Array.from({ length: 14 }, (_, y) =>
      Array.from({ length: 14 }, (_, x) => {
        if (x === 0 || y === 0 || x === 13 || y === 13) return 0;
        return Math.max(1, 4 - Math.floor(Math.hypot(x - 8, y - 5)));
      }),
    );
    const hf = mind === 'hf';
    const frames = [];
    for (let e = 0; e < 4; e++) {
      for (let s = 0; s < 6; s++) {
        const x = s === 0 || (!hf && s === 1) ? 3 : 4;
        const y = hf ? (s < 4 ? 8 : 7) : s === 0 ? 8 : 7;
        frames.push({
          e,
          s,
          me: { x, y },
          carrying: hf && s === 2 ? 'cube-1' : null,
          objects: [
            ...Array.from({ length: 10 }, (_, i) => ({
              id: `cube-${i + 1}`,
              x: 3 + (i % 5),
              y: 8 + Math.floor(i / 5),
              level: 0,
            }))
              .filter((object) => object.id !== 'cube-1' || !hf || s !== 2)
              .map((object) =>
                object.id === 'cube-1' && hf && s >= 3 ? { ...object, x: 4, y: 8, level: 1 } : object,
              ),
            { id: 'rock', x: 6, y: 4, level: 0 },
            { id: 'ring', x: 5, y: 7, level: 0 },
          ],
          action: (hf
            ? ['look', 'move E', 'pick cube-1', 'place here', 'move N', 'rest']
            : ['look', 'move N', 'move E', 'rest', 'look', 'rest'])[s],
          events: hf && s === 3 ? ['Illustration: a cube was placed on another cube.'] : [],
          why: hf
            ? 'Illustrative scored terms: novelty, exploration.'
            : 'Illustrative reason: I wanted to inspect the nearby ring.',
          ...(hf ? { inner: { boredom: (6 - s) / 10, engagement: (s + 2) / 10 } } : {}),
        });
      }
    }
    return {
      format: 'island-recording@1',
      mind,
      seed: 1,
      hf: '2.9.0',
      world: { size: 14, height, spire: { x: 8, y: 5 } },
      config: {
        freeEpisodes: 3,
        stepsPerEpisode: 6,
        taskSteps: 6,
        task: 'Put as many cubes as you can on the Spire before the hour ends.',
      },
      frames,
      notes: Array.from(
        { length: 4 },
        (_, e) =>
          `Synthetic fixture · episode ${e + 1}.\nThese notes demonstrate the full carried text. No mind was run to produce this recording.`,
      ),
      selfReports: hf
        ? []
        : Array.from({ length: 4 }, (_, episode) => ({
            episode,
            text: 'Synthetic self-report: the ring held my attention.',
            boredom: 3,
          })),
      measures: { spireCubes: 0, uniqueCells: 3, ringGlows: 0 },
      cost: { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0 },
    };
  }

  function isFixture(recording) {
    return recording.notes[0]?.startsWith('Synthetic fixture ·') ?? false;
  }

  function element(doc, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function drawMap(canvas, recording, point, frame) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const palette = getComputedStyle(canvas);
    const color = (name) => palette.getPropertyValue(name).trim();
    const ink = color('--ink');
    const paper = color('--paper');
    const soft = color('--ink-soft');
    const sky = color('--sky');
    const moss = color('--moss');
    const rope = color('--rope');
    const size = recording.world.size;
    const unit = 560 / size;
    const center = (cell) => [(cell.x + 0.5) * unit, (cell.y + 0.5) * unit];
    ctx.clearRect(0, 0, 560, 560);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 560, 560);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const height = recording.world.height[y][x];
        ctx.globalAlpha = height ? 0.08 + height * 0.105 : 0.23;
        ctx.fillStyle = height ? moss : sky;
        ctx.fillRect(x * unit, y * unit, unit, unit);
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = soft;
        ctx.lineWidth = 0.8;
        // Fixed offsets give the contour its inked edge without unseeded randomness.
        ctx.strokeRect(x * unit + 0.5, y * unit + 0.5, unit - 0.7, unit - 1.1);
      }
    }
    ctx.globalAlpha = 1;
    const [sx, sy] = center(recording.world.spire);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - unit * 0.4);
    ctx.lineTo(sx - unit * 0.33, sy + unit * 0.33);
    ctx.lineTo(sx + unit * 0.33, sy + unit * 0.33);
    ctx.closePath();
    ctx.stroke();
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.fillText('Spire', sx, sy - unit * 0.48);
    if (!frame) return;
    const trail = trailAt(recording, point);
    for (let i = 1; i < trail.length; i++) {
      ctx.globalAlpha = 0.12 + (i / trail.length) * 0.55;
      ctx.strokeStyle = rope;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(...center(trail[i - 1]));
      ctx.lineTo(...center(trail[i]));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const stacks = new Map();
    for (const object of frame.objects) {
      const key = `${object.x}:${object.y}`;
      const stack = stacks.get(key) ?? [];
      stack.push(object);
      stacks.set(key, stack);
    }
    for (const objects of stacks.values()) {
      objects.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
      const [x, y] = center(objects[0]);
      if (objects.some((object) => object.id === 'ring')) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(x, y + unit * 0.13, unit * 0.38, unit * 0.24, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      const solids = objects.filter((object) => object.id !== 'ring');
      const object = solids.at(-1);
      if (object) {
        ctx.fillStyle = object.id === 'rock' ? soft : paper;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (object.id === 'rock') {
          ctx.moveTo(x - unit * 0.23, y + unit * 0.18);
          ctx.lineTo(x - unit * 0.3, y - unit * 0.05);
          ctx.lineTo(x - unit * 0.1, y - unit * 0.29);
          ctx.lineTo(x + unit * 0.2, y - unit * 0.2);
          ctx.lineTo(x + unit * 0.28, y + unit * 0.2);
          ctx.closePath();
        } else {
          ctx.rect(x - unit * 0.22, y - unit * 0.23, unit * 0.44, unit * 0.44);
        }
        ctx.fill();
        ctx.stroke();
        if (solids.length > 1 || object.level > 0) {
          ctx.fillStyle = ink;
          ctx.font = `bold ${Math.max(11, unit * 0.3)}px Georgia`;
          ctx.fillText(
            String(Math.max(...solids.map((item) => item.level)) + 1),
            x + unit * 0.32,
            y - unit * 0.2,
          );
        }
      }
    }
    const [bx, by] = center(frame.me);
    ctx.strokeStyle = rope;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(bx, by - unit * 0.18, unit * 0.11, 0, 2 * Math.PI);
    ctx.moveTo(bx, by - unit * 0.06);
    ctx.lineTo(bx, by + unit * 0.2);
    ctx.moveTo(bx - unit * 0.17, by + unit * 0.03);
    ctx.lineTo(bx + unit * 0.17, by + unit * 0.03);
    ctx.moveTo(bx - unit * 0.13, by + unit * 0.34);
    ctx.lineTo(bx, by + unit * 0.2);
    ctx.lineTo(bx + unit * 0.13, by + unit * 0.34);
    ctx.stroke();
    if (frame.carrying) {
      ctx.fillStyle = paper;
      ctx.strokeStyle = rope;
      ctx.fillRect(bx + unit * 0.15, by - unit * 0.08, unit * 0.18, unit * 0.18);
      ctx.strokeRect(bx + unit * 0.15, by - unit * 0.08, unit * 0.18, unit * 0.18);
    }
  }

  async function mount(doc) {
    const $ = (selector) => doc.querySelector(selector);
    const make = (tag, className, text) => element(doc, tag, className, text);
    const status = $('#load-status');
    const scrubber = $('#scrubber');
    const play = $('#play');
    const markerBox = $('#episode-markers');
    let recordings = [];
    let timeline = [];
    let position = 0;
    let timer = null;
    let importVersion = 0;
    const panels = [0, 1].map((i) => {
      const panel = make('article', 'panel');
      panel.append(make('h2', '', `Recording ${i === 0 ? 'A' : 'B'}`));
      const pickers = make('div', 'pickers');
      const mind = make('select');
      const seed = make('select');
      for (const [text, select] of [
        ['Mind', mind],
        ['Seed', seed],
      ]) {
        const label = make('label', '', text);
        select.setAttribute('aria-label', `${text} for recording ${i === 0 ? 'A' : 'B'}`);
        label.append(select);
        pickers.append(label);
      }
      const content = make('div');
      panel.append(pickers, content);
      $('#panels').append(panel);
      return { mind, seed, content, recording: null };
    });

    function stop() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      play.textContent = 'Play';
      play.setAttribute('aria-pressed', 'false');
    }

    function episodeLabel(recording, e) {
      return e === recording.config.freeEpisodes ? `Episode ${e + 1} · task` : `Episode ${e + 1} · free`;
    }

    function addNotes(content, recording) {
      const details = make('details');
      details.append(make('summary', '', 'Notes carried out of each episode · full text'));
      if (!recording.notes.length) details.append(make('p', 'empty', 'No carried notes were recorded.'));
      recording.notes.forEach((note, e) => {
        details.append(
          make('h3', '', episodeLabel(recording, e)),
          make('div', 'carried', note || 'No notes.'),
        );
      });
      content.append(details);
    }

    function chart(recording, point) {
      const figure = make('figure');
      figure.append(make('h3', '', 'HF inner readings · entire recording'));
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '-2 -3 304 56');
      svg.setAttribute('class', 'sparkline');
      svg.setAttribute('role', 'img');
      svg.setAttribute(
        'aria-label',
        'Computed boredom (solid) and engagement (dashed), from 0 to 1, across recorded steps.',
      );
      const shape = (name, attributes) => {
        const node = doc.createElementNS(svg.namespaceURI, name);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
        svg.append(node);
      };
      for (const [key, color, dash] of [
        ['boredom', 'var(--rope)', ''],
        ['engagement', 'var(--sky)', '4 3'],
      ]) {
        for (const points of sparklinePoints(
          recording.frames.map((frame) => frame.inner?.[key]),
          300,
          44,
        )) {
          if (!points.includes(' ')) {
            const [cx, cy] = points.split(',');
            shape('circle', { cx, cy, r: 2, fill: color });
          } else {
            shape('polyline', {
              points,
              fill: 'none',
              stroke: color,
              'stroke-width': 1.5,
              'stroke-dasharray': dash,
            });
          }
        }
      }
      const index = recording.frames.findIndex((frame) => frame.e === point.e && frame.s === point.s);
      if (index >= 0) {
        const x = recording.frames.length < 2 ? 0 : (index / (recording.frames.length - 1)) * 300;
        shape('line', { x1: x, x2: x, y1: -2, y2: 46, stroke: 'var(--ink-soft)', 'stroke-width': 1 });
      }
      const key = make('div', 'spark-key');
      key.append(make('span', 'boredom-key', '— boredom'), make('span', 'engagement-key', '╌ engagement'));
      figure.append(
        svg,
        key,
        make(
          'figcaption',
          '',
          `Computed readings, 0–1. Gaps mean no reading. The vertical mark is the selected step. ${innerText(frameAt(recording, point))}`,
        ),
      );
      return figure;
    }

    function renderPanel(panel, point) {
      const recording = panel.recording;
      if (!recording) {
        panel.content.replaceChildren(make('p', 'empty', 'No recording selected.'));
        panel.shownRecording = null;
        return;
      }
      if (panel.shownRecording !== recording) preparePanel(panel, recording);
      const frame = point ? frameAt(recording, point) : null;
      const layout = make('div', 'panel-layout');
      const figure = make('figure');
      const canvas = make('canvas', 'map');
      canvas.width = 560;
      canvas.height = 560;
      const description = frame
        ? `Body at column ${frame.me.x}, row ${frame.me.y}; carrying ${frame.carrying ?? 'nothing'}. Spire at ${recording.world.spire.x}, ${recording.world.spire.y}. ${frame.objects.length} objects on land.`
        : 'Terrain only. No frame was recorded at this episode and step.';
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', `${recording.mind}, seed ${recording.seed}. ${description}`);
      canvas.textContent = description;
      figure.append(canvas, make('figcaption', '', description));
      const legend = make('div', 'legend');
      for (const text of [
        '△ Spire',
        '□ cube',
        '⬟ rock',
        '◯ ring',
        '↟ body',
        'land tint = height (1–4)',
        'number = stack height',
        'north ↑',
      ])
        legend.append(make('span', '', text));
      figure.append(legend);
      const reading = make('div', 'reading');
      reading.append(
        make(
          'p',
          'frame-status',
          point ? `${episodeLabel(recording, point.e)} · step ${point.s}` : 'No recorded frames',
        ),
      );
      if (point?.e === recording.config.freeEpisodes) reading.append(make('p', '', recording.config.task));
      if (frame) {
        reading.append(make('h3', '', 'Action'), make('p', 'action', frame.action));
        reading.append(make('h3', '', 'Events'));
        if (frame.events.length) {
          const events = make('ul', 'events');
          for (const event of frame.events) events.append(make('li', '', event));
          reading.append(events);
        } else reading.append(make('p', 'empty', 'No events recorded.'));
        reading.append(make('h3', '', 'Why'), make('p', 'why', frame.why ?? 'No reason recorded.'));
      } else
        reading.append(
          make('p', 'empty', 'No frame recorded at this step. This recording may be shorter or incomplete.'),
        );
      layout.append(figure, reading);
      panel.frameHost.replaceChildren(layout);
      drawMap(canvas, recording, point, frame);
      if (recording.mind.startsWith('hf')) {
        panel.chartHost.replaceChildren(chart(recording, point ?? { e: -1, s: -1 }));
      }
    }

    function innerText(frame) {
      const reading = (key) => frame?.inner?.[key] ?? 'not recorded';
      const goals = frame?.inner?.goals;
      const audit = goals
        ? ` Goals: ${goals.length ? goals.map((g) => `${g.label} (minute ${g.minute}, ${g.status}, ${g.source})`).join('; ') : 'none'}.`
        : '';
      return `Boredom: ${reading('boredom')}; engagement: ${reading('engagement')}.${audit}`;
    }

    function preparePanel(panel, recording) {
      // Episode text stays in the DOM while frame content changes. This preserves focus,
      // disclosure state and selected text during playback.
      panel.shownRecording = recording;
      panel.content.replaceChildren();
      panel.frameHost = make('div');
      panel.chartHost = make('div');
      panel.content.append(panel.frameHost, panel.chartHost);
      if (recording.mind.startsWith('hf')) {
        const series = make('details');
        series.append(make('summary', '', 'Read all HF inner readings as text'));
        const list = make('ol');
        for (const frame of recording.frames) {
          list.append(make('li', '', `Episode ${frame.e + 1}, step ${frame.s}. ${innerText(frame)}`));
        }
        if (!recording.frames.length) series.append(make('p', 'empty', 'No readings recorded.'));
        series.append(list);
        panel.content.append(series);
      } else {
        const reports = make('details');
        reports.append(make('summary', '', 'Self-reports by episode'));
        if (!recording.selfReports.length) reports.append(make('p', 'empty', 'No self-reports recorded.'));
        for (const report of recording.selfReports) {
          reports.append(
            make('h3', '', episodeLabel(recording, report.episode)),
            make('p', 'carried', report.text),
            make('p', 'small', `Self-reported boredom: ${report.boredom}/10.`),
          );
        }
        panel.content.append(reports);
      }
      addNotes(panel.content, recording);
      panel.content.append(
        make(
          'p',
          'small',
          `${isFixture(recording) ? 'Synthetic fixture · ' : ''}${recording.mind} · seed ${recording.seed} · HF ${recording.hf} · ${recording.frames.length} frames`,
        ),
      );
    }

    function render() {
      const point = timeline[position];
      scrubber.value = String(position);
      $('#position').textContent = point ? `Episode ${point.e + 1} · step ${point.s}` : 'No frames';
      scrubber.setAttribute(
        'aria-valuetext',
        point ? `Episode ${point.e + 1}, step ${point.s}` : 'No frames',
      );
      for (const button of markerBox.children) {
        if (Number(button.dataset.episode) === point?.e) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      }
      for (const panel of panels) renderPanel(panel, point);
    }

    function rebuildTimeline() {
      stop();
      const oldPoint = timeline[position];
      timeline = buildTimeline(panels.map((panel) => panel.recording).filter(Boolean));
      position = oldPoint
        ? Math.max(
            0,
            timeline.findIndex((point) => point.e === oldPoint.e && point.s === oldPoint.s),
          )
        : 0;
      scrubber.max = String(Math.max(0, timeline.length - 1));
      scrubber.disabled = !timeline.length;
      play.disabled = timeline.length < 2;
      markerBox.replaceChildren();
      $('#episode-ticks').replaceChildren();
      for (const e of [...new Set(timeline.map((point) => point.e))]) {
        const task = panels.some((panel) => panel.recording?.config.freeEpisodes === e);
        const label = `Episode ${e + 1}${task ? ' · task' : ' · free'}`;
        const button = make('button', task ? 'task' : '');
        button.append(
          make('span', 'marker-long', 'Episode '),
          doc.createTextNode(`${e + 1}${task ? ' · task' : ' · free'}`),
        );
        button.type = 'button';
        button.setAttribute('aria-label', label);
        button.dataset.episode = String(e);
        const index = timeline.findIndex((point) => point.e === e);
        const tick = make('option');
        tick.value = String(index);
        tick.label = label;
        $('#episode-ticks').append(tick);
        button.addEventListener('click', () => {
          stop();
          position = index;
          render();
        });
        markerBox.append(button);
      }
      render();
    }

    function chooseMind(panel, preferredIndex) {
      const previousSeed = panel.recording?.seed;
      const choices = recordings
        .map((recording, index) => ({ recording, index }))
        .filter(({ recording }) => recording.mind === panel.mind.value);
      panel.seed.replaceChildren();
      for (const { recording, index } of choices) {
        const duplicates = choices.filter((choice) => choice.recording.seed === recording.seed).length > 1;
        const option = make(
          'option',
          '',
          `${recording.seed}${duplicates ? ` · run ${index + 1}` : ''}${isFixture(recording) ? ' · fixture' : ''}`,
        );
        option.value = String(index);
        panel.seed.append(option);
      }
      const selected =
        choices.find(({ index }) => index === preferredIndex) ??
        choices.find(({ recording }) => recording.seed === previousSeed) ??
        choices[0];
      panel.seed.value = selected ? String(selected.index) : '';
      panel.recording = selected?.recording ?? null;
    }

    function measures() {
      const host = $('#measures-table');
      host.replaceChildren();
      if (!recordings.length) {
        host.append(make('p', 'empty', 'No recordings loaded.'));
        return;
      }
      const keys = [...new Set(recordings.flatMap((recording) => Object.keys(recording.measures)))].sort();
      const headers = ['Recording', 'Seed', ...keys, 'Calls', 'Input tokens', 'Output tokens', 'Cost (USD)'];
      const table = make('table');
      table.style.setProperty('--columns', String(headers.length));
      table.append(
        make(
          'caption',
          '',
          `${recordings.length} recordings. ${recordings.filter(isFixture).length} synthetic fixtures, labelled below; fixtures are not experimental results.`,
        ),
      );
      const head = make('thead');
      const headerRow = make('tr');
      for (const name of headers) {
        const th = make('th', '', name);
        th.scope = 'col';
        headerRow.append(th);
      }
      head.append(headerRow);
      const body = make('tbody');
      for (const [index, recording] of recordings.entries()) {
        const row = make('tr');
        const title = make(
          'th',
          '',
          `${recording.mind} · run ${index + 1}${isFixture(recording) ? ' · SYNTHETIC FIXTURE' : ''}`,
        );
        title.scope = 'row';
        row.append(title);
        const values = [
          recording.seed,
          ...keys.map((key) => recording.measures[key] ?? '—'),
          recording.cost.calls,
          recording.cost.inputTokens,
          recording.cost.outputTokens,
          recording.cost.usd,
        ];
        values.forEach((value, i) => {
          const td = make('td', '', String(value));
          td.dataset.label = headers[i + 1];
          row.append(td);
        });
        body.append(row);
      }
      table.append(head, body);
      host.append(table);
    }

    function setRecordings(loaded) {
      recordings = loaded;
      for (const [i, panel] of panels.entries()) {
        panel.mind.replaceChildren();
        for (const name of new Set(recordings.map((recording) => recording.mind))) {
          const option = make('option', '', name);
          option.value = name;
          panel.mind.append(option);
        }
        const initial = recordings[Math.min(i, recordings.length - 1)];
        panel.mind.value = initial?.mind ?? '';
        panel.mind.disabled = !loaded.length;
        panel.seed.disabled = !loaded.length;
        chooseMind(panel, Math.min(i, recordings.length - 1));
      }
      rebuildTimeline();
      measures();
    }

    for (const panel of panels) {
      panel.mind.addEventListener('change', () => {
        chooseMind(panel);
        rebuildTimeline();
      });
      panel.seed.addEventListener('change', () => {
        panel.recording = recordings[Number(panel.seed.value)] ?? null;
        rebuildTimeline();
      });
    }
    scrubber.addEventListener('input', () => {
      stop();
      position = Number(scrubber.value);
      render();
    });
    function start() {
      stop();
      if (timeline.length < 2) return;
      if (position >= timeline.length - 1) position = 0;
      play.textContent = 'Pause';
      play.setAttribute('aria-pressed', 'true');
      render();
      timer = setInterval(
        () => {
          position++;
          render();
          if (position >= timeline.length - 1) stop();
        },
        1000 / Number($('#speed').value),
      );
    }
    play.addEventListener('click', () => {
      if (timer === null) start();
      else stop();
    });
    $('#speed').addEventListener('change', () => {
      if (timer !== null) start();
    });
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) stop();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
    $('#recording-files').addEventListener('change', async (event) => {
      const version = ++importVersion;
      stop();
      const files = [...event.target.files];
      if (!files.length) return;
      status.textContent = 'Reading local recording files…';
      try {
        const loaded = await Promise.all(
          files.map(async (file) => {
            try {
              return validateRecording(JSON.parse(await file.text()));
            } catch (error) {
              throw new Error(`${file.name}: ${error.message}`);
            }
          }),
        );
        if (version !== importVersion) return;
        setRecordings(loaded);
        status.textContent = `${loaded.length} local recording files loaded (${loaded.filter(isFixture).length} synthetic fixtures). They stay on this device.`;
      } catch (error) {
        if (version === importVersion)
          status.textContent = `Could not open recordings. ${error.message} The previous recordings are still shown.`;
      }
      event.target.value = '';
    });

    const version = importVersion;
    if (location.protocol === 'file:') {
      setRecordings([fixture('hf'), fixture('llm-claude')]);
      status.textContent =
        'Synthetic fixtures · no experimental results. Choose recording JSON files to compare real runs.';
      return;
    }
    try {
      const response = await fetch(new URL('./runs/index.json', location.href));
      if (version !== importVersion) return;
      if (response.status === 404) {
        setRecordings([fixture('hf'), fixture('llm-claude')]);
        status.textContent = 'No runs/index.json yet. Showing synthetic fixtures, not experimental results.';
        return;
      }
      if (!response.ok) throw new Error(`runs/index.json returned HTTP ${response.status}.`);
      const paths = indexPaths(await response.json());
      const loaded = await Promise.all(
        paths.map(async (path) => {
          const result = await fetch(new URL(`./runs/${path}`, location.href));
          if (!result.ok) throw new Error(`${path} returned HTTP ${result.status}.`);
          try {
            return validateRecording(await result.json());
          } catch (error) {
            throw new Error(`${path}: ${error.message}`);
          }
        }),
      );
      if (version !== importVersion) return;
      setRecordings(loaded);
      status.textContent = loaded.length
        ? `${loaded.length} recordings loaded from runs/index.json (${loaded.filter(isFixture).length} synthetic fixtures).`
        : 'runs/index.json contains no recordings. Choose local recording files above.';
    } catch (error) {
      if (version !== importVersion) return;
      setRecordings([]);
      status.textContent = `Could not load runs/index.json. ${error.message} Choose local recording files above.`;
    }
  }

  globalThis.IslandReplay = Object.freeze({
    buildTimeline,
    frameAt,
    trailAt,
    indexPaths,
    sparklinePoints,
    validateRecording,
    fixture,
    mount,
  });
})();
