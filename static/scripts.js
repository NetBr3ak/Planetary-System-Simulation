const form = document.getElementById('simulationForm');
const statusEl = document.getElementById('status');
const plotEl = document.getElementById('plot');
const scopeEl = document.querySelector('.scope');
const bandEl = document.querySelector('.band');
const progressEl = document.getElementById('progress');
const ledEl = document.getElementById('led');
const runButton = document.getElementById('run');
const runVerb = document.getElementById('runVerb');
const animateButton = document.getElementById('animate');
const playVerb = document.getElementById('playVerb');
const frameGroup = document.getElementById('frames');
const outSeparation = document.getElementById('outSeparation');
const outTime = document.getElementById('outTime');
const outStep = document.getElementById('outStep');
const outDrift = document.getElementById('outDrift');

const VECTOR_FIELDS = ['r1', 'r2', 'v1', 'v2'];
// Ice cyan 12.96:1 and paper white 18.08:1 on #08090B; the dash on channel 2
// carries the same distinction without relying on colour.
const CHANNELS = [
    { name: 'Planet 1', color: '#5BE1FF', dash: 'solid', symbol: 'circle', size: 11 },
    { name: 'Planet 2', color: '#F2F4F7', dash: 'dash', symbol: 'square-open', size: 12 }
];
const ORBIT = { bound: 'Bound orbit', parabolic: 'Parabolic trajectory', escape: 'Escape trajectory' };
const T_END = 10;
const IDLE_READOUT = '---';

let solution = null;
let referenceFrame = 'bary';
let step = 0;
let playing = false;

const setStatus = (text, state) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('status--error', state === 'error');
    // A validation message has to interrupt. Polite queues it behind whatever the
    // screen reader is saying, which is long after focus has landed in the bad field.
    statusEl.setAttribute('aria-live', state === 'error' ? 'assertive' : 'polite');
    ledEl.className = `led is-${state}`;
};

const setBusy = (busy) => {
    runButton.setAttribute('aria-busy', String(busy));
    runVerb.textContent = busy ? 'Solving' : 'Run';
    scopeEl.classList.toggle('is-solving', busy);
};

const setPlaying = (on) => {
    playing = on;
    playVerb.textContent = on ? 'Stop' : 'Play';
    animateButton.classList.toggle('is-playing', on);
    animateButton.setAttribute('aria-label', on ? 'Stop the live simulation' : 'Play the live simulation');
};

// Live instrument readout: every value below is measured off the returned solution.
const setReadout = (i) => {
    step = i;
    const [r1x, r1y, r2x, r2y] = solution.positions;
    outSeparation.textContent = Math.hypot(r2x[i] - r1x[i], r2y[i] - r1y[i]).toFixed(3);
    outTime.textContent = ((i * T_END) / (r1x.length - 1)).toFixed(2);
    outStep.textContent = String(i + 1).padStart(4, '0');
    outDrift.textContent = solution.drift[i].toExponential(2);
    progressEl.style.transform = `scaleX(${i / (r1x.length - 1)})`;
};

const clearReadout = () => {
    bandEl.classList.remove('is-live');
    for (const cell of [outSeparation, outTime, outStep, outDrift]) {
        cell.textContent = IDLE_READOUT;
    }
    progressEl.style.transform = 'scaleX(0)';
};

// "4,-1.5" -> [4, -1.5]; anything else -> null
const parseVector = (raw) => {
    const parts = raw.split(',').map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
};

const clearInvalid = () => {
    for (const field of VECTOR_FIELDS) {
        const input = document.getElementById(field);
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
    }
};

// Focus alone lands the user in a field with no announced reason for being there.
const markInvalid = (input) => {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', 'status');
    input.focus();
};

// Origin of the chosen reference frame, sample by sample; the lab frame has none.
// Each argument is one body as [xValues, yValues].
const originOf = (body1, body2) => {
    if (referenceFrame === 'lab') return null;
    if (referenceFrame === 'planet1') return body1;
    const total = solution.m1 + solution.m2;
    return body1.map((axis, k) => axis.map((v, i) => (solution.m1 * v + solution.m2 * body2[k][i]) / total));
};

const relativeTo = (body, origin) =>
    origin ? body.map((axis, k) => axis.map((v, i) => v - origin[k][i])) : body;

