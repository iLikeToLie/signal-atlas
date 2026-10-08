"""Render the documentation guide from the bundled CSV (requires Matplotlib).
Run from the repository root:
  MPLCONFIGDIR=/tmp/signal-atlas-mpl python docs/illustrations/render_sparse_cycles.py
"""
from pathlib import Path
import csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parents[2]
rows = list(csv.DictReader(line for line in (ROOT / 'public/examples/sparse-frequency-cycle.csv').read_text().splitlines() if not line.startswith('#')))
times = np.array([float(row['t']) for row in rows if row['f']])
values = np.array([float(row['f']) for row in rows if row['f']])
missing = [float(row['t']) for row in rows if not row['f']]
period = 1.
assert len(times) == 8 and max(np.diff(np.r_[times, times[0] + period])) <= .2000001

INK, MUTED = '#193648', '#526778'
TEAL, BLUE, AMBER, PURPLE = '#087e80', '#2865ce', '#bc580b', '#7648b4'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 14, 'text.color': INK, 'axes.labelcolor': MUTED, 'xtick.color': MUTED, 'ytick.color': MUTED, 'svg.fonttype': 'path', 'svg.hashsalt': 'signal-atlas-sparse-v1'})
fig = plt.figure(figsize=(12, 10.4), facecolor='#ffffff')
grid = fig.add_gridspec(3, 2, left=.085, right=.965, top=.80, bottom=.13, hspace=1.45, wspace=.28, height_ratios=[1, 1, .5])
fig.text(.055, .958, 'Missing observations ≠ signal jumps', fontsize=25, weight='bold')
fig.text(.055, .922, 'A visual guide to one known repeating cycle', fontsize=17, color=MUTED)
legend = [Line2D([], [], color=TEAL, marker='o', linestyle='none', markersize=8, label='Observed value'), Line2D([], [], color=MUTED, linestyle=':', label='Missing timestamp'), Line2D([], [], color=BLUE, linestyle='--', label='Chosen reconstruction')]
fig.legend(handles=legend, loc='upper left', bbox_to_anchor=(.048,.898), ncol=3, frameon=False, fontsize=13, handlelength=2)

def panel(ax, title):
    ax.set_title(title, loc='left', fontsize=19, weight='bold', pad=18)
    ax.set_xlim(0, 1); ax.set_ylim(9, 15.3)
    ax.set_xticks([0, .5, 1], ['0', '0.5T', 'T'])
    ax.set_yticks([10, 12, 14]); ax.set_ylabel('Value (fu)', fontsize=13)
    ax.set_xlabel('Time within the cycle', fontsize=12)
    ax.set_facecolor('#f5f8fa')
    ax.grid(axis='y', alpha=.12, color=INK)
    for spine in ['top', 'right']: ax.spines[spine].set_visible(False)
    for spine in ['left', 'bottom']: ax.spines[spine].set_color('#b8c5ce')
    ax.tick_params(labelsize=12)

def observations(ax):
    for t in missing: ax.axvline(t, color=MUTED, linestyle=':', linewidth=1.3, alpha=.75)
    ax.scatter(times, values, color=TEAL, s=62, edgecolor='white', linewidth=1, zorder=5)

def note(ax, text):
    ax.text(0, -.40, text, transform=ax.transAxes, fontsize=13, color=MUTED, va='top', linespacing=1.45)

ax = fig.add_subplot(grid[0, 0]); panel(ax, '1  Sparse observations')
ax.axvspan(.65, .85, color=BLUE, alpha=.09)
observations(ax)
ax.annotate('', (.65, 14.8), (.85, 14.8), arrowprops={'arrowstyle':'|-|','color':BLUE,'lw':1.4})
ax.text(.75, 15.0, 'Gap = 0.20T', color=BLUE, fontsize=12, ha='center')
ax.annotate('Value unknown', (.75, 11.0), (.38, 9.4), fontsize=12, color=MUTED, arrowprops={'arrowstyle':'->','color':MUTED})
note(ax, '8 observed values; 2 missing timestamps.\nA blank row is not a zero-valued sample.')

ax = fig.add_subplot(grid[0, 1]); panel(ax, '2  A real jump')
# A separate illustrative complete hop trajectory, not hidden truth for panel 1.
hop_t = np.linspace(0, 1, 17)
hop_f = np.where(hop_t < .25, 10, np.where(hop_t < .625, 14, 12))
hop_f[-1] = hop_f[0]
ax.step(hop_t, hop_f, where='post', color=PURPLE, lw=2.5)
ax.scatter(hop_t[:-1], hop_f[:-1], color=TEAL, s=33, zorder=5, edgecolor='white', linewidth=.6)
ax.annotate('Real jump', (.25, 12), (.04, 14.65), fontsize=13, color=PURPLE, arrowprops={'arrowstyle':'->','color':PURPLE})
note(ax, 'Separate illustrative hop pattern; no missing rows.\nA jump changes the value, not the sample count.')

extended_t = np.r_[times[-1] - period, times, times[0] + period]
extended_f = np.r_[values[-1], values, values[0]]
ax = fig.add_subplot(grid[1, 0]); panel(ax, '3  Linear reconstruction')
ax.plot(extended_t, extended_f, '--', color=BLUE, lw=2.7)
observations(ax)
note(ax, 'The same 8 observations as panel 1.\nStraight lines model the unobserved spans.')

ax = fig.add_subplot(grid[1, 1]); panel(ax, '4  Hold reconstruction')
ax.step(extended_t, extended_f, where='post', linestyle='--', color=AMBER, lw=2.7)
observations(ax)
note(ax, 'The same 8 observations as panel 1.\nHold models plateaus followed by jumps.')

ax = fig.add_subplot(grid[2, :]); ax.set_axis_off()
ax.set_xlim(.80,1.10); ax.set_ylim(0,1)
ax.text(.80, 1.40, 'Remember the gap across the cycle boundary', weight='bold', fontsize=16, va='top')
ax.plot([.85,1.05],[.40,.40],color=BLUE,lw=2,linestyle='--')
ax.scatter([.85,1.05],[.40,.40],color=TEAL,s=75,zorder=3)
ax.plot([1,1],[.16,.76],color=PURPLE,lw=1.4,linestyle=':')
ax.text(1,.80,'T',color=PURPLE,ha='center',fontsize=14)
ax.text(.85,.16,'0.85T\nLast observation',ha='center',va='top',fontsize=12)
ax.text(1.05,.16,'1.05T\nFirst observation again',ha='center',va='top',fontsize=12)
ax.text(.94,.55,'0.20T cyclic gap',ha='center',color=BLUE,fontsize=13)
fig.text(.055,.075,'Import guard: ≥8 observed points  •  Every cyclic gap ≤20% of T  •  Choose linear or hold',fontsize=14,weight='bold')
fig.text(.055,.042,'Dashed curves are assumptions between observations. Original values and missing timestamps are retained.',fontsize=12,color=MUTED)

out = Path(__file__).resolve().parent
svg = out/'sparse-cycles-guide.svg'
fig.savefig(svg, metadata={'Date':None}, facecolor=fig.get_facecolor())
svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines()) + '\n')
fig.savefig(out/'sparse-cycles-guide.png', dpi=180, facecolor=fig.get_facecolor())
plt.close(fig)
print('Rendered SVG and PNG visual guide from the bundled sparse Frequency CSV.')
