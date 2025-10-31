document.addEventListener('DOMContentLoaded', async () => {
  // ================================
  // 🗓️ Atualizar data e mês no topo
  // ================================
  const data = new Date();
  const mesEl = document.getElementById('mes');
  const dataEl = document.getElementById('data');
  if (mesEl) mesEl.innerHTML = data.toLocaleString('default', { month: 'long' });
  if (dataEl) dataEl.innerHTML = data.toLocaleDateString();

  let userId;
  let nomeUsuario;

  // ================================
  // 👤 Sessão do usuário logado
  // ================================
  try {
    const sessaoResp = await fetch("/api/usuario", { credentials: "include" });
    const sessaoData = await sessaoResp.json();

    if (!sessaoResp.ok || !sessaoData.id) {
      console.log("Usuário não logado");
      return;
    }

    userId = sessaoData.id;
    nomeUsuario = sessaoData.nome;

    const usuarioNameEl = document.getElementById('usuario-name');
    if (usuarioNameEl) usuarioNameEl.innerHTML = nomeUsuario;

    // ================================
    // 👋 Primeira visita
    // ================================
    const visitaResp = await fetch(`/api/primeira-visita`, { credentials: "include" });
    const visitaData = await visitaResp.json();

    if (visitaData.primeiraVisita) {
      const modalEl = document.getElementById('firstVisitModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const firstModal = new bootstrap.Modal(modalEl);
        firstModal.show();

        const saveBtn = document.getElementById('firstVisitSave');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const metaMensal = document.getElementById('metaMensal')?.value;
            const rendaMensal = document.getElementById('rendaMensal')?.value;

            if (!metaMensal || !rendaMensal) {
              alert('Preencha os campos corretamente.');
              return;
            }

            try {
              // 1️⃣ Salva meta mensal e renda
              const resp = await fetch('/api/primeira-visita', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ metaMensal, rendaMensal }),
              });
              await resp.json();

              // 2️⃣ Pega campos da primeira despesa do modal
              const descricao = document.getElementById('tituloDespesa')?.value;
              const valor = document.getElementById('firstValor')?.value;
              const categoria = document.getElementById('firstDescricao')?.value || "Primeira Visita";
              const dataVencimento = document.getElementById('firstDataVencimento')?.value;

              // 3️⃣ Adiciona a despesa se os campos estiverem preenchidos
              if (descricao && valor) {
                await fetch('/api/despesas', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    descricao,
                    valor,
                    categoria,
                    data: dataVencimento
                  }),
                });
              }

              // 4️⃣ Fecha modal e recarrega
              firstModal.hide();
              alert('Informações e primeira despesa salvas!');
              setTimeout(() => window.location.reload(), 800);

            } catch (err) {
              console.error('Erro ao salvar primeira visita ou despesa:', err);
              alert('Erro ao salvar. Tente novamente.');
            }
          }, { once: true });
        }
      } else {
        alert(`Bem-vindo pela primeira vez, ${nomeUsuario}!`);
      }
    }
  } catch (err) {
    console.error("Erro ao obter sessão do usuário:", err);
  }

  // ================================
  // 💸 Funções de despesa existentes
  // ================================
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

      const totalEl = document.getElementById("total-pendente");
      if (totalEl)
        totalEl.innerText = totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }

  await pegarDespesas();

  // ================================
  // 🚪 Logout
  // ================================
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
