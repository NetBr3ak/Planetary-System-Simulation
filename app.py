from flask import Flask, render_template, request, jsonify
import numpy as np
from scipy.integrate import solve_ivp

app = Flask(__name__)

# Define the equations of motion for a two-body system
def two_body_equations(t, y, m1, m2):
    r1, r2, v1, v2 = y.reshape((4, 2))
    r = np.linalg.norm(r2 - r1)
    dv1dt = m2 * (r2 - r1) / r**3
    dv2dt = m1 * (r1 - r2) / r**3
    return np.concatenate((v1, v2, dv1dt, dv2dt))

# Route for simulating the two-body system
@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    m1, m2 = map(float, (data['m1'], data['m2']))
    r1, r2, v1, v2 = map(np.array, (data['r1'], data['r2'], data['v1'], data['v2']))
    y0 = np.concatenate((r1, r2, v1, v2))
    t_span = (0, 10)
    t_eval = np.linspace(*t_span, 1000)
    sol = solve_ivp(two_body_equations, t_span, y0, args=(m1, m2), t_eval=t_eval)
    return jsonify(sol.y.tolist())

# Route for rendering the index.html template
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=False)