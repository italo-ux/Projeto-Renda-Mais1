document.addEventListener('DOMContentLoaded', async () => {
  const data = new Date();
  document.getElementById('mes').innerHTML = data.toLocaleString('default', { month: 'long' });
  document.getElementById('data').innerHTML = data.toLocaleDateString();

  let userId;
  let nomeUsuario;

  try {
    // 🔹 Pegar usuário logado
    const sessaoResp = await fetch("/api/usuario", { credentials: "include" });
    const sessaoData = await sessaoResp.json();

    if (!sessaoResp.ok || !sessaoData.id) {
      console.log("Usuário não logado");
      return;
    }

    userId = sessaoData.id;
    nomeUsuario = sessaoData.nome;
    document.getElementById('usuario-name').innerHTML = nomeUsuario;

    // 🔹 Verificar primeira visita
    const visitaResp = await fetch(`/api/primeira-visita`, { credentials: "include" });
    const visitaData = await visitaResp.json();

    if (visitaData.primeiraVisita) {
      const greeting = document.getElementById('firstVisitGreeting');
      if (greeting)
        greeting.innerText = `Bem-vindo pela primeira vez, ${nomeUsuario}! Antes de começar, conte um pouco sobre sua casa.`;

      const modalEl = document.getElementById('firstVisitModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const firstModal = new bootstrap.Modal(modalEl);
        firstModal.show();

        const saveBtn = document.getElementById('firstVisitSave');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const metaMensal = document.getElementById('metaMensal')?.value || '';
            const rendaMensal = document.getElementById('rendaMensal')?.value || '';

            const payload = { metaMensal, rendaMensal };

            try {
              const resp = await fetch('/api/primeira-visita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
              });

              const data = await resp.json();
              firstModal.hide();
              alert(data.mensagem || 'Informações salvas com sucesso!');
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

  // 🔹 Controle botão "começar"
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

  // 🔹 Adicionar despesa
  const btnAdicionar = document.getElementById("btnAdicionar");
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", async () => {
      const descricao = document.getElementById("descricao").value;
      const valor = document.getElementById("valor").value;
      const categoria = document.getElementById("categoria")?.value || "Outro";
      const data = document.getElementById("dataVencimento").value;

      const despesa = { descricao, valor, categoria, data };

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
          alert(result.mensagem || result.erro || "Erro ao adicionar despesa");
        } else {
          alert(result.mensagem || "Despesa adicionada com sucesso!");
          await pegarDespesas();
        }
      } catch (error) {
        console.error("Erro ao enviar despesa:", error);
        alert("Erro ao enviar despesa. Veja console do servidor.");
      }
    });
  }

  // 🔹 Pegar despesas
  async function pegarDespesas() {
    try {
      const response = await fetch("/api/despesas", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });

      if (!response.ok) throw new Error('Falha ao buscar despesas');

      const despesas = await response.json();
      const container = document.querySelector(".row.row-cols-1.g-4");
      if (!container) return;

      container.innerHTML = "";
      let totalPendente = 0;

      despesas.forEach(d => {
        const valorNum = Number(d.valor);
        const valorFmt = valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const card = document.createElement("div");
        card.className = "col";
        card.innerHTML = `
          <div class="conta p-1 text-left card shadow border-0 rounded-4 h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start flex-column flex-md-row">
                <div>
                  <h5>${d.descricao}</h5>
                  <small>${d.data ? new Date(d.data).toLocaleDateString("pt-BR") : '-'}</small>
                </div>
                <div class="text-end">
                  <div class="fw-bold">${valorFmt}</div>
                  <div>${d.categoria}</div>
                </div>
              </div>
            </div>
          </div>`;
        container.appendChild(card);
        totalPendente += valorNum;
      });

      document.getElementById("total-pendente").innerText =
        totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }

  await pegarDespesas();

  // 🔹 Logout
  const sair = document.getElementById('sair');
  if (sair) {
    sair.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      } catch (err) {
        console.error('Erro ao fazer logout:', err);
      } finally {
        window.location.href = '/login.html';
      }
    });
  }
});
