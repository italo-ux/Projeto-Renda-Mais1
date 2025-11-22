// Exporta função para inicializar e atualizar os gráficos do dashboard


let chartPie = null;
let chartBar = null;
let autoRefreshTimer = null;

let lastPieData = null;
let lastBarData = null;
let isUpdating = false;
let initialized = false;

async function criarGraficoPizza() {
  console.debug('[graficos] criarGraficoPizza chamado');
  try {
    const res = await fetch('/api/dashboard/guardado-vs-gasto');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoPizza');
    if (!canvas) return;

    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) {  }

    const style = getComputedStyle(document.documentElement);
    const colorGuardado = style.getPropertyValue('--renda-verde').trim() || '#6a994e';
    const colorGasto = style.getPropertyValue('--renda-vermelho').trim() || '#bc4749';

    chartPie = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Guardado', 'Gasto'],
        datasets: [{
          data: [dados.guardado ?? 0, dados.gasto ?? 0],
          backgroundColor: [colorGuardado, colorGasto],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const val = ctx.raw ?? 0;
                return ctx.label + ': ' + Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              }
            }
          }
        }
      }
    });

    // registra estado inicial
    try { lastPieData = JSON.stringify([dados.guardado ?? 0, dados.gasto ?? 0]); } catch(e){ lastPieData = null; }
  } catch (err) {
    console.error('Erro ao criar gráfico de pizza:', err);
  }
}

async function criarGraficoBarras() {
  console.debug('[graficos] criarGraficoBarras chamado');
  try {
    const res = await fetch('/api/dashboard/gastos-mensais');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoBarras');
    if (!canvas) return;

    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) { /* ignore */ }

    const style = getComputedStyle(document.documentElement);
    const c1 = style.getPropertyValue('--renda-verde').trim() || '#a7c957';
    const c2 = style.getPropertyValue('--renda-verde-escuro').trim() || '#235321';

    const ctx = canvas.getContext('2d');
    const gradHeight = canvas.height || canvas.clientHeight || 300;
    const grad = ctx.createLinearGradient(0, 0, 0, gradHeight);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.meses || [],
        datasets: [{
          label: 'Gastos',
          data: dados.valores || [],
          backgroundColor: grad,
          borderColor: c2,
          borderWidth: 1
        }]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => Number(v).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' }) }
          }
        }
      }
    });

    // registra estado inicial
    try { lastBarData = JSON.stringify({ meses: dados.meses || [], valores: dados.valores || [] }); } catch(e){ lastBarData = null; }
  } catch (err) {
    console.error('Erro ao criar gráfico de barras:', err);
  }
}

// Atualiza os dados dos charts existentes apenas quando houver alteração
async function atualizarGraficosDashboard() {
  console.debug('[graficos] atualizarGraficosDashboard chamado');
  if (isUpdating) { console.debug('[graficos] atualização já em andamento — ignorando'); return; } 
  isUpdating = true;
  try {
    const [resp1, resp2] = await Promise.all([
      fetch('/api/dashboard/guardado-vs-gasto'),
      fetch('/api/dashboard/gastos-mensais')
    ]);

   // pie
    if (resp1.ok) {
      const d1 = await resp1.json();
      const newPie = JSON.stringify([d1.guardado ?? 0, d1.gasto ?? 0]);
      if (newPie !== lastPieData) {
        if (chartPie) {
          chartPie.data.datasets[0].data = JSON.parse(newPie);
          chartPie.update();
        } else {
          await criarGraficoPizza();
        }
        lastPieData = newPie;
      }
    } else {
      console.warn('/api/dashboard/guardado-vs-gasto retornou', resp1.status);
    }

    // barras
    if (resp2.ok) {
      const d2 = await resp2.json();
      const newBar = JSON.stringify({ meses: d2.meses || [], valores: d2.valores || [] });
      if (newBar !== lastBarData) {
        if (chartBar) {
          chartBar.data.labels = (d2.meses && Array.isArray(d2.meses)) ? d2.meses : [];
          chartBar.data.datasets[0].data = (d2.valores && Array.isArray(d2.valores)) ? d2.valores : [];
          chartBar.update();
        } else {
          await criarGraficoBarras();
        }
        lastBarData = newBar;
      }
    } else {
      console.warn('/api/dashboard/gastos-mensais retornou', resp2.status);
    }
  } catch (err) {
    console.error('Erro ao atualizar gráficos:', err);
  } finally {
    isUpdating = false;
  }
}

// Inicia auto refresh (chama atualizar, mas apenas aplica quando houver alteração)
function startAutoRefresh(intervalMs = 300000) {
  stopAutoRefresh();
  console.debug('[graficos] startAutoRefresh', intervalMs);
  autoRefreshTimer = setInterval(() => {
    if (!isUpdating) atualizarGraficosDashboard().catch(err => console.error('Auto-refresh falhou:', err));
  }, intervalMs);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

export async function inicializarGraficosDashboard() {
  if (initialized) { console.debug('[graficos] inicializarGraficosDashboard: já inicializado — retornando'); return; }
  initialized = true;
  console.debug('[graficos] inicializarGraficosDashboard: inicializando gráficos');
  // cria os dois gráficos (em paralelo)
  await Promise.all([criarGraficoPizza(), criarGraficoBarras()]);
}

export { atualizarGraficosDashboard, startAutoRefresh, stopAutoRefresh };
