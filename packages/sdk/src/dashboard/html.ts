export function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentBill Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; min-height: 100vh; }
  .header { padding: 24px 32px; border-bottom: 1px solid #1a1a2e; display: flex; align-items: center; gap: 12px; }
  .header h1 { font-size: 20px; font-weight: 600; color: #fff; }
  .header span { font-size: 12px; color: #666; background: #1a1a2e; padding: 4px 8px; border-radius: 4px; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px 32px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #12121a; border: 1px solid #1a1a2e; border-radius: 8px; padding: 20px; }
  .stat-card .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .stat-card .value { font-size: 28px; font-weight: 700; color: #fff; }
  .stat-card .value.green { color: #22c55e; }
  .columns { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  .panel { background: #12121a; border: 1px solid #1a1a2e; border-radius: 8px; padding: 20px; }
  .panel h2 { font-size: 14px; font-weight: 600; color: #ccc; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; padding: 8px 12px; border-bottom: 1px solid #1a1a2e; }
  td { padding: 10px 12px; border-bottom: 1px solid #0f0f18; font-size: 13px; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge.success { background: #052e16; color: #22c55e; }
  .badge.failed { background: #2a0a0a; color: #ef4444; }
  .truncate { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; vertical-align: middle; }
  .list-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #0f0f18; font-size: 13px; }
  .list-item:last-child { border-bottom: none; }
  .list-item .name { color: #ccc; }
  .list-item .meta { color: #888; font-size: 12px; }
  .list-item .amount { color: #22c55e; font-weight: 600; }
  .empty { color: #444; font-style: italic; padding: 20px 0; text-align: center; }
  .refresh { font-size: 11px; color: #444; text-align: center; padding: 16px; }
  @media (max-width: 768px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .columns { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>AgentBill</h1>
  <span>Dashboard</span>
</div>
<div class="container">
  <div class="stats-grid">
    <div class="stat-card"><div class="label">Total Revenue</div><div class="value green" id="totalRevenue">$0.00</div></div>
    <div class="stat-card"><div class="label">Today's Revenue</div><div class="value green" id="todayRevenue">$0.00</div></div>
    <div class="stat-card"><div class="label">Total Transactions</div><div class="value" id="totalTx">0</div></div>
    <div class="stat-card"><div class="label">Today's Transactions</div><div class="value" id="todayTx">0</div></div>
  </div>
  <div class="columns">
    <div class="panel">
      <h2>Recent Transactions</h2>
      <table><thead><tr><th>Time</th><th>Endpoint</th><th>Payer</th><th>Amount</th><th>Status</th></tr></thead><tbody id="txBody"></tbody></table>
      <div class="empty" id="txEmpty">No transactions yet</div>
    </div>
    <div>
      <div class="panel" style="margin-bottom:16px">
        <h2>Top Endpoints</h2>
        <div id="topEndpoints"><div class="empty">No data yet</div></div>
      </div>
      <div class="panel">
        <h2>Top Payers</h2>
        <div id="topPayers"><div class="empty">No data yet</div></div>
      </div>
    </div>
  </div>
  <div class="refresh">Auto-refreshes every 10s</div>
</div>
<script>
const basePath = window.location.pathname.replace(/\\/dashboard$/, '');
function fmt(n) { return '$' + n.toFixed(2); }
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return new Date(ts).toLocaleDateString();
}
function trunc(addr) {
  if (!addr || addr.length < 10) return addr || 'unknown';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
async function refresh() {
  try {
    const res = await fetch(basePath + '/api/stats');
    const d = await res.json();
    document.getElementById('totalRevenue').textContent = fmt(d.totalRevenue);
    document.getElementById('todayRevenue').textContent = fmt(d.todayRevenue);
    document.getElementById('totalTx').textContent = d.totalTransactions;
    document.getElementById('todayTx').textContent = d.todayTransactions;
    const tbody = document.getElementById('txBody');
    const empty = document.getElementById('txEmpty');
    if (d.recentTransactions.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      tbody.innerHTML = d.recentTransactions.map(tx =>
        '<tr><td>' + ago(tx.timestamp) + '</td>' +
        '<td><code>' + tx.method + ' ' + tx.endpoint + '</code></td>' +
        '<td><span class="truncate" title="' + tx.payer + '">' + trunc(tx.payer) + '</span></td>' +
        '<td>' + fmt(parseFloat(tx.amount)||0) + ' ' + tx.currency + '</td>' +
        '<td><span class="badge ' + (tx.success?'success':'failed') + '">' + (tx.success?'Settled':'Failed') + '</span></td></tr>'
      ).join('');
    }
    const ep = document.getElementById('topEndpoints');
    ep.innerHTML = d.topEndpoints.length === 0 ? '<div class="empty">No data yet</div>' :
      d.topEndpoints.map(e =>
        '<div class="list-item"><span class="name"><code>' + e.endpoint + '</code></span><span><span class="amount">' + fmt(e.revenue) + '</span> <span class="meta">(' + e.count + ' txns)</span></span></div>'
      ).join('');
    const pa = document.getElementById('topPayers');
    pa.innerHTML = d.topPayers.length === 0 ? '<div class="empty">No data yet</div>' :
      d.topPayers.map(p =>
        '<div class="list-item"><span class="name" title="' + p.payer + '">' + trunc(p.payer) + '</span><span><span class="amount">' + fmt(p.revenue) + '</span> <span class="meta">(' + p.count + ' txns)</span></span></div>'
      ).join('');
  } catch(e) { console.error('Dashboard refresh failed:', e); }
}
refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>`;
}
