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

  // ================================
  // 🎯 Metas
  // ================================
  async function pegarMetas() {
    const metasContainer = document.getElementById('metasContainer');
    if (!metasContainer) return;
    try {
      const resp = await fetch('/api/metas', { credentials: 'include' });
      if (!resp.ok) throw new Error('Falha ao buscar metas');
      const metas = await resp.json();

      metasContainer.innerHTML = '';
      // contador
      let concluidas = 0, pendentes = 0;
      metas.forEach(m => {
        const isConcluida = Boolean(m.concluida);
        if (isConcluida) concluidas++; else pendentes++;
        const col = document.createElement('div');
        col.className = 'col-12 col-md-4';
        col.innerHTML = `
          <div class="card card-meta h-100 shadow border-0" data-id="${m.id}">
            <div class="card-body d-flex flex-column position-relative">
              <div class="position-absolute top-0 end-0 m-2">
                <div class="dropdown">
                  <button class="btn btn-dots-lg" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-id="${m.id}">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  <div class="dropdown-menu dropdown-menu-end p-2">
                    <button class="btn dropdown-item action-concluir w-100 mb-1" data-id="${m.id}">${isConcluida ? 'Concluída' : 'Concluir'}</button>
                    <button class="btn dropdown-item action-editar w-100 mb-1" data-id="${m.id}" type="button">Editar</button>
                    <button class="btn dropdown-item action-remover w-100 text-danger" data-id="${m.id}" type="button">Remover</button>
                  </div>
                </div>
              </div>

              <h5 class="card-title">${m.titulo}</h5>
              <p class="card-text">${m.descricao || ''}</p>
              <p class="mt-auto">Guardado: ${formatBRL(m.guardado)}</p>
              <p>Meta: ${formatBRL(m.valor)}</p>
            </div>
          </div>
        `;
        metasContainer.appendChild(col);
      });

      const metasConcluidas = document.getElementById('metasConcluidas');
      if (metasConcluidas) metasConcluidas.textContent = String(concluidas);
      const metasPendentes = document.getElementById('metasPendentes');
      if (metasPendentes) metasPendentes.textContent = String(pendentes);
      const totalMetas = document.getElementById('totalMetas');
      if (totalMetas) totalMetas.textContent = String(metas.length);

    } catch (err) {
      console.error('Erro ao obter metas:', err);
    }
  }

// nova função para abrir modal de meta por id
  async function openMetaModal(id) {
    try {
      // tenta achar dados no DOM primeiro (ex.: card com data-id)
      const card = document.querySelector(`.card[data-id="${id}"]`);
      if (card) {
        const titulo = card.querySelector('.card-title')?.textContent?.trim() || '—';
        const desc = card.querySelector('.card-text')?.textContent?.trim() || '—';
        const guardado = card.querySelector('p.mt-auto')?.textContent?.replace('Guardado:','').trim() || 'R$ 0,00';
        const meta = card.querySelectorAll('p')[3] ? card.querySelectorAll('p')[3].textContent.replace('Meta:','').trim() : '';
        document.getElementById('metaDetalhesTitulo').textContent = titulo;
        document.getElementById('metaDetalhesDescricao').textContent = desc;
        document.getElementById('metaDetalhesGuardado').textContent = guardado;
        if (meta) document.getElementById('metaDetalhesValor').textContent = meta;
      }

      // tentar obter dados mais completos do backend (se existir rota)
      try {
        const resp = await fetch(`/api/metas/${id}`, { credentials: 'include' });
        if (resp.ok) {
          const m = await resp.json();
          if (m.titulo) document.getElementById('metaDetalhesTitulo').textContent = m.titulo;
          if (m.descricao != null) document.getElementById('metaDetalhesDescricao').textContent = m.descricao || '—';
          if (m.guardado != null) document.getElementById('metaDetalhesGuardado').textContent = formatBRL(m.guardado);
          if (m.valor != null) document.getElementById('metaDetalhesValor').textContent = formatBRL(m.valor);
          if (m.dataPrevista) document.getElementById('metaDetalhesData').textContent = new Date(m.dataPrevista).toLocaleDateString('pt-BR');
          document.getElementById('metaDetalhesStatus').textContent = m.concluida ? 'Concluída' : 'Pendente';
        }
      } catch (e) {
        // ok — continuar com dados do DOM se backend indisponível
      }

      // abre modal
      const modalEl = document.getElementById('metaDetalhesModal');
      if (modalEl && typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      }
    } catch (err) {
      console.error('Erro ao abrir modal de meta:', err);
    }
  }

