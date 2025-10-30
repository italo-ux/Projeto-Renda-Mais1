document.addEventListener('DOMContentLoaded', async () => {
  const data = new Date();
  document.getElementById('mes').innerHTML = data.toLocaleString('default', { month: 'long' });
  document.getElementById('data').innerHTML = data.toLocaleDateString();

  let userId;
  try {

    //Pegar usuário logado
    
    const sessaoResp = await fetch("/api/sessao", { credentials: "include" });
    const sessaoData = await sessaoResp.json();

    if (!sessaoData.userId) {
      console.log("Usuário não logado");
      return;
    }

    userId = sessaoData.userId;
    const nomeUsuario = sessaoData.nome;
    document.getElementById('usuario-name').innerHTML = nomeUsuario;


    //  Verificar primeira visita
  
    const visitaResp = await fetch(`/verificar-visita/${userId}`);
    const visitaData = await visitaResp.json();

    if (visitaData.primeiraVisita) {
      const greeting = document.getElementById('firstVisitGreeting');
      if (greeting) greeting.innerText = `Bem-vindo pela primeira vez, ${nomeUsuario}! Antes de começar, conte um pouco sobre sua casa.`;

      const modalEl = document.getElementById('firstVisitModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const firstModal = new bootstrap.Modal(modalEl);
        firstModal.show();

        const saveBtn = document.getElementById('firstVisitSave');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const descricao = document.getElementById('firstDescricao')?.value || '';
            const valor = document.getElementById('firstValor')?.value || '';
            const dataVencimento = document.getElementById('firstDataVencimento')?.value || '';
            const pessoas = document.getElementById('pessoasCasa')?.value || '';
            const rendaMensal = document.getElementById('rendaMensal')?.value || '';

            const payload = { userId, descricao, valor, dataVencimento, pessoas, rendaMensal };

            try {
              const resp = await fetch('/api/primeira-visita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
              });

              const data = await resp.json();
              firstModal.hide();
              alert(data.message || 'Informações salvas com sucesso!');
              setTimeout(() => window.location.reload(), 800);
            } catch (err) {
              console.error('Erro ao salvar primeira visita:', err);
              alert('Erro ao salvar. Tente novamente.');
            }
          }, { once: true });
        }
      } else {
        alert(`Bem-vindo pela primeira vez, ${nomeUsuario}!`);
      }
    } else {
      console.log("Usuário já visitou antes.");
    }

  } catch (err) {
    console.error("Erro ao carregar usuário ou verificar visita:", err);
  }

  
  // Controle botão "começar"
 
  const comecar = document.getElementById('comecar');
  const despesas = document.getElementById('formDespesa');
  const formulario = document.getElementById('formulario');

  if (comecar && despesas && formulario) {
    comecar.addEventListener('click', () => {
      despesas.classList.remove('d-none');
      formulario.classList.add('d-none');
      comecar.classList.add('d-none');
    });
  }

  
  //  Adicionar despesa
  
  const btnAdicionar = document.getElementById("btnAdicionar");
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", async () => {
      const descricao = document.getElementById("descricao").value;
      const valor = document.getElementById("valor").value;
      const dataVencimento = document.getElementById("dataVencimento").value;

      const despesa = { descricao, valor, dataVencimento };

      try {
        const response = await fetch("/api/despesas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(despesa),
        });

        const result = await response.json();
        if (!response.ok) {
          console.error("Erro /api/despesas:", result);
          alert(result.message || result.error || "Erro ao adicionar despesa");
        } else {
          alert(result.message || "Despesa adicionada com sucesso!");
          await pegarDespesas(); // atualiza lista automaticamente
        }
      } catch (error) {
        console.error("Erro ao enviar despesa:", error);
        alert("Erro ao enviar despesa. Veja console do servidor.");
      }
    });
  }


  //  Pegar despesas do usuário
  
 async function pegarDespesas() {
  try {
    const response = await fetch("/api/despesas", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });

    if (!response.ok) throw new Error('Falha ao buscar despesas');

    const despesas = await response.json();
    console.log("Despesas:", despesas);

    const container = document.querySelector(".row.row-cols-1.g-4");
    if (!container) return;

    container.innerHTML = "";

    let totalPendente = 0;
    let despesasPagas = 0;
    let despesasPendentes = 0;
    let proximas = 0;
    let distantes = 0;

    const hoje = new Date();

    despesas.forEach(d => {
      const card = document.createElement("div");
      card.className = "col";

      const valorNum = Number(d.valor);
      const valorFmt = Number.isNaN(valorNum)
        ? d.valor
        : valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      const dataVencimento = d.data_vencimento ? new Date(d.data_vencimento) : null;
      const dataFmt = dataVencimento ? dataVencimento.toLocaleDateString("pt-BR") : "-";

      // Status pago/pendente
      const estaPago = d.paga || false;

      if (!estaPago) {
        totalPendente += valorNum;
        despesasPendentes++;
      } else {
        despesasPagas++;
      }

      if (dataVencimento) {
        const diffDias = Math.ceil((dataVencimento - hoje) / (1000 * 60 * 60 * 24));
        if (!estaPago && diffDias <= 7 && diffDias >= 0) proximas++;
        if (!estaPago && diffDias > 7) distantes++;
      }

      card.innerHTML = `
        <div class="conta p-1 text-left card shadow border-0 rounded-4 h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start flex-column flex-md-row">
              <div>
                <h5>${d.descricao || "Sem descrição"}</h5>
                <small>${dataFmt}</small>
              </div>
              <div class="text-end">
                <div class="fw-bold">${valorFmt}</div>
                <div>${d.tipo_despesa || "Outro"}</div>
                <div class="d-flex gap-2 mt-3">
                  <button class="btn-paga btn btn-success btn-sm">${estaPago ? "Pago!" : "Conta Paga"}</button>
                  <button class="btn-excluir btn btn-outline-danger btn-sm">Excluir</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      container.appendChild(card);

      // Botões
      const btnPaga = card.querySelector(".btn-paga");
      btnPaga.addEventListener("click", () => {
        if (!estaPago) {
          btnPaga.disabled = true;
          btnPaga.innerText = "Pago!";
          card.classList.add("bg-light", "text-muted");
          // Atualiza resumo local
          totalPendente -= valorNum;
          despesasPagas++;
          despesasPendentes--;
          proximas = Math.max(0, proximas - 1);
          atualizarResumo();
        }
      });

      const btnExcluir = card.querySelector(".btn-excluir");
      btnExcluir.addEventListener("click", () => {
        if (confirm("Deseja realmente excluir essa despesa?")) {
          card.remove();
          // Atualiza resumo local
          if (!estaPago) {
            totalPendente -= valorNum;
            despesasPendentes--;
          } else {
            despesasPagas--;
          }
          atualizarResumo();
        }
      });
    });

    function atualizarResumo() {
      document.getElementById("total-pendente").innerText =
        totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      document.getElementById("despesas-quantidade").innerText = despesas.length;
      document.getElementById("despesas-pagas").innerText = despesasPagas;
      document.getElementById("pendentes").innerText = despesasPendentes;
      document.getElementById("Proximas").innerText = proximas;
      document.getElementById("distantes").innerText = distantes;
    }

    atualizarResumo();

  } catch (error) {
    console.error("Erro ao pegar despesas:", error);
  }
}

let rendaMensal = document.getElementById('rendaMensal').value = '';  
let saldo = document.getElementById('Saldo');
function atualizarSaldo() {
  const rendaNum = Number(String(rendaMensal).replace(',', '.'));
  const totalPendenteText = document.getElementById("total-pendente").innerText || 'R$ 0,00';
  const totalPendenteNum = Number(totalPendenteText.replace('R$', '').replace('.', '').replace(',', '.').trim());
  const saldoNum = rendaNum - totalPendenteNum;
  saldo.innerText = saldoNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}




document.addEventListener("DOMContentLoaded", pegarDespesas);
  await pegarDespesas();

  document.addEventListener("DOMContentLoaded", atualizarSaldo);
  atualizarSaldo();

  // =========================
  // 6️⃣ Logout
  // =========================
  const sair = document.getElementById('sair');
  if (sair) {
    sair.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/logout', { method: 'POST', credentials: 'include' });
      } catch (err) {
        console.error('Erro ao fazer logout:', err);
      } finally {
        window.location.href = '/login.html';
      }
    });
  }
});
