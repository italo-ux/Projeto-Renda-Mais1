// js/components/graficos-dashboard.js
// Exporta função para inicializar os gráficos do dashboard

async function criarGraficoPizza() {
  try {
    const res = await fetch('/api/dashboard/guardado-vs-gasto');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();

    const canvas = document.getElementById('graficoPizza');
    if (!canvas) return;

    // destroy existing chart instance if present
    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) { /* ignore */ }

    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Guardado', 'Gasto'],
        datasets: [
          {
            data: [dados.guardado ?? 0, dados.gasto ?? 0]
          }
        ]
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

    try { const existing = Chart.getChart(canvas); if (existing) existing.destroy(); } catch (e) { /* ignore */ }

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: Array.isArray(dados.meses) ? dados.meses : [],
        datasets: [
          {
            label: 'Gastos',
            data: Array.isArray(dados.valores) ? dados.valores : []
          }
        ]
      }
    });
  } catch (err) {
    console.error('Erro ao criar gráfico de barras:', err);
  }
}

export async function inicializarGraficosDashboard() {
  // executa os dois gráficos (em paralelo)
  await Promise.all([criarGraficoPizza(), criarGraficoBarras()]);
}