// extensão em delegation para abrir modal ao clicar no card (ignora clicks no dropdown)
  function setupDelegation() {
    // ...existing code...
    const metasContainer = document.getElementById('metasContainer');
    if (metasContainer) {
      metasContainer.addEventListener('click', (e) => {
        // se clicou dentro do dropdown/menu, ignore (menu já tem handlers)
        if (e.target.closest('.dropdown')) return;

        const card = e.target.closest('.card');
        if (!card) return;
        const id = card.dataset.id || card.querySelector('[data-id]')?.dataset.id;
        if (id) openMetaModal(id);
      });
    }
    // ...existing code...
  }

  // ================================
  // ► Modal + criação dinâmica de Metas
  // ================================
  function ensureAddMetaModal() {
    if (document.getElementById('addMetaModal')) return;
    const html = `
      <div class="modal fade" id="addMetaModal" tabindex="-1" aria-labelledby="addMetaModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="addMetaModalLabel">Adicionar Meta</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Título</label>
                <input id="metaTitulo" class="form-control" type="text" placeholder="Ex: Viagem" />
              </div>
              <div class="mb-3">
                <label class="form-label">Descrição</label>
                <textarea id="metaDescricao" class="form-control" rows="2" placeholder="Descrição opcional"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label">Valor da meta (R$)</label>
                <input id="metaValor" class="form-control" type="number" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div class="mb-3">
                <label class="form-label">Já guardado (R$)</label>
                <input id="metaGuardado" class="form-control" type="number" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div class="mb-3">
                <label class="form-label">Data prevista</label>
                <input id="metaData" class="form-control" type="date" />
              </div>
            </div>
            <div class="modal-footer">
              <button id="addMetaCancel" type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button id="addMetaSave" type="button" class="btn btn-success">Adicionar Meta</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function createMetaCardDOM(m) {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-4';
    col.innerHTML = `
      <div class="card card-meta h-100 shadow border-0" data-id="${m.id}">
        <div class="card-body d-flex flex-column position-relative">
          <div class="position-absolute top-0 end-0 m-2">
            <div class="dropdown">
              <button class="btn btn-dots-lg" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-id="${m.id}">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <div class="dropdown-menu dropdown-menu-end p-2">
                <button class="btn dropdown-item action-concluir w-100 mb-1" data-id="${m.id}" type="button">${m.concluida ? 'Concluída' : 'Concluir'}</button>
                <button class="btn dropdown-item action-editar w-100 mb-1" data-id="${m.id}" type="button" ${m.concluida ? 'disabled' : ''}>Editar</button>
                <button class="btn dropdown-item action-remover w-100 text-danger" data-id="${m.id}" type="button">Remover</button>
              </div>
            </div>
          </div>

          <h5 class="card-title">${escapeHtml(m.titulo)}</h5>
          <p class="card-text">${escapeHtml(m.descricao || '')}</p>
          <p class="mt-auto">Guardado: ${formatBRL(m.guardado)}</p>
          <p>Meta: ${formatBRL(m.valor)}</p>
        </div>
      </div>
    `;
    return col;
  }

  // atualiza contadores a partir do DOM das metas
  function refreshMetaCounters() {
    const metas = Array.from(document.querySelectorAll('#metasContainer .card[data-id]'));
    const total = metas.length;
    const concluidas = metas.filter(c => {
      const btn = c.querySelector('.action-concluir');
      return btn && (btn.textContent || '').trim().toLowerCase().includes('concluída');
    }).length;
    const pendentes = total - concluidas;

    const metasConcluidas = document.getElementById('metasConcluidas');
    if (metasConcluidas) metasConcluidas.textContent = String(concluidas);
    const metasPendentes = document.getElementById('metasPendentes');
    if (metasPendentes) metasPendentes.textContent = String(pendentes);
    const totalMetas = document.getElementById('totalMetas');
    if (totalMetas) totalMetas.textContent = String(total);
  }

  // inclui meta no DOM e tenta persistir no backend (se existir rota)
  async function addMeta(meta) {
    const metasContainer = document.getElementById('metasContainer');
    if (!metasContainer) return;

    // tenta enviar ao backend — se falhar, apenas adiciona client-side
    try {
      const resp = await fetch('/api/metas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta)
      });
      if (resp.ok) {
        const data = await resp.json().catch(()=>({}));
        // backend pode retornar id — use se houver
        if (data.id) meta.id = data.id;
      }
    } catch (e) {
      // rota não disponível ou falha — continuar client-side
      console.warn('Não foi possível persistir meta no backend, adicionando localmente:', e);
    }

    const card = createMetaCardDOM(meta);
    metasContainer.prepend(card); // adiciona no topo
    refreshMetaCounters();
  }

  // ================================
  //  🌟 CORREÇÃO ESTÁ AQUI 🌟
  // ================================
  function setupAddMetaFlow() {
    // O 'DOMContentLoaded' aninhado foi REMOVIDO daqui.

    const btnAddMeta = document.getElementById('btn-adicionar-meta');
    const modalEl = document.getElementById('addMetaModal');
    
    if (!btnAddMeta || !modalEl) {
      // Não exibe erro se os elementos não existirem (ex: estar na pagina usuario.html)
      return;
    }

    // Criar instância do modal uma única vez
    const modal = new bootstrap.Modal(modalEl);

    // Listener do botão
    btnAddMeta.addEventListener('click', () => {
      try {
        modal.show();
      } catch (err) {
        console.error('Erro ao abrir modal:', err);
      }
    });

    // Listener do salvar
    const btnSave = document.getElementById('addMetaSave');
    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const titulo = document.getElementById('metaTitulo')?.value?.trim();
        const descricao = document.getElementById('metaDescricao')?.value?.trim();
        const valor = parseFloat(document.getElementById('metaValor')?.value) || 0;
        const guardado = parseFloat(document.getElementById('metaGuardado')?.value) || 0;
        const dataPrevista = document.getElementById('metaData')?.value;

        if (!titulo) {
          alert('Por favor, informe o título da meta');
          return;
        }

        try {
          const resp = await fetch('/api/metas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              titulo,
              descricao,
              valor,
              guardado,
              dataPrevista
            })
          });

          if (!resp.ok) {
            const data = await resp.json();
            throw new Error(data.erro || 'Erro ao salvar meta');
          }

          // Limpar campos
          document.getElementById('metaTitulo').value = '';
          document.getElementById('metaDescricao').value = '';
          document.getElementById('metaValor').value = '';
          document.getElementById('metaGuardado').value = '';
          document.getElementById('metaData').value = '';

          // Fechar modal
          const modal = bootstrap.Modal.getInstance(modalEl);
          if (modal) modal.hide();

          // Recarregar metas
          await pegarMetas();

        } catch (err) {
          console.error('Erro ao salvar meta:', err);
          alert(err.message || 'Erro ao salvar meta');
        }
      });
    }
  }

  // pequeno helper para escapar texto em innerHTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#39;');
  }
  
  // Helper para formatar BRL (caso não exista)
  function formatBRL(value) {
    if (value == null) return 'R$ 0,00';
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }


  // Inicializa
  await pegarDespesas();
  await pegarMetas();
  
  // Chama as funções que dependem do DOM (agora sem o listener aninhado)
  setupAddMetaFlow();
  setupDelegation();
});