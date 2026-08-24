const form = document.getElementById('simulationForm');
const statusEl = document.getElementById('status');
const plotEl = document.getElementById('plot');
const animateButton = document.getElementById('animate');

const VECTOR_FIELDS = ['r1', 'r2', 'v1', 'v2'];
const PLANET_COLORS = ['#66ff66', '#ff6699'];

const setStatus = (text, isError = false) => {
    statusEl.textContent = text;
    statusEl.classList.toggle('status--error', isError);
};

// "4,-1.5" -> [4, -1.5]; anything else -> null
const parseVector = (raw) => {
    const parts = raw.split(',').map(Number);
    return parts.length === 2 && parts.every(Number.isFinite) ? parts : null;
};

const trace = (x, y, name, color) => ({
    x,
    y,
    mode: 'lines',
    name,
    line: { width: 2, color }
});

const drawPlot = (sol) => {
    const frames = sol[0].map((x, i) => ({
        data: [
            { x: [x], y: [sol[1][i]], mode: 'markers', name: 'Planet 1' },
            { x: [sol[2][i]], y: [sol[3][i]], mode: 'markers', name: 'Planet 2' }
        ]
    }));
    const traces = [
        trace(sol[0], sol[1], 'Planet 1', PLANET_COLORS[0]),
        trace(sol[2], sol[3], 'Planet 2', PLANET_COLORS[1])
    ];
    const layout = {
        xaxis: { title: { text: 'X Position' } },
        yaxis: { title: { text: 'Y Position' } },
        legend: { orientation: 'h', x: 0, xanchor: 'left', y: 1.02, yanchor: 'bottom' },
        paper_bgcolor: '#0c0f1c',
        plot_bgcolor: '#0c0f1c',
        font: { color: '#ffffff' },
        margin: { l: 56, r: 16, t: 40, b: 56 }
    };
    return Plotly.newPlot('plot', traces, layout, { responsive: true })
        .then(() => Plotly.addFrames('plot', frames))
        .then(() => {
            plotEl.classList.add('is-drawn');
            animateButton.hidden = false;
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
            setStatus(`${planet}, ${label}: enter two numbers separated by a comma, for example ${input.placeholder}.`, true);
            input.focus();
            return;
        }
        data[field] = vector;
    }

    setStatus('Solving the equations of motion...');
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
        setStatus('Trajectory drawn. Use "Show Live Simulation" to play it back.');
    } catch (error) {
        setStatus(`Simulation failed: ${error.message}`, true);
    }
});
