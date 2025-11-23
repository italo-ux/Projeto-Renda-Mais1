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

// Garante que o container esteja visível como quando o componente foi inserido
const _containerEl = document.getElementById('container-graficos');
if (_containerEl) _containerEl.style.display = '';

// Cria um botão 'Atualizar gráfico' abaixo do container (escondido por padrão).
// O botão só aparecerá quando uma despesa for adicionada. Não há atualização automática.
(function setupAtualizarButton() {
  const container = document.getElementById('container-graficos');
  if (!container) return;

  let btn = document.getElementById('btn-atualizar-grafico');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-atualizar-grafico';
    btn.textContent = 'Atualizar gráfico';
    btn.style.display = 'none';
    btn.className = 'btn btn-sm btn-primary mt-2';
    container.insertAdjacentElement('afterend', btn);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await inicializarGraficosDashboard();
      } catch (e) {
        console.error('Erro ao atualizar gráficos:', e);
      } finally {
        btn.disabled = false;
        // ocultar o botão após atualização
        btn.style.display = 'none';
      }
    });
  }

  // Mostra apenas o botão quando uma despesa for adicionada (não atualiza automaticamente)
  window.addEventListener('despesa:added', () => {
    try {
      btn.style.display = '';
    } catch (e) {
      console.error('Erro ao mostrar botão atualizar gráfico:', e);
    }
  });
})();
