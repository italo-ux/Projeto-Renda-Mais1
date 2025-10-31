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
  let sessaoData = {}; // Inicializada para ser usada em todo o escopo


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
        window.location.href = "usuario.html";
      } catch (err) {
        console.error("Erro no login:", err);
        alert("Falha ao conectar com o servidor.");
      }
    });
  }


  // ================================
  // 📋 FUNÇÃO PARA PEGAR E MOSTRAR DESPESAS E SALDO
  // ================================
  async function pegarDespesas(userData) {
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
          </div>`;
        container.appendChild(card);
        totalPendente += valorNum;
      });

      const totalEl = document.getElementById("total-pendente");
      if (totalEl)
        totalEl.innerText = totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });


      // ====================================
      // 💰 CÁLCULO E EXIBIÇÃO DO SALDO
      // ====================================
      if (userData && userData.rendaMensal !== null) {
        const rendaMensal = Number(userData.rendaMensal);
        const saldo = rendaMensal - totalPendente;

        const saldoEl = document.getElementById("Saldo");
        if (saldoEl) {
          saldoEl.innerText = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

          // Adicionar estilo visual
          saldoEl.classList.remove('text-success', 'text-danger');
          if (saldo >= 0) {
            saldoEl.classList.add('text-success'); 
          } else {
            saldoEl.classList.add('text-danger'); 
          }
        }
      }

    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }


  // ================================
  // 👤 Sessão do usuário logado - INÍCIO DO FLUXO
  // ================================
  try {
    const sessaoResp = await fetch("/api/usuario", { credentials: "include" });
    sessaoData = await sessaoResp.json(); 

    if (!sessaoResp.ok || !sessaoData.id) {
      console.log("Usuário não logado");
      return; // Para a execução se o usuário não estiver logado
    }

    userId = sessaoData.id;
    nomeUsuario = sessaoData.nome;

    const usuarioNameEl = document.getElementById('usuario-name');
    if (usuarioNameEl) usuarioNameEl.innerHTML = nomeUsuario;

    // Chamada principal das despesas com sessaoData (para calcular saldo)
    await pegarDespesas(sessaoData); 

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
      if (modalEl) { 
        let firstModal;
        try {
          firstModal = new bootstrap.Modal(modalEl);
          firstModal.show();
        } catch (e) {
          console.error("Erro ao inicializar o modal do Bootstrap. Verifique se o JS do Bootstrap está carregado.", e);
          alert(`Bem-vindo pela primeira vez, ${nomeUsuario}! (Erro no Modal: ${e.message})`);
          return; 
        }

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
              
              // CORREÇÃO CRÍTICA: Atualiza sessaoData localmente para evitar que o modal reapareça
              sessaoData.metaMensal = metaMensal;
              sessaoData.rendaMensal = rendaMensal;
              
              setTimeout(() => window.location.reload(), 800); 
            } catch (err) {
              console.error('Erro ao salvar primeira visita:', err);
              alert('Erro ao salvar. Tente novamente.');
            }
          }, { once: true });
        }
      } else {
        console.log("Usuário já visitou antes.");
      }
    }
  } catch (err) {
    console.error("Erro ao carregar usuário ou verificar visita:", err);
  }
  // Fim da lógica de sessão


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
          // Recarrega a lista de despesas após o sucesso
          await pegarDespesas(sessaoData); 
        }
      } catch (error) {
        console.error("Erro ao enviar despesa:", error);
        alert("Erro ao enviar despesa. Veja console do servidor.");
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