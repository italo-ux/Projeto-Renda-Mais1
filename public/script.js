document.addEventListener("DOMContentLoaded", async () => {
  
  //  Atualizar data e mês no topo (se existir)
  const data = new Date();
  const mesEl = document.getElementById("mes");
  const dataEl = document.getElementById("data");

  if (mesEl) mesEl.innerHTML = data.toLocaleString("default", { month: "long" });
  if (dataEl) dataEl.innerHTML = data.toLocaleDateString();

  let userId;
  let nomeUsuario;
  let rendaMensalLocal = null;
  let savedMoneyLocal = 0;

  //  CADASTRO DE USUÁRIO
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

  //  LOGIN DE USUÁRIO
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

  //  SESSÃO DO USUÁRIO LOGADO
  try {
    const sessaoResp = await fetch("/api/usuario", { credentials: "include" });
    const sessaoData = await sessaoResp.json();

    if (!sessaoResp.ok || !sessaoData.id) {
      console.log("Usuário não logado");
      return;
    }

    userId = sessaoData.id;
    nomeUsuario = sessaoData.nome;
    if (sessaoData.rendaMensal != null)
      rendaMensalLocal = Number(sessaoData.rendaMensal);
    if (sessaoData.guardado != null)
      savedMoneyLocal = Number(sessaoData.guardado) || 0;

    const usuarioNameEl = document.getElementById("usuario-name");
    if (usuarioNameEl) usuarioNameEl.innerHTML = nomeUsuario;

    
    //  PRIMEIRA VISITA (modal inicial)
    
    const visitaResp = await fetch(`/api/primeira-visita`, {
      credentials: "include",
    });
    const visitaData = await visitaResp.json();

    if (visitaData.primeiraVisita) {
      const modalEl = document.getElementById("firstVisitModal");
      if (modalEl && typeof bootstrap !== "undefined") {
        const firstModal = new bootstrap.Modal(modalEl);
        firstModal.show();

        const saveBtn = document.getElementById("firstVisitSave");
        if (saveBtn) {
          saveBtn.addEventListener("click", async () => {
            const metaMensal =
              document.getElementById("metaMensal")?.value || null;
            const rendaMensal =
              document.getElementById("rendaMensal")?.value || null;

            if (!metaMensal || !rendaMensal) {
              alert("Por favor, preencha todos os campos.");
              return;
            }

            try {
              const resp = await fetch("/api/primeira-visita", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  metaMensal: parseFloat(metaMensal),
                  rendaMensal: parseFloat(rendaMensal),
                }),
              });

              const data = await resp.json();

              if (resp.ok) {
                rendaMensalLocal = parseFloat(rendaMensal);
                firstModal.hide();

                const modalEl = document.getElementById("firstVisitModal");
                if (modalEl) {
                  modalEl.addEventListener("hidden.bs.modal", () => {
                    modalEl.remove();
                  });
                }

                await pegarDespesas();
              } else {
                throw new Error(data.erro || "Erro ao salvar informações");
              }
            } catch (err) {
              console.error("Erro ao salvar primeira visita:", err);
              alert(
                err.message ||
                  "Erro ao conectar com o servidor. Tente novamente."
              );
            }
          });
        }
      }
    }
  } catch (err) {
    console.error("Erro ao obter sessão do usuário:", err);
  }

  
  // CONTROLE BOTÃO "COMEÇAR"
   
  const comecar = document.getElementById("comecar");
  const despesas = document.getElementById("formDespesa");
  const formulario = document.getElementById("formulario");

  if (comecar && despesas && formulario) {
    comecar.addEventListener("click", () => {
      despesas.classList.remove("d-none");
      formulario.classList.add("d-none");
      comecar.classList.add("d-none");
    });
  }

  
  // ADICIONAR DESPESA
  const btnAdicionar = document.getElementById("btnAdicionar");
  if (btnAdicionar) {
    btnAdicionar.addEventListener("click", async () => {
      const descricao = document.getElementById("descricao").value;
      const valor = parseFloat(document.getElementById("valor").value);
      const categoria =
        document.getElementById("tipoDespesa")?.value || "Outro";
      const data = document.getElementById("dataVencimento").value;

      if (!descricao || !valor || isNaN(valor)) {
        alert("Por favor, preencha descrição e valor corretamente");
        return;
      }

      try {
        const editandoId = btnAdicionar.dataset.editando;
        const method = editandoId ? "PUT" : "POST";
        const url = editandoId
          ? `/api/despesas/${editandoId}`
          : "/api/despesas";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            descricao,
            valor,
            categoria,
            data,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.erro || "Erro ao salvar despesa");
        }

        // Limpar campos e resetar botão
        document.getElementById("descricao").value = "";
        document.getElementById("valor").value = "";
        document.getElementById("dataVencimento").value = "";
        document.getElementById("tipoDespesa").value = "variavel";
        btnAdicionar.textContent = "Adicionar Despesa";
        delete btnAdicionar.dataset.editando;

        bootstrap.Modal.getInstance(
          document.getElementById("Despesas-modal")
        ).hide();

        await pegarDespesas();
      } catch (error) {
        console.error("Erro ao salvar despesa:", error);
        alert(error.message);
      }
    });
  }

  
  // PEGAR DESPESAS (BUSCA E ATUALIZA TOTAIS)
  
  async function pegarDespesas() {
    try {
      const resp = await fetch("/api/despesas", { credentials: "include" });
      if (!resp.ok) throw new Error("Falha ao buscar despesas");
      const despesas = await resp.json();
    } catch (error) {
      console.error("Erro ao pegar despesas:", error);
    }
  }

  
  
  //  SALVAR DINHEIRO GUARDADO
  
  const btnSalvarGuardado = document.getElementById("btnSalvarGuardado");
  if (btnSalvarGuardado) {
    btnSalvarGuardado.addEventListener("click", async () => {
      const input = document.getElementById("valorGuardar");
      if (!input) return;

      const valor = parseFloat(input.value);
      if (!valor || isNaN(valor) || valor <= 0) {
        alert("Informe um valor válido maior que zero");
        return;
      }

      try {
        const novoTotal = (Number(savedMoneyLocal) || 0) + valor;
        const salvouNoBackend = await persistSavedBackend(novoTotal);

        if (salvouNoBackend) {
          updateSavedUI();
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("guardarDinheiroModal")
          );
          if (modal) modal.hide();
          input.value = "";
          await pegarDespesas();
        } else {
          throw new Error("Não foi possível salvar no servidor");
        }
      } catch (err) {
        alert("Erro ao guardar dinheiro: " + err.message);
      }
    });
  }

  //  INICIALIZAÇÃO 
  loadSavedLocalFallback();
  await pegarDespesas();
  await pegarMetas();
  setupAddMetaFlow();
  setupDelegation();
});
