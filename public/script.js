document.addEventListener('DOMContentLoaded', async () => {
  // ================================
  // 🗓️  Atualizar data e mês no topo (se existir)
  // ================================
  const data = new Date();
  const mesEl = document.getElementById('mes');
  const dataEl = document.getElementById('data');
  if (mesEl) mesEl.innerHTML = data.toLocaleString('default', { month: 'long' });
  if (dataEl) dataEl.innerHTML = data.toLocaleDateString();

  let userId;
  let nomeUsuario;
  let rendaMensalLocal = null; // <-- nova variável que guarda a renda mensal do usuário

  // ================================
  // 🧾 Cadastro de usuário
  // ================================
  const form = document.querySelector("form");
  if (form && form.id === "form-registro") {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const senha = document.getElementById("password").value;

      try {
        const resposta = await fetch("/api/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome, email, senha }),
        });

        const data = await resposta.json();

        if (!resposta.ok) {
          alert(data.erro || "Erro ao cadastrar.");
          return;
        }

        alert("Usuário cadastrado com sucesso!");
        window.location.href = "login.html";
      } catch (err) {
        console.error("Erro:", err);
        alert("Falha ao conectar com o servidor.");
      }
    });
  }


  
// ================================
  // 👤 Login de usuário
  // ================================
  const loginForm = document.querySelector("#form-login");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("Email").value;
      const senha = document.getElementById("Senha").value;

      try {
        const resposta = await fetch("/api/login", { // Garanta que está usando /api/login
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, senha }),
        });

        const data = await resposta.json();

        if (!resposta.ok) {
          alert(data.erro || "Erro ao fazer login.");
          return;
        }

        alert("Login realizado com sucesso!");
        window.location.href = "usuario.html"; // Redireciona para a página do usuário
      } catch (err) {
        console.error("Erro no login:", err);
        alert("Falha ao conectar com o servidor.");
      }
    });
  }






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
    // guarda a renda vinda do backend (se estiver presente na resposta da sessão)
    if (sessaoData.rendaMensal != null) rendaMensalLocal = Number(sessaoData.rendaMensal);
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
          alert('Por favor, preencha todos os campos.');
          return;
        }

        try {
          const resp = await fetch('/api/primeira-visita', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
              metaMensal: parseFloat(metaMensal), 
              rendaMensal: parseFloat(rendaMensal) 
            }),
          });

          const data = await resp.json();

          if (resp.ok) {
            // Atualiza a renda local
            rendaMensalLocal = parseFloat(rendaMensal);
            
            // Fecha o modal de forma segura
            firstModal.hide();
            
            // Remove o modal do DOM de forma segura
            const modalEl = document.getElementById('firstVisitModal');
            if (modalEl) {
              modalEl.addEventListener('hidden.bs.modal', () => {
                modalEl.remove();
              });
            }

            // Atualiza os valores na tela
            await pegarDespesas();
          } else {
            throw new Error(data.erro || 'Erro ao salvar informações');
          }
        } catch (err) {
          console.error('Erro ao salvar primeira visita:', err);
          alert(err.message || 'Erro ao conectar com o servidor. Tente novamente.');
        }
      });
    }
  }
}
    } catch (err) {
    console.error("Erro ao obter sessão do usuário:", err);
  }
  // ================================
  // ▶️ Controle botão "começar"
  // ================================
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

  // ================================
  // 💸 Adicionar despesa
  // ================================
  const btnAdicionar = document.getElementById("btnAdicionar");
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", async () => {
      const descricao = document.getElementById("descricao").value;
      const valor = parseFloat(document.getElementById("valor").value);
      const categoria = document.getElementById("tipoDespesa")?.value || "Outro";
      const data = document.getElementById("dataVencimento").value;

      if (!descricao || !valor || isNaN(valor)) {
        alert("Por favor, preencha descrição e valor corretamente");
        return;
      }

      try {
        const editandoId = btnAdicionar.dataset.editando;
        const method = editandoId ? 'PUT' : 'POST';
        const url = editandoId ? `/api/despesas/${editandoId}` : '/api/despesas';

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descricao,
            valor,
            categoria,
            data
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.erro || 'Erro ao salvar despesa');
        }

        // Limpa campos e reseta botão
        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("dataVencimento").value = "";
        document.getElementById("tipoDespesa").value = "variavel";
        btnAdicionar.textContent = "Adicionar Despesa";
        delete btnAdicionar.dataset.editando;

        // Fecha modal
        bootstrap.Modal.getInstance(document.getElementById('Despesas-modal')).hide();

        // Atualiza lista
        await pegarDespesas();

      } catch (error) {
        console.error("Erro ao salvar despesa:", error);
        alert(error.message);
      }
    });
  }

  // ================================
  // 📋 Pegar despesas (busca despesas + atualiza total e saldo)
  // ================================
  async function pegarDespesas() {
    try {
      const resp = await fetch("/api/despesas", { credentials: "include" });
      if (!resp.ok) throw new Error("Falha ao buscar despesas");
      const despesas = await resp.json();

      const container = document.querySelector(".row.row-cols-1.g-4");
      if (container) {
        container.innerHTML = "";
        
        // Separar despesas pagas e pendentes
        let totalPago = 0;
        let totalPendente = 0;

        despesas.forEach(d => {
          const valorNum = Number(d.valor || 0);
          // Soma ao total apropriado
          if (d.pago) {
            totalPago += valorNum;
          } else {
            totalPendente += valorNum;
          }

          const card = document.createElement("div");
          card.className = "col";
          card.innerHTML = `
            <div class="conta p-1 text-left card shadow border-0 rounded-4 h-100 ${d.pago ? 'bg-light' : ''}">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start flex-column flex-md-row">
                  <div>
                    <h5>${d.descricao}</h5>
                    <small>${d.data ? new Date(d.data).toLocaleDateString("pt-BR") : '-'}</small>
                  </div>
                  <div class="text-end">
                    <div class="fw-bold">${valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    <div>${d.categoria || ''}</div>
                    <div class="btn-group mt-2">
                      <button class="btn btn-sm ${d.pago ? 'btn-success' : 'btn-outline-success'} btn-pagar" data-id="${d.id}">
                        ${d.pago ? 'Pago ✓' : 'Pagar'}
                      </button>
                      <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${d.id}" ${d.pago ? 'disabled' : ''}>
                        Editar
                      </button>
                      <button class="btn btn-sm btn-outline-danger btn-excluir" data-id="${d.id}">
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>`;

          // Adicionar event listeners
          const btnPagar = card.querySelector('.btn-pagar');
          const btnEditar = card.querySelector('.btn-editar');
          const btnExcluir = card.querySelector('.btn-excluir');

          btnPagar.addEventListener('click', () => pagarDespesa(d.id));
          btnEditar.addEventListener('click', () => editarDespesa(d));
          btnExcluir.addEventListener('click', () => excluirDespesa(d.id));

          container.appendChild(card);
        });

        // Atualiza total pendente
        const totalEl = document.getElementById("total-pendente");
        if (totalEl) {
          totalEl.innerText = totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        }

        // Tenta obter renda atual do backend
        try {
          const userResp = await fetch("/api/usuario", { credentials: "include" });
          if (userResp.ok) {
            const userData = await userResp.json();
            if (userData.rendaMensal != null) rendaMensalLocal = Number(userData.rendaMensal);
          }
        } catch (e) {
          console.warn("Não foi possível obter renda do backend:", e);
        }

        // Calcula saldo = rendaMensal - apenas despesas PAGAS
        const saldoCalc = (rendaMensalLocal != null) ? (rendaMensalLocal - totalPago) : (0 - totalPago);
        const saldoText = saldoCalc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        // Atualiza elementos de saldo
        document.querySelectorAll('#Saldo').forEach(el => { 
          el.innerText = saldoText;
        });
      }
    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }

  // Função de pagar despesa atualizada
  async function pagarDespesa(id) {
    if (!confirm('Confirma o pagamento desta despesa? Isso irá atualizar seu saldo.')) return;

    try {
      const resp = await fetch(`/api/despesas/${id}/pagar`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!resp.ok) throw new Error('Falha ao pagar despesa');
      
      // Recarrega despesas e atualiza saldo
      await pegarDespesas();
    } catch (err) {
      console.error('Erro ao pagar despesa:', err);
      alert('Erro ao pagar despesa');
    }
  }

  async function editarDespesa(despesa) {
    // Preenche modal com dados atuais
    document.getElementById('descricao').value = despesa.descricao;
    document.getElementById('valor').value = despesa.valor;
    document.getElementById('dataVencimento').value = despesa.data;
    document.getElementById('tipoDespesa').value = despesa.categoria;

    // Modifica o botão Adicionar para Salvar
    const btnAdicionar = document.getElementById('btnAdicionar');
    btnAdicionar.textContent = 'Salvar Alterações';
    btnAdicionar.dataset.editando = despesa.id;

    // Abre o modal
    const modal = new bootstrap.Modal(document.getElementById('Despesas-modal'));
    modal.show();
  }

  async function excluirDespesa(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    try {
      const resp = await fetch(`/api/despesas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!resp.ok) throw new Error('Falha ao excluir despesa');
      
      // Recarrega despesas e atualiza saldo
      await pegarDespesas();
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
      alert('Erro ao excluir despesa');
    }
  }
});
