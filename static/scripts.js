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
const outSeparation = document.getElementById('outSeparation');
const outTime = document.getElementById('outTime');
const outStep = document.getElementById('outStep');

const VECTOR_FIELDS = ['r1', 'r2', 'v1', 'v2'];
// Ice cyan 12.96:1 and paper white 18.08:1 on #08090B; the dash on channel 2
// carries the same distinction without relying on colour.
const CHANNELS = [
    { name: 'Planet 1', color: '#5BE1FF', dash: 'solid', symbol: 'circle', size: 11 },
    { name: 'Planet 2', color: '#F2F4F7', dash: 'dash', symbol: 'square-open', size: 12 }
];
const T_END = 10;
const IDLE_READOUT = '---';

let solution = null;

const setStatus = (text, state) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('status--error', state === 'error');
    ledEl.className = `led is-${state}`;
};

const setBusy = (busy) => {
    runButton.setAttribute('aria-busy', String(busy));
    runVerb.textContent = busy ? 'Solving' : 'Run';
    scopeEl.classList.toggle('is-solving', busy);
};

// Live instrument readout: every value below is measured off the returned solution.
const setReadout = (i) => {
    const dx = solution[2][i] - solution[0][i];
    const dy = solution[3][i] - solution[1][i];
    outSeparation.textContent = Math.hypot(dx, dy).toFixed(3);
    outTime.textContent = ((i * T_END) / (solution[0].length - 1)).toFixed(2);
    outStep.textContent = String(i + 1).padStart(4, '0');
    progressEl.style.transform = `scaleX(${i / (solution[0].length - 1)})`;
};

const clearReadout = () => {
    bandEl.classList.remove('is-live');
    outSeparation.textContent = IDLE_READOUT;
    outTime.textContent = IDLE_READOUT;
    outStep.textContent = IDLE_READOUT;
    progressEl.style.transform = 'scaleX(0)';
};

// "4,-1.5" -> [4, -1.5]; anything else -> null
const parseVector = (raw) => {
    const parts = raw.split(',').map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
};

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

const drawPlot = (sol) => {
    // Frames move only the two head markers (traces 2 and 3), so the paths stay drawn.
    const frames = sol[0].map((x, i) => ({
        name: String(i),
        data: [
            { x: [x], y: [sol[1][i]] },
            { x: [sol[2][i]], y: [sol[3][i]] }
        ],
        traces: [2, 3]
    }));
    const traces = [
        trace(sol[0], sol[1], CHANNELS[0]),
        trace(sol[2], sol[3], CHANNELS[1]),
        head(sol[0][0], sol[1][0], CHANNELS[0]),
        head(sol[2][0], sol[3][0], CHANNELS[1])
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
            solution = sol;
            scopeEl.classList.add('is-drawn');
            bandEl.classList.add('is-live');
            setReadout(0);
            animateButton.hidden = false;
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
        });
};

// A real button instead of a Plotly updatemenu: the SVG widget is not keyboard reachable.
animateButton.addEventListener('click', () => {
    Plotly.animate('plot', null, {
        fromcurrent: true,
        frame: { redraw: true, duration: 50 },
        transition: { duration: 0 }
    });
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    for (const field of VECTOR_FIELDS) {
        const vector = parseVector(data[field]);
        if (!vector) {
            const input = document.getElementById(field);
            const planet = input.closest('fieldset').querySelector('legend').textContent;
            const label = document.querySelector(`label[for="${field}"]`).textContent;
            setStatus(`${planet}, ${label}: enter two numbers separated by a comma, for example ${input.placeholder}.`, 'error');
            input.focus();
            return;
        }
        data[field] = vector;
    }

    scopeEl.classList.remove('is-drawn');
    clearReadout();
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
        if (!response.ok || !Array.isArray(body)) {
            throw new Error(body?.error ?? `server returned ${response.status} ${response.statusText}`);
        }
        await drawPlot(body);
        setStatus('Trajectory drawn. Press Play to run it back frame by frame.', 'ok');
    } catch (error) {
        setStatus(`Simulation failed: ${error.message}`, 'error');
    } finally {
        setBusy(false);
    }
});