const trace = (x, y, channel) => ({
    x,
    y,
    mode: 'lines',
    name: channel.name,
    line: { width: 2.5, color: channel.color, dash: channel.dash }
});

const axis = (title) => ({
    title: { text: title, font: { size: 10, color: '#A6AEBB' }, standoff: 12 },
    gridcolor: '#171B22',
    zerolinecolor: '#2C323C',
    showline: true,
    linecolor: '#636B79',
    mirror: true,
    ticks: 'outside',
    ticklen: 5,
    tickcolor: '#636B79'
});

const head = (x, y, channel) => ({
    x: [x],
    y: [y],
    mode: 'markers',
    name: channel.name,
    marker: {
        symbol: channel.symbol,
        size: channel.size,
        color: channel.color,
        line: { color: '#08090B', width: 2 }
    }
});

// Brentq-refined closest approaches, so a ring sits on the exact minimum rather than
// on whichever of the 1000 samples happened to land nearest it.
const rings = (body1, body2) => ({
    x: [...body1[0], ...body2[0]],
    y: [...body1[1], ...body2[1]],
    mode: 'markers',
    name: 'Closest approach',
    marker: { symbol: 'circle-open', size: 15, color: '#FFB020', line: { width: 1.5 } }
});

const drawPlot = () => {
    const { positions, events } = solution;
    const path1 = [positions[0], positions[1]];
    const path2 = [positions[2], positions[3]];
    const pathOrigin = originOf(path1, path2);
    const [[x1, y1], [x2, y2]] = [path1, path2].map((body) => relativeTo(body, pathOrigin));

    const mark1 = [events.map((e) => e.r1[0]), events.map((e) => e.r1[1])];
    const mark2 = [events.map((e) => e.r2[0]), events.map((e) => e.r2[1])];
    const markOrigin = originOf(mark1, mark2);
    const [ring1, ring2] = [mark1, mark2].map((body) => relativeTo(body, markOrigin));

    // Frames move only the two head markers (traces 2 and 3), so the paths stay drawn.
    const frames = x1.map((x, i) => ({
        name: String(i),
        data: [{ x: [x], y: [y1[i]] }, { x: [x2[i]], y: [y2[i]] }],
        traces: [2, 3]
    }));
    const traces = [
        trace(x1, y1, CHANNELS[0]),
        trace(x2, y2, CHANNELS[1]),
        head(x1[0], y1[0], CHANNELS[0]),
        head(x2[0], y2[0], CHANNELS[1]),
        rings(ring1, ring2)
    ];
    // The 1:1 lock keeps a circular orbit circular, which matters for correctness
    // on a desktop-wide plot area. Below 900px the container is narrow enough that
    // the same lock forces the y-domain to a huge multiple of the x-domain, and the
    // whole orbit family collapses into a sliver a few dozen pixels tall - unusable
    // on a phone, the app's primary output gone. constrain:'domain' below that width
    // fills the real container instead of enforcing true pixel-for-pixel scale.
    const wideEnoughToLock = window.matchMedia('(min-width: 900px)').matches;
    const layout = {
        xaxis: axis('X position'),
        yaxis: wideEnoughToLock
            ? { ...axis('Y position'), scaleanchor: 'x', scaleratio: 1 }
            : { ...axis('Y position'), constrain: 'domain' },
        showlegend: false,
        paper_bgcolor: '#08090B',
        plot_bgcolor: '#08090B',
        font: { family: "'Fira Code', ui-monospace, monospace", size: 11, color: '#8A929F' },
        margin: { l: 64, r: 28, t: 20, b: 56 },
        modebar: {
            bgcolor: 'rgba(0,0,0,0)',
            color: '#8A929F',
            activecolor: '#FFB020',
            orientation: 'v'
        }
    };
    return Plotly.newPlot('plot', traces, layout, { responsive: true })
        .then(() => Plotly.addFrames('plot', frames))
        .then(() => {
            scopeEl.classList.add('is-drawn');
            bandEl.classList.add('is-live');
            setReadout(0);
            animateButton.hidden = false;
            frameGroup.hidden = false;
            // Plotly.newPlot (not just addFrames/animate) purges prior listeners on
            // every redraw, so this must rebind on every solve, not once for the
            // page's life - a once-only guard here left the readout live for exactly
            // the first RUN and silently dead on every one after it.
            // The frame index arrives as event.name; event.frame carries no name.
            plotEl.on('plotly_animatingframe', (event) => {
                const i = Number(event.name);
                if (Number.isInteger(i)) {
                    setReadout(i);
                }
            });
            plotEl.on('plotly_animated', () => setPlaying(false));
        });
};

