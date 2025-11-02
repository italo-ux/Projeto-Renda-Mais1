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

          if (resp.ok) {
            firstModal.hide();
            document.getElementById('firstVisitModal').remove();
          } else {
            const data = await resp.json();
            alert(data.erro || 'Erro ao salvar informações.');
          }
        } catch (err) {
          console.error('Erro:', err);
          alert('Erro ao conectar com o servidor.');
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

  // ================================
  // 📋 Pegar despesas (busca despesas + atualiza total e saldo)
  // ================================
  async function pegarDespesas() {
    try {
      const resp = await fetch("/api/despesas", { credentials: "include" });
      if (!resp.ok) throw new Error("Falha ao buscar despesas");
      const despesas = await resp.json();

      // container de despesas (se existir)
      const container = document.querySelector(".row.row-cols-1.g-4");
      if (container) {
        container.innerHTML = "";
        despesas.forEach(d => {
          const valorNum = Number(d.valor || 0);
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
                    <div class="fw-bold">${valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    <div>${d.categoria || ''}</div>
                  </div>
                </div>
              </div>
            </div>`;
          container.appendChild(card);
        });
      }

      // soma total das despesas
      const totalPendente = despesas.reduce((s, d) => s + Number(d.valor || 0), 0);
      const totalEl = document.getElementById("total-pendente");
      if (totalEl) totalEl.innerText = totalPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      // tenta obter renda atual do backend (garante que usamos valor atualizado)
      try {
        const userResp = await fetch("/api/usuario", { credentials: "include" });
        if (userResp.ok) {
          const userData = await userResp.json();
          if (userData.rendaMensal != null) rendaMensalLocal = Number(userData.rendaMensal);
        }
      } catch (e) {
        // manter rendaMensalLocal como estava
        console.warn("Não foi possível obter renda do backend:", e);
      }

      // calcula saldo = rendaMensalLocal - totalPendente (se renda definida)
      const saldoCalc = (rendaMensalLocal != null) ? (rendaMensalLocal - totalPendente) : (0 - totalPendente);
      const saldoText = saldoCalc.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

      // atualiza todos os elementos com id="Saldo" (compatibilidade com HTML atual)
      document.querySelectorAll('#Saldo').forEach(el => { el.innerText = saldoText; });

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
