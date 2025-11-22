// Exporta função para inicializar e atualizar os gráficos do dashboard

// Instâncias de chart mantidas para updates sem recriar tudo
let chartPie = null;
let chartBar = null;
let autoRefreshTimer = null;

async function criarGraficoPizza() {
  try {
    const res = await fetch('/api/dashboard/guardado-vs-gasto');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoPizza');
    if (!canvas) return;

    
    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) { }

    const style = getComputedStyle(document.documentElement);
    const colorGuardado = style.getPropertyValue('--renda-verde').trim() || '#6a994e';
    const colorGasto = style.getPropertyValue('--renda-vermelho').trim() || '#bc4749';

    chartPie = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Guardado', 'Gasto'],
        datasets: [{
          data: [dados.guardado ?? 0, dados.gasto ?? 0],
          backgroundColor: [colorGuardado, colorGasto], // cores das fatias
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        maintainAspectRatio: false, // respeita a altura CSS do canvas
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.label}: ${Number(ctx.raw).toLocaleString('pt-BR',{ style:'currency', currency:'BRL'})}`
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Erro ao criar gráfico de pizza:', err);
  }
}

async function criarGraficoBarras() {
  try {
    const res = await fetch('/api/dashboard/gastos-mensais');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoBarras');
    if (!canvas) return;

    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) {  }

    const style = getComputedStyle(document.documentElement);
    const c1 = style.getPropertyValue('--renda-verde').trim() || '#a7c957';
    const c2 = style.getPropertyValue('--renda-verde-escuro').trim() || '#235321';

    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0,0,0,300);
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
          borderColor: '#145c36',
          borderWidth: 1
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => Number(v).toLocaleString('pt-BR',{ style:'currency', currency:'BRL' })
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Erro ao criar gráfico de barras:', err);
  }
}

// Atualiza os dados dos charts existentes 
async function atualizarGraficosDashboard() {
  try {
    // Atualiza pie
    const resp1 = await fetch('/api/dashboard/guardado-vs-gasto');
    if (resp1.ok) {
      const d1 = await resp1.json();
      if (chartPie) {
        chartPie.data.datasets[0].data = [d1.guardado ?? 0, d1.gasto ?? 0];
        chartPie.update();
      } else {
        // cria se não existir
        await criarGraficoPizza();
      }
    } else {
      console.warn('/api/dashboard/guardado-vs-gasto retornou', resp1.status);
    }

    // Atualiza barras
    const resp2 = await fetch('/api/dashboard/gastos-mensais');
    if (resp2.ok) {
      const d2 = await resp2.json();
      if (chartBar) {
        chartBar.data.labels = Array.isArray(d2.meses) ? d2.meses : [];
        chartBar.data.datasets[0].data = Array.isArray(d2.valores) ? d2.valores : [];
        chartBar.update();
      } else {
        await criarGraficoBarras();
      }
    } else {
      console.warn('/api/dashboard/gastos-mensais retornou', resp2.status);
    }
  } catch (err) {
    console.error('Erro ao atualizar gráficos:', err);
  }
}

// Inicia auto refresh
function startAutoRefresh(intervalMs = 300000) { // padrão 5 minutos
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => {
    atualizarGraficosDashboard().catch(err => console.error('Auto-refresh falhou:', err));
  }, intervalMs);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

export async function inicializarGraficosDashboard() {
  // cria os dois gráficos (em paralelo)
  await Promise.all([criarGraficoPizza(), criarGraficoBarras()]);
}

export { atualizarGraficosDashboard, startAutoRefresh, stopAutoRefresh };