const summarise = () => {
    const { positions, events, classification } = solution;
    const [r1x, r1y, r2x, r2y] = positions;
    let closest = Infinity;
    for (let i = 0; i < r1x.length; i += 1) {
        closest = Math.min(closest, Math.hypot(r2x[i] - r1x[i], r2y[i] - r1y[i]));
    }
    for (const event of events) {
        closest = Math.min(closest, Math.hypot(event.r2[0] - event.r1[0], event.r2[1] - event.r1[1]));
    }
    const approaches = events.length === 0
        ? 'no closest approach inside the window'
        : `${events.length} closest approach${events.length === 1 ? '' : 'es'}`;
    return `${ORBIT[classification]}, ${approaches}, min separation ${closest.toFixed(3)}. Press Play to run it back.`;
};

// Interrupting a run rejects with no reason at all. That is Stop working, or a redraw
// replacing the frames, so only that exact signal is swallowed; real errors still throw.
// Every Plotly.animate call here needs it: the stop jump is interrupted by the next Play.
const ignoreInterruption = (reason) => {
    if (reason !== undefined) throw reason;
};

// A real button instead of a Plotly updatemenu: the SVG widget is not keyboard reachable.
animateButton.addEventListener('click', () => {
    // Plotly has no stop call. Jumping to the frame already on screen with mode
    // 'immediate' discards the queue, which is exactly what stopping means here.
    const jump = { mode: 'immediate', frame: { redraw: false, duration: 0 }, transition: { duration: 0 } };
    if (playing) {
        Plotly.animate('plot', [String(step)], jump).catch(ignoreInterruption);
        setPlaying(false);
        return;
    }
    const last = solution.positions[0].length - 1;
    const start = step >= last ? 0 : step + 1;
    setPlaying(true);
    // Named frames rather than fromcurrent: at the end of a run fromcurrent has
    // nothing left to play, so Play would look dead until the next solve. And
    // 'immediate' instead of the default 'afterall', which queues every extra click
    // behind the 50 s run already playing with no way to cancel the backlog.
    Plotly.animate('plot', Array.from({ length: last - start + 1 }, (_, k) => String(start + k)), {
        mode: 'immediate',
        frame: { redraw: true, duration: 50 },
        transition: { duration: 0 }
    }).catch(ignoreInterruption);
});

frameGroup.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-frame]');
    if (!button || button.dataset.frame === referenceFrame) return;
    referenceFrame = button.dataset.frame;
    for (const other of frameGroup.querySelectorAll('button')) {
        other.setAttribute('aria-pressed', String(other === button));
    }
    // Every frame is a client-side subtraction on positions already in hand.
    setPlaying(false);
    drawPlot();
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearInvalid();
    const data = Object.fromEntries(new FormData(event.target).entries());
    for (const field of VECTOR_FIELDS) {
        const vector = parseVector(data[field]);
        if (!vector) {
            const input = document.getElementById(field);
            const planet = input.closest('fieldset').querySelector('legend').textContent;
            const label = document.querySelector(`label[for="${field}"]`).textContent;
            setStatus(`${planet}, ${label}: enter two numbers separated by a comma, for example ${input.placeholder}.`, 'error');
            markInvalid(input);
            return;
        }
        data[field] = vector;
    }

    scopeEl.classList.remove('is-drawn');
    clearReadout();
    // Both controls drive a plot that is about to be replaced, and #plot is already
    // fading out: left live, Play animates a stale trajectory nobody can see.
    animateButton.hidden = true;
    frameGroup.hidden = true;
    setPlaying(false);
    setBusy(true);
    setStatus('Solving the equations of motion...', 'busy');
    try {
        const response = await fetch('/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        // A 500 returns Flask's HTML page, so parsing has to be allowed to fail here.
        const body = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(body?.positions)) {
            throw new Error(body?.error ?? `server returned ${response.status} ${response.statusText}`);
        }
        solution = { ...body, m1: Number(data.m1), m2: Number(data.m2) };
        await drawPlot();
        setStatus(summarise(), 'ok');
    } catch (error) {
        setStatus(`Simulation failed: ${error.message}`, 'error');
    } finally {
        setBusy(false);
    }
});
