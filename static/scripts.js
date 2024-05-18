document.getElementById('simulationForm').addEventListener('submit', function (event) {
    event.preventDefault();
    // Collect form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.r1 = data.r1.split(',').map(Number);
    data.r2 = data.r2.split(',').map(Number);
    data.v1 = data.v1.split(',').map(Number);
    data.v2 = data.v2.split(',').map(Number);
    // Fetch simulation data from server
    fetch('/simulate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(sol => {
            // Process simulation data and plot trajectories
            const frames = sol[0].map((x, i) => ({
                data: [
                    { x: [x], y: [sol[1][i]], mode: 'markers', name: 'Planet 1' },
                    { x: [sol[2][i]], y: [sol[3][i]], mode: 'markers', name: 'Planet 2' }
                ]
            }));
            // Define traces for Plotly plot
            const trace1 = {
                x: sol[0],
                y: sol[1],
                mode: 'lines',
                name: 'Planet 1',
                line: { width: 2 },
                marker: { color: '#66ff66' }
            };
            const trace2 = {
                x: sol[2],
                y: sol[3],
                mode: 'lines',
                name: 'Planet 2',
                line: { width: 2 },
                marker: { color: '#ff6699' }
            };
            // Create Plotly plot
            Plotly.newPlot('plot', [trace1, trace2], {
                title: 'Trajectory of Planets',
                xaxis: { title: 'X Position' },
                yaxis: { title: 'Y Position' },
                updatemenus: [{
                    type: 'buttons',
                    showactive: false,
                    buttons: [{
                        label: 'Show Live Simulation',
                        method: 'animate',
                        args: [null, {
                            fromcurrent: true,
                            frame: { redraw: true, duration: 50 },
                            transition: { duration: 0 }
                        }]
                    }]
                }],
                legend: {
                    x: 1,
                    xanchor: 'right',
                    y: 1.5
                },
                paper_bgcolor: '#0c0f1c',
                plot_bgcolor: '#0c0f1c',
                font: { color: '#ffffff' },
                margin: { t: 50 }
            }).then(() => {
                Plotly.addFrames('plot', frames);
            });
        });
});