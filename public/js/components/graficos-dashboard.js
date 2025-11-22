// Exporta função para inicializar os gráficos do dashboard

async function criarGraficoPizza() {
  try {
    const res = await fetch('/api/dashboard/guardado-vs-gasto');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoPizza');
    if (!canvas) return;

    
    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) { }

    const style = getComputedStyle(document.documentElement);
    // Mapeia para as variáveis da paleta do site
    const colorGuardado = style.getPropertyValue('--vclaro').trim() || '#6a994e';
    const colorGasto = style.getPropertyValue('--rojo').trim() || '#bc4749';

    new Chart(canvas, {
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
    // degradê usando as variáveis da paleta
    const c1 = style.getPropertyValue('--vyellow').trim() || '#a7c957';
    const c2 = style.getPropertyValue('--vescuro').trim() || '#235321';

    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0,0,0,300);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dados.meses || [],
        datasets: [{
          label: 'Gastos',
          data: dados.valores || [],
          backgroundColor: grad, // gradiente
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

export async function inicializarGraficosDashboard() {
  const container = document.getElementById('container-graficos');
  if (container) container.style.display = '';
  // executa os dois gráficos (em paralelo)
  await Promise.all([criarGraficoPizza(), criarGraficoBarras()]);
}

// inicialmente oculta container (se presente) — será exibido quando despesa for adicionada
const _containerEl = document.getElementById('container-graficos');
if (_containerEl) _containerEl.style.display = 'none';

// Ouve evento para inicializar quando uma despesa for adicionada
window.addEventListener('despesa:added', async () => {
  try {
    console.debug('[graficos] evento despesa:added recebido — inicializando gráficos');
    await inicializarGraficosDashboard();
  } catch (e) {
    console.error('Erro ao inicializar gráficos a partir do evento despesa:added', e);
  }
});
