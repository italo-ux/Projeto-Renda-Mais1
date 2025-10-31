document.addEventListener('DOMContentLoaded', async () => {
  // ================================
  // 🗓️  Atualizar data e mês no topo (se existir)
  // ================================
  const data = new Date();
  const mesEl = document.getElementById('mes');
  const dataEl = document.getElementById('data');
  if (mesEl) mesEl.innerHTML = data.toLocaleString('default', { month: 'long' });
  if (dataEl) dataEl.innerHTML = data.toLocaleDateString();

  let userId;
  let nomeUsuario;


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
        const resposta = await fetch("/api/login", { 
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

    const usuarioNameEl = document.getElementById('usuario-name');
    if (usuarioNameEl) usuarioNameEl.innerHTML = nomeUsuario;

    // ================================
    // 👋 Primeira visita
    // ================================
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
          // Limpa campos e atualiza a lista
          document.getElementById("descricao").value = '';
          document.getElementById("valor").value = '';
          document.getElementById("dataVencimento").value = '';
          await pegarDespesas();
        }
      } catch (error) {
        console.error("Erro ao enviar despesa:", error);
        alert("Erro ao enviar despesa. Veja console do servidor.");
      }
    });
  }

// ===================================================
// 🛠️ FUNÇÕES DE AÇÃO (Pagar, Excluir, Editar)
// ===================================================

// Função para atualizar o status/dados da despesa (PUT)
async function atualizarDespesa(id, camposParaAtualizar) {
    try {
        const response = await fetch(`/api/despesas/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(camposParaAtualizar),
        });

        const result = await response.json();
        if (!response.ok) {
            alert(result.mensagem || "Erro ao atualizar despesa.");
            console.error(result);
        } else {
            alert(result.mensagem || "Despesa atualizada com sucesso!");
            await pegarDespesas(); // Atualiza a lista
        }
    } catch (error) {
        console.error("Erro ao atualizar despesa:", error);
        alert("Erro de conexão ao atualizar despesa.");
    }
}

// Função para excluir a despesa (DELETE)
async function excluirDespesa(id) {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

    try {
        const response = await fetch(`/api/despesas/${id}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (!response.ok) {
            const result = await response.json();
            alert(result.mensagem || "Erro ao excluir despesa.");
            console.error(result);
        } else {
            alert("Despesa excluída com sucesso!");
            await pegarDespesas(); // Atualiza a lista
        }
    } catch (error) {
        console.error("Erro ao excluir despesa:", error);
        alert("Erro de conexão ao excluir despesa.");
    }
}

// Função para buscar dados da despesa e abrir o modal de edição
async function abrirModalEdicao(id) {
    try {
        // 1. Buscar dados da despesa
        const response = await fetch(`/api/despesas/${id}`);
        if (!response.ok) throw new Error('Falha ao buscar dados para edição.');

        const despesa = await response.json();

        // 2. Preencher o formulário/modal de edição (Assumindo IDs no HTML: edit_id, edit_descricao, etc.)
        const modalEl = document.getElementById('editExpenseModal');
        if (!modalEl || typeof bootstrap === 'undefined') {
             // Caso não tenha modal, alerta o usuário
             alert("Elemento de Modal de Edição não encontrado (editExpenseModal).");
             return;
        }

        document.getElementById('edit_id').value = despesa.id;
        document.getElementById('edit_descricao').value = despesa.descricao;
        document.getElementById('edit_valor').value = despesa.valor;
        document.getElementById('edit_categoria').value = despesa.categoria;
        
        // Formata a data para o formato yyyy-mm-dd para input type="date"
        document.getElementById('edit_dataVencimento').value = despesa.data ? new Date(despesa.data).toISOString().split('T')[0] : '';
        
        const editModal = new bootstrap.Modal(modalEl);
        editModal.show();

    } catch (error) {
        console.error("Erro ao abrir edição:", error);
        alert("Erro ao carregar dados da despesa para edição. Veja o console.");
    }
}
  

  // ================================
  // 📋 Pegar despesas E DELEGAÇÃO DE EVENTOS
  // ================================
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

      // Remove listeners antigos para evitar duplicação (boa prática antes de zerar o HTML)
      const containerClone = container.cloneNode(true);
      container.parentNode.replaceChild(containerClone, container);
      const newContainer = containerClone;

      newContainer.innerHTML = "";
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
                   <div class="d-flex gap-2 mt-3">
                       
                       </div>
                </div>
                <div class="text-end">
                  <div class="fw-bold">${valorFmt}</div>
                  <div>${d.categoria}</div>
                </div>
              </div>
            </div>
          </div>`;
        newContainer.appendChild(card);
        totalPendente += valorNum;
      });

      // --- DELEGAÇÃO DE EVENTOS ---
      newContainer.addEventListener('click', async (e) => {
          const target = e.target;
          const despesaId = target.dataset.id;
          
          if (!despesaId) return; 

          if (target.classList.contains('btn-paga')) {
              await atualizarDespesa(despesaId, { paga: true });
          } else if (target.classList.contains('btn-excluir')) {
              await excluirDespesa(despesaId);
          } else if (target.classList.contains('btn-editar')) {
              abrirModalEdicao(despesaId);
          }
        }, { once: true }); // Use { once: true } ou remova os clones se for usar addEventListener após recarga


      const totalEl = document.getElementById("total-pendente");
      if (totalEl)
        totalEl.innerText = totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }

  // Chama a função pela primeira vez
  await pegarDespesas();


  // ================================
  // ✏️ Listener para Salvar Edição
  // ================================
  const btnSalvarEdicao = document.getElementById("btnSalvarEdicao"); 
  if (btnSalvarEdicao) {
    btnSalvarEdicao.addEventListener("click", async () => {
      const id = document.getElementById("edit_id").value;
      const descricao = document.getElementById("edit_descricao").value;
      const valor = document.getElementById("edit_valor").value;
      const categoria = document.getElementById("edit_categoria")?.value || "Outro";
      const data = document.getElementById("edit_dataVencimento").value;

      // Objeto com todos os campos (será enviado via PUT)
      const despesaAtualizada = { descricao, valor, categoria, data };

      await atualizarDespesa(id, despesaAtualizada);
      
      // Esconder modal após salvar (se estiver usando Bootstrap)
      const modalEl = document.getElementById('editExpenseModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const editModal = bootstrap.Modal.getInstance(modalEl);
        if (editModal) editModal.hide();
      }
    });
  }


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