const {
  useState,
  useEffect
} = React;
const API_PREFIX = "/api";
const IconDumbbell = props => /*#__PURE__*/React.createElement("svg", {
  className: props.className || "w-6 h-6",
  fill: "none",
  stroke: "currentColor",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M6.5 6.5h11M6.5 17.5h11M4 9v6m16-6v6M8 4v16m8-4V4"
}));
const IconPlus = () => /*#__PURE__*/React.createElement("svg", {
  className: "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M12 4v16m8-8H4"
}));
const IconActivity = () => /*#__PURE__*/React.createElement("svg", {
  className: "w-5 h-5",
  fill: "none",
  stroke: "currentColor",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M13 10V3L4 14h7v7l9-11h-7z"
}));
const IconTrash = () => /*#__PURE__*/React.createElement("svg", {
  className: "w-4 h-4",
  fill: "none",
  stroke: "currentColor",
  viewBox: "0 0 24 24"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
}));
const IconClose = () => /*#__PURE__*/React.createElement("svg", {
  className: "w-5 h-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M6 18L18 6M6 6l12 12"
}));
const IconZoom = () => /*#__PURE__*/React.createElement("svg", {
  className: "w-6 h-6",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor"
}, /*#__PURE__*/React.createElement("path", {
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2",
  d: "M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.35 4.35a7.5 7.5 0 0012.3 12.3z M10.5 7.5v6m-3-3h6"
}));
const Toast = ({
  message,
  type,
  onClose
}) => {
  if (!message) return null;
  const bg = type === "error" ? "bg-coral-500/95" : "bg-lime-500/95";
  const txt = type === "error" ? "text-white" : "text-ink-950";
  return /*#__PURE__*/React.createElement("div", {
    className: `fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[60] ${bg} ${txt} px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-4 font-medium fade-enter`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, message), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "font-bold ml-2 opacity-70 hover:opacity-100"
  }, "✕"));
};

// Converte ids/urls em fontes incorporáveis (aceita ids/urls do youtube, mp4/webm/ogg, gif/jpg/png)
function toEmbedUrl(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (!s) return null;
  // id "puro" do youtube (11 caracteres)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return `https://www.youtube.com/embed/${s}`;
  // link curto youtu.be
  let m = s.match(/(?:youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // formato watch?v=
  m = s.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  // já é um link de embed
  if (s.includes("youtube.com/embed")) return s.startsWith("http") ? s : "https://" + s;
  // arquivos de vídeo diretos
  if (s.match(/\.(mp4|webm|ogg)(\?|$)/i)) return s.startsWith("http") ? s : "https://" + s;
  // imagem / gif
  if (s.match(/\.(gif|jpe?g|png|webp)(\?|$)/i)) return s.startsWith("http") ? s : "https://" + s;
  // link http genérico
  if (s.startsWith("http")) return s;
  return null;
}

// DemoMedia: renderiza a mídia dentro do card e aciona a abertura em tela cheia via onOpen(url, type)
const DemoMedia = ({
  url,
  onOpen,
  compact
}) => {
  if (!url) return null;
  const embed = toEmbedUrl(url);
  const sizeClass = compact ? "w-full md:w-[26rem] h-52 sm:h-64" : "w-full md:w-[34rem] h-60 sm:h-80";
  if (!embed) {
    const finalUrl = url.startsWith("http") ? url : "https://" + url;
    return /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-lime-400 underline"
    }, /*#__PURE__*/React.createElement("a", {
      href: finalUrl,
      target: "_blank",
      rel: "noreferrer"
    }, "Abrir demonstração ↗"));
  }
  // Embed do YouTube — player em alta resolução
  if (embed.includes("youtube.com/embed")) {
    return /*#__PURE__*/React.createElement("div", {
      className: `mt-2 ${sizeClass} rounded-xl overflow-hidden border border-ink-700 shadow-glow`
    }, /*#__PURE__*/React.createElement("iframe", {
      className: "w-full h-full",
      src: `${embed}?rel=0&modestbranding=1&vq=hd1080`,
      title: "Demonstração",
      frameBorder: "0",
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
      allowFullScreen: true
    }));
  }
  // Arquivo de vídeo direto
  if (embed.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return /*#__PURE__*/React.createElement("div", {
      className: `mt-2 ${sizeClass} rounded-xl overflow-hidden border border-ink-700 shadow-glow bg-black`
    }, /*#__PURE__*/React.createElement("video", {
      controls: true,
      preload: "metadata",
      className: "demo-video"
    }, /*#__PURE__*/React.createElement("source", {
      src: embed
    }), "Seu navegador não suporta o elemento de vídeo."));
  }
  // Imagem / GIF — renderizado em resolução nativa dentro de um quadro maior, clique para ampliar
  if (embed.match(/\.(gif|jpe?g|png|webp)(\?|$)/i)) {
    return /*#__PURE__*/React.createElement("div", {
      className: `demo-frame relative mt-2 ${sizeClass} rounded-xl overflow-hidden border border-ink-700 shadow-glow cursor-zoom-in group`,
      onClick: () => onOpen && onOpen(embed, "image"),
      role: "button",
      tabIndex: 0,
      onKeyDown: e => {
        if (e.key === "Enter") onOpen && onOpen(embed, "image");
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: embed,
      loading: "lazy",
      decoding: "async",
      alt: "Demonstração do exercício",
      className: "demo-media"
    }), /*#__PURE__*/React.createElement("div", {
      className: "zoom-badge"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-11 h-11 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white"
    }, /*#__PURE__*/React.createElement(IconZoom, null))));
  }
  // link alternativo
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xs text-lime-400 underline"
  }, /*#__PURE__*/React.createElement("a", {
    href: embed,
    target: "_blank",
    rel: "noreferrer"
  }, "Abrir demonstração ↗"));
};
function App() {
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({
    message: "",
    type: "success"
  });
  const [fullscreenMedia, setFullscreenMedia] = useState(null); // { url, type }

  // Estado do formulário de autenticação
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Estado dos dados
  const [alunos, setAlunos] = useState([]);
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [treinosAluno, setTreinosAluno] = useState([]);
  const [avaliacoesAluno, setAvaliacoesAluno] = useState([]);

  // Modais
  const [showModalTreino, setShowModalTreino] = useState(false);
  const [showModalMedidas, setShowModalMedidas] = useState(false);

  // Estado do formulário de treino
  const [treinoTitulo, setTreinoTitulo] = useState("");
  const [treinoNivel, setTreinoNivel] = useState("Intermediário");
  const [treinoDesc, setTreinoDesc] = useState("");
  const [exercicios, setExercicios] = useState([{
    nome: "Supino Reto",
    series: 4,
    repeticoes: "10-12",
    carga: "30kg",
    descanso: "60s",
    grupo_muscular: "Peito",
    observacoes: "",
    demonstracao_url: "",
    instrucao_texto: "",
    matches: []
  }]);

  // Estado do formulário de avaliação
  const [medidaPeso, setMedidaPeso] = useState("");
  const [medidaAltura, setMedidaAltura] = useState("");
  const [medidaBF, setMedidaBF] = useState("");
  const [medidaCintura, setMedidaCintura] = useState("");
  const [medidaBraco, setMedidaBraco] = useState("");
  const [medidaCoxa, setMedidaCoxa] = useState("");
  const [medidaPeitoral, setMedidaPeitoral] = useState("");
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");
    const storedName = localStorage.getItem("nome");
    const storedId = localStorage.getItem("id");
    if (storedToken && storedRole) {
      setUser({
        token: storedToken,
        role: storedRole,
        nome: storedName,
        id: storedId
      });
    }
  }, []);
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "personal")) {
      fetchAlunos();
    } else if (user && user.role === "aluno") {
      fetchDadosAluno(user.id);
    }
    // eslint-disable-next-line
  }, [user]);
  useEffect(() => {
    const handleKey = e => {
      if (e.key === "Escape") setFullscreenMedia(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Trava o scroll do body enquanto o modal de mídia estiver aberto
  useEffect(() => {
    document.body.style.overflow = fullscreenMedia ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreenMedia]);
  const showToast = (message, type = "success") => {
    setToast({
      message,
      type
    });
    setTimeout(() => setToast({
      message: "",
      type: "success"
    }), 4000);
  };
  const handleOpenMedia = (url, type) => {
    setFullscreenMedia({
      url,
      type
    });
  };
  const handleAuth = async e => {
    e.preventDefault();
    const url = isLogin ? `${API_PREFIX}/login` : `${API_PREFIX}/cadastrar`;
    const body = isLogin ? {
      username,
      password
    } : {
      nome_completo: fullName,
      username,
      password
    };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("role", data.role);
          localStorage.setItem("nome", data.nome);
          localStorage.setItem("id", data.id);
          setUser(data);
          showToast(`Bem-vindo de volta, ${data.nome}!`);
        } else {
          showToast("Cadastro realizado! Faça login agora.");
          setIsLogin(true);
        }
      } else {
        showToast(data.error || "Ocorreu um erro.", "error");
      }
    } catch (err) {
      showToast("Erro de conexão com o servidor.", "error");
    }
  };
  const fetchAlunos = async () => {
    try {
      const res = await fetch(`${API_PREFIX}/alunos`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAlunos(data);
        if (data.length > 0 && !selectedAluno) {
          selectAluno(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
  const selectAluno = aluno => {
    setSelectedAluno(aluno);
    fetchDadosAluno(aluno.id);
  };
  const fetchDadosAluno = async alunoId => {
    try {
      const [resTreinos, resMedidas] = await Promise.all([fetch(`${API_PREFIX}/treinos/aluno/${alunoId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      }), fetch(`${API_PREFIX}/avaliacoes/aluno/${alunoId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      })]);
      const treinos = await resTreinos.json();
      const avaliacoes = await resMedidas.json();
      if (resTreinos.ok) setTreinosAluno(treinos);
      if (resMedidas.ok) setAvaliacoesAluno(avaliacoes);
    } catch (err) {
      console.error(err);
    }
  };
  const handleAddExercicio = () => {
    setExercicios([...exercicios, {
      nome: "",
      series: 4,
      repeticoes: "10",
      carga: "0kg",
      descanso: "60s",
      grupo_muscular: "Geral",
      observacoes: "",
      demonstracao_url: "",
      instrucao_texto: "",
      matches: []
    }]);
  };
  const handleRemoveExercicio = index => {
    setExercicios(exercicios.filter((_, i) => i !== index));
  };

  // Busca demonstrações no dataset pelo nome do exercício
  const handleFetchDemoForExercise = async index => {
    const ex = exercicios[index];
    if (!ex || !ex.nome || ex.nome.trim().length === 0) {
      return showToast("Digite o nome do exercício antes de buscar.", "error");
    }
    try {
      const res = await fetch(`${API_PREFIX}/exercicios/search?name=${encodeURIComponent(ex.nome)}&limit=8`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        const matches = data.matches || [];
        setExercicios(prev => {
          const copy = [...prev];
          copy[index] = {
            ...copy[index]
          };
          if (matches.length === 1 && matches[0].url) {
            copy[index].demonstracao_url = matches[0].url;
            copy[index].matches = [];
          } else {
            copy[index].matches = matches;
          }
          return copy;
        });
        if (matches.length === 0) showToast("Nenhuma demonstração encontrada para esse nome.", "error");else if (matches.length === 1 && matches[0].url) showToast("Demonstração encontrada e aplicada automaticamente!");else showToast("Foram encontradas opções — escolha a correta abaixo.");
      } else {
        showToast(data.error || "Erro ao buscar demonstração.", "error");
      }
    } catch (err) {
      showToast("Erro ao buscar demonstração.", "error");
    }
  };
  const applyMatchToExercise = (exIndex, match) => {
    setExercicios(prev => {
      const copy = [...prev];
      copy[exIndex] = {
        ...copy[exIndex],
        demonstracao_url: match.url || "",
        matches: []
      };
      return copy;
    });
    showToast("Demonstração aplicada ao exercício!");
  };
  const handleSaveTreino = async e => {
    e.preventDefault();
    if (!selectedAluno) return showToast("Selecione um aluno primeiro.", "error");
    try {
      const res = await fetch(`${API_PREFIX}/treinos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          aluno_id: selectedAluno.id,
          titulo: treinoTitulo,
          nivel: treinoNivel,
          descricao: treinoDesc,
          exercicios: exercicios.map(ex => ({
            nome: ex.nome,
            series: ex.series,
            repeticoes: ex.repeticoes,
            carga: ex.carga,
            descanso: ex.descanso,
            grupo_muscular: ex.grupo_muscular,
            observacoes: ex.observacoes,
            demonstracao_url: ex.demonstracao_url,
            instrucao_texto: ex.instrucao_texto
          }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Treino cadastrado com sucesso!");
        setShowModalTreino(false);
        setTreinoTitulo("");
        setTreinoDesc("");
        setExercicios([{
          nome: "Supino Reto",
          series: 4,
          repeticoes: "10-12",
          carga: "30kg",
          descanso: "60s",
          grupo_muscular: "Peito",
          observacoes: "",
          demonstracao_url: "",
          instrucao_texto: "",
          matches: []
        }]);
        fetchDadosAluno(selectedAluno.id);
      } else {
        showToast(data.error || "Erro ao salvar treino.", "error");
      }
    } catch (err) {
      showToast("Erro ao salvar treino.", "error");
    }
  };
  const handleSaveMedidas = async e => {
    e.preventDefault();
    if (!selectedAluno) return showToast("Selecione um aluno primeiro.", "error");
    try {
      const res = await fetch(`${API_PREFIX}/avaliacoes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`
        },
        body: JSON.stringify({
          aluno_id: selectedAluno.id,
          peso: parseFloat(medidaPeso),
          altura: parseFloat(medidaAltura),
          bf: parseFloat(medidaBF) || null,
          cintura: parseFloat(medidaCintura) || null,
          braco: parseFloat(medidaBraco) || null,
          coxa: parseFloat(medidaCoxa) || null,
          peitoral: parseFloat(medidaPeitoral) || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Avaliação física registrada! IMC: ${data.imc}`);
        setShowModalMedidas(false);
        setMedidaPeso("");
        setMedidaAltura("");
        setMedidaBF("");
        setMedidaCintura("");
        setMedidaBraco("");
        setMedidaCoxa("");
        setMedidaPeitoral("");
        fetchDadosAluno(selectedAluno.id);
      } else {
        showToast(data.error || "Erro ao registrar avaliação.", "error");
      }
    } catch (err) {
      showToast("Erro ao registrar avaliação.", "error");
    }
  };
  const handleDeleteTreino = async id => {
    try {
      const res = await fetch(`${API_PREFIX}/treinos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        showToast("Treino removido com sucesso.");
        fetchDadosAluno(selectedAluno ? selectedAluno.id : user.id);
      }
    } catch (err) {
      showToast("Erro ao remover treino.", "error");
    }
  };
  const handleToggleExercio = async exId => {
    try {
      const res = await fetch(`${API_PREFIX}/exercicios/${exId}/toggle`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      if (res.ok) {
        fetchDadosAluno(selectedAluno ? selectedAluno.id : user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };
  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };
  if (!user) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex items-start sm:items-center justify-center p-4 py-10 overflow-y-auto"
    }, /*#__PURE__*/React.createElement(Toast, {
      message: toast.message,
      type: toast.type,
      onClose: () => setToast({
        message: ""
      })
    }), /*#__PURE__*/React.createElement("div", {
      className: "w-full max-w-md bg-ink-900 border border-ink-700 rounded-2xl p-6 sm:p-8 shadow-2xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex justify-center mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-14 h-14 bg-lime-500 rounded-2xl flex items-center justify-center text-ink-950 shadow-glow"
    }, /*#__PURE__*/React.createElement(IconDumbbell, null))), /*#__PURE__*/React.createElement("h1", {
      className: "font-display text-3xl font-bold text-center text-white mb-1 tracking-tight"
    }, "FitPro"), /*#__PURE__*/React.createElement("p", {
      className: "text-ink-600 text-center text-sm mb-6"
    }, "Sua evolução física sob controle"), /*#__PURE__*/React.createElement("form", {
      onSubmit: handleAuth,
      className: "space-y-4"
    }, !isLogin && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-xs font-medium text-slate-400"
    }, "Nome Completo"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      required: true,
      value: fullName,
      onChange: e => setFullName(e.target.value),
      className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 transition-colors",
      placeholder: "Ex: Carlos Silva"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-xs font-medium text-slate-400"
    }, "Usuário"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      required: true,
      value: username,
      onChange: e => setUsername(e.target.value),
      className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 transition-colors",
      placeholder: "Seu usuário de acesso"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "text-xs font-medium text-slate-400"
    }, "Senha"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      required: true,
      value: password,
      onChange: e => setPassword(e.target.value),
      className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-500 transition-colors",
      placeholder: "••••••••"
    })), /*#__PURE__*/React.createElement("button", {
      type: "submit",
      className: "w-full bg-lime-500 hover:bg-lime-400 text-ink-950 font-bold py-3 rounded-xl shadow-glow transition-all"
    }, isLogin ? "Entrar no Sistema" : "Criar Minha Conta")), /*#__PURE__*/React.createElement("div", {
      className: "mt-6 text-center"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setIsLogin(!isLogin),
      className: "text-lime-400 hover:underline text-sm font-medium"
    }, isLogin ? "Não tem conta? Cadastre-se" : "Já possui uma conta? Faça Login"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen text-slate-200"
  }, /*#__PURE__*/React.createElement(Toast, {
    message: toast.message,
    type: toast.type,
    onClose: () => setToast({
      message: ""
    })
  }), fullscreenMedia && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center media-modal-bg fade-enter"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setFullscreenMedia(null),
    className: "absolute top-5 right-5 z-[70] p-3 rounded-full media-close-btn text-white transition-colors"
  }, /*#__PURE__*/React.createElement(IconClose, null)), /*#__PURE__*/React.createElement("div", {
    className: "relative w-screen h-screen flex items-center justify-center zoom-enter",
    onClick: () => setFullscreenMedia(null)
  }, fullscreenMedia.type === "image" && /*#__PURE__*/React.createElement("img", {
    src: fullscreenMedia.url,
    alt: "Demonstração ampliada",
    className: "w-full h-full object-contain",
    onClick: e => e.stopPropagation()
  }), fullscreenMedia.type === "video" && /*#__PURE__*/React.createElement("video", {
    controls: true,
    autoPlay: true,
    className: "w-full h-full object-contain",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("source", {
    src: fullscreenMedia.url
  }), "Seu navegador não suporta vídeo."), fullscreenMedia.type === "embed" && /*#__PURE__*/React.createElement("iframe", {
    src: fullscreenMedia.url,
    title: "Demonstração",
    className: "w-[96vw] h-[92vh] rounded-lg",
    frameBorder: "0",
    allowFullScreen: true,
    onClick: e => e.stopPropagation()
  }))), /*#__PURE__*/React.createElement("header", {
    className: "bg-ink-900/95 backdrop-blur border-b border-ink-700 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-30 flex justify-between items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-lime-500 rounded-xl flex items-center justify-center text-ink-950 shadow-glow"
  }, /*#__PURE__*/React.createElement(IconDumbbell, null)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-display font-bold text-white text-lg leading-none tracking-tight"
  }, "FitPro", /*#__PURE__*/React.createElement("span", {
    className: "text-lime-500"
  }, ".")), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-lime-400 uppercase font-semibold tracking-wide"
  }, user.role))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-slate-300 hidden md:inline"
  }, "Olá, ", user.nome), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogout,
    className: "bg-ink-800 hover:bg-ink-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-ink-700"
  }, "Sair"))), /*#__PURE__*/React.createElement("main", {
    className: "max-w-7xl mx-auto p-4 md:p-8"
  }, user.role === "admin" || user.role === "personal" ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-4 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-4 h-fit"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 px-2"
  }, "Meus Alunos (", alunos.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar"
  }, alunos.map(aluno => /*#__PURE__*/React.createElement("div", {
    key: aluno.id,
    onClick: () => selectAluno(aluno),
    className: `p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between ${selectedAluno?.id === aluno.id ? "bg-lime-500 text-ink-950 font-semibold shadow-glow" : "bg-ink-800/60 hover:bg-ink-800 text-slate-300"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-8 h-8 rounded-full flex items-center justify-center font-bold ${selectedAluno?.id === aluno.id ? "bg-black/10 text-ink-950" : "bg-ink-700 text-lime-400"}`
  }, aluno.nome_completo.charAt(0)), /*#__PURE__*/React.createElement("span", {
    className: "text-sm truncate"
  }, aluno.nome_completo)))), alunos.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 italic px-2"
  }, "Nenhum aluno cadastrado ainda."))), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-3 space-y-6"
  }, selectedAluno ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-6 flex flex-wrap justify-between items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "font-display text-2xl font-bold text-white"
  }, selectedAluno.nome_completo), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-400"
  }, "Usuário: @", selectedAluno.username)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3 w-full sm:w-auto"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowModalTreino(true),
    className: "flex-1 sm:flex-none bg-lime-500 hover:bg-lime-400 text-ink-950 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-glow transition-all"
  }, /*#__PURE__*/React.createElement(IconPlus, null), " Adicionar Treino"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowModalMedidas(true),
    className: "flex-1 sm:flex-none bg-ink-800 hover:bg-ink-700 text-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-ink-700 transition-all"
  }, /*#__PURE__*/React.createElement(IconActivity, null), " Nova Avaliação Física"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-display text-lg font-bold text-white mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(IconActivity, null), " Histórico de Evolução & Medidas"), avaliacoesAluno.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-800/60 p-4 rounded-xl border border-ink-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 uppercase font-semibold"
  }, "Peso Atual"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-lime-400 mt-1"
  }, avaliacoesAluno[0].peso, " kg")), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-800/60 p-4 rounded-xl border border-ink-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 uppercase font-semibold"
  }, "IMC"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-sky-400 mt-1"
  }, avaliacoesAluno[0].imc)), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-800/60 p-4 rounded-xl border border-ink-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 uppercase font-semibold"
  }, "% Gordura (BF)"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-purple-400 mt-1"
  }, avaliacoesAluno[0].bf, "%")), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-800/60 p-4 rounded-xl border border-ink-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 uppercase font-semibold"
  }, "Cintura"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-coral-400 mt-1"
  }, avaliacoesAluno[0].cintura, " cm"))) : /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 text-sm italic mb-4"
  }, "Nenhuma avaliação física cadastrada ainda."), avaliacoesAluno.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full min-w-[640px] text-sm text-left text-slate-300"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "text-xs text-slate-400 uppercase bg-ink-800/50"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Data"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Peso"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Altura"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "IMC"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "BF%"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Braço"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Coxa"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Peitoral"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-ink-800"
  }, avaliacoesAluno.map(av => /*#__PURE__*/React.createElement("tr", {
    key: av.id,
    className: "hover:bg-ink-800/30"
  }, /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, new Date(av.data).toLocaleDateString("pt-BR")), /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-semibold text-lime-400"
  }, av.peso, " kg"), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.altura, " m"), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.imc), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.bf ?? "—", "%"), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.braco ?? "—", " cm"), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.coxa ?? "—", " cm"), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, av.peitoral ?? "—", " cm"))))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-display text-lg font-bold text-white mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(IconDumbbell, null), " Planos de Treino Prescritos (", treinosAluno.length, ")"), treinosAluno.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-slate-500 text-sm italic"
  }, "Nenhum treino prescrito para este aluno ainda.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, treinosAluno.map(tr => /*#__PURE__*/React.createElement("div", {
    key: tr.id,
    className: "bg-ink-800/40 border border-ink-800 rounded-xl p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-bold text-white"
  }, tr.titulo), /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-2.5 py-0.5 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/20 font-medium"
  }, tr.nivel)), tr.descricao && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, tr.descricao)), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDeleteTreino(tr.id),
    className: "text-slate-500 hover:text-coral-400 p-1 transition-colors"
  }, /*#__PURE__*/React.createElement(IconTrash, null))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"
  }, tr.exercicios.map(ex => /*#__PURE__*/React.createElement("div", {
    key: ex.id,
    className: "bg-ink-900/60 p-3 rounded-lg border border-ink-800 flex flex-col gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm text-slate-200"
  }, ex.nome_pt || ex.nome), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, ex.series, "x ", ex.repeticoes, " • Carga:", " ", /*#__PURE__*/React.createElement("span", {
    className: "text-lime-400 font-medium"
  }, ex.carga), " ", "• Descanso: ", ex.descanso), ex.instrucao_texto && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-300 mt-2 italic"
  }, ex.instrucao_texto)), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] bg-ink-800 px-2 py-1 rounded text-slate-400 whitespace-nowrap"
  }, ex.grupo_muscular)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-4"
  }, /*#__PURE__*/React.createElement(DemoMedia, {
    url: ex.demonstracao_url,
    onOpen: handleOpenMedia,
    compact: true
  }), !ex.demonstracao_url && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 italic"
  }, "Sem demonstração")))))))))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center text-slate-500"
  }, "Selecione um aluno na lista ao lado para ver e cadastrar treinos e medidas."))) :
  /*#__PURE__*/
  /* PAINEL DO ALUNO */
  React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-6"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-display text-2xl font-bold text-white mb-1"
  }, "Meu Treino e Evolução"), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-400 text-sm"
  }, "Acompanhe suas metas e registre a conclusão dos seus exercícios")), avaliacoesAluno.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 md:grid-cols-4 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-medium"
  }, "Seu Peso"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-lime-400 mt-1"
  }, avaliacoesAluno[0].peso, " kg")), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-medium"
  }, "Seu IMC"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-sky-400 mt-1"
  }, avaliacoesAluno[0].imc)), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-medium"
  }, "% Gordura"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-purple-400 mt-1"
  }, avaliacoesAluno[0].bf, "%")), /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-medium"
  }, "Braço"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-coral-400 mt-1"
  }, avaliacoesAluno[0].braco, " cm"))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-display text-xl font-bold text-white"
  }, "Seus Treinos Prescritos"), treinosAluno.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-xl p-8 text-center text-slate-500"
  }, "Seu treinador ainda não cadastrou treinos para você.") : treinosAluno.map(tr => /*#__PURE__*/React.createElement("div", {
    key: tr.id,
    className: "bg-ink-900 border border-ink-700 rounded-2xl p-6 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-xl font-bold text-white"
  }, tr.titulo), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, tr.descricao)), /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-lime-500/10 text-lime-400 border border-lime-500/20 px-3 py-1 rounded-full font-medium"
  }, tr.nivel)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, tr.exercicios.map(ex => /*#__PURE__*/React.createElement("div", {
    key: ex.id,
    className: `p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center gap-4 justify-between ${ex.concluido ? "bg-lime-500/10 border-lime-500/40 text-slate-300" : "bg-ink-800/50 border-ink-700 hover:bg-ink-800"}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 cursor-pointer",
    onClick: () => handleToggleExercio(ex.id)
  }, /*#__PURE__*/React.createElement("p", {
    className: `font-bold text-base ${ex.concluido ? "line-through text-slate-400" : "text-white"}`
  }, ex.nome_pt || ex.nome), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, ex.series, " séries x ", ex.repeticoes, " reps • Carga:", " ", /*#__PURE__*/React.createElement("strong", {
    className: "text-lime-400"
  }, ex.carga), " ", "• Descanso: ", ex.descanso), ex.instrucao_texto && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-300 mt-2 italic"
  }, ex.instrucao_texto)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(DemoMedia, {
    url: ex.demonstracao_url,
    onOpen: handleOpenMedia,
    compact: true
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleToggleExercio(ex.id),
    className: `w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${ex.concluido ? "bg-lime-500 border-lime-500 text-ink-950" : "border-ink-600 text-transparent hover:border-lime-500"}`
  }, "✓")))))))))), showModalTreino && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-2 sm:p-4 py-6 sm:py-10 overflow-y-auto fade-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 my-8 zoom-enter"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-display text-xl font-bold text-white"
  }, "Cadastrar Novo Treino para ", selectedAluno?.nome_completo), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSaveTreino,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Título do Treino"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "Ex: Treino A - Peito e Tríceps",
    value: treinoTitulo,
    onChange: e => setTreinoTitulo(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 text-sm"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Nível"), /*#__PURE__*/React.createElement("select", {
    value: treinoNivel,
    onChange: e => setTreinoNivel(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 text-sm"
  }, /*#__PURE__*/React.createElement("option", {
    value: "Iniciante"
  }, "Iniciante"), /*#__PURE__*/React.createElement("option", {
    value: "Intermediário"
  }, "Intermediário"), /*#__PURE__*/React.createElement("option", {
    value: "Avançado"
  }, "Avançado")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Descrição / Observações"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Focar na amplitude e cadência da execução",
    value: treinoDesc,
    onChange: e => setTreinoDesc(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white focus:outline-none focus:border-lime-500 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 pt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-bold text-slate-300"
  }, "Exercícios (", exercicios.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAddExercicio,
    className: "text-xs text-lime-400 font-medium hover:underline"
  }, "+ Adicionar Exercício"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      exercicios.forEach((_, idx) => handleFetchDemoForExercise(idx));
    },
    className: "text-xs text-slate-300 bg-ink-800 px-3 py-1 rounded-lg hover:bg-ink-700 border border-ink-700"
  }, "Buscar demonstrações automaticamente"))), exercicios.map((ex, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-ink-800/50 p-4 rounded-xl border border-ink-700 space-y-3 relative"
  }, exercicios.length > 1 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleRemoveExercicio(idx),
    className: "absolute top-2 right-2 text-slate-500 hover:text-coral-400 text-xs"
  }, "Remover"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "Nome (ex: Supino Reto)",
    value: ex.nome,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        nome: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Músculo (ex: Peitoral)",
    value: ex.grupo_muscular,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        grupo_muscular: e.target.value
      };
      setExercicios(copy);
    },
    className: "flex-1 bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleFetchDemoForExercise(idx),
    className: "px-3 text-xs bg-lime-500 hover:bg-lime-400 rounded-lg text-ink-950 font-semibold whitespace-nowrap"
  }, "🔎"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    placeholder: "Séries",
    value: ex.series,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        series: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs text-center focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Reps (10-12)",
    value: ex.repeticoes,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        repeticoes: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs text-center focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Carga (30kg)",
    value: ex.carga,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        carga: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs text-center focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Descanso (60s)",
    value: ex.descanso,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        descanso: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs text-center focus:outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "URL da demonstração (YouTube ou link direto .mp4/.gif) — ou deixe em branco para buscar",
    value: ex.demonstracao_url,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        demonstracao_url: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-lime-500"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Instrução rápida (ex: 'manter o tronco ereto')",
    value: ex.instrucao_texto,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        instrucao_texto: e.target.value
      };
      setExercicios(copy);
    },
    className: "bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-lime-500"
  })), ex.demonstracao_url && /*#__PURE__*/React.createElement(DemoMedia, {
    url: ex.demonstracao_url,
    onOpen: handleOpenMedia,
    compact: true
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs text-slate-400"
  }, "Observações (opcional)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Observações específicas",
    value: ex.observacoes,
    onChange: e => {
      const copy = [...exercicios];
      copy[idx] = {
        ...copy[idx],
        observacoes: e.target.value
      };
      setExercicios(copy);
    },
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-lime-500"
  })), ex.matches && ex.matches.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 p-3 rounded-lg border border-ink-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-300 font-medium"
  }, "Opções de demonstração encontradas:"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Clique para aplicar")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-2"
  }, ex.matches.map((m, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    onClick: () => applyMatchToExercise(idx, m),
    className: "w-full text-left p-3 bg-ink-800 rounded-lg hover:bg-ink-700 text-xs border border-ink-700 flex items-center gap-3 transition-colors overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold text-slate-200 truncate"
  }, m.name), /*#__PURE__*/React.createElement("div", {
    className: "text-slate-500 text-xs overflow-hidden text-ellipsis whitespace-nowrap",
    title: m.url
  }, m.url || "Sem URL")), /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0 text-lime-400 text-xs font-semibold"
  }, "Usar")))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowModalTreino(false),
    className: "w-full sm:w-auto px-4 py-2 bg-ink-800 text-slate-300 rounded-xl text-sm font-medium border border-ink-700"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full sm:w-auto px-4 py-2 bg-lime-500 hover:bg-lime-400 text-ink-950 rounded-xl text-sm font-bold shadow-glow"
  }, "Salvar Treino"))))), showModalMedidas && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-2 sm:p-4 py-6 sm:py-10 overflow-y-auto fade-enter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-ink-900 border border-ink-700 rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 zoom-enter"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-display text-xl font-bold text-white"
  }, "Nova Avaliação Física para ", selectedAluno?.nome_completo), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSaveMedidas,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Peso (kg)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    required: true,
    placeholder: "75.5",
    value: medidaPeso,
    onChange: e => setMedidaPeso(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Altura (metros)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.01",
    required: true,
    placeholder: "1.75",
    value: medidaAltura,
    onChange: e => setMedidaAltura(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-lime-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "% Gordura Corporal (BF)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    placeholder: "15.0",
    value: medidaBF,
    onChange: e => setMedidaBF(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Cintura (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    placeholder: "80",
    value: medidaCintura,
    onChange: e => setMedidaCintura(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-lime-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2 sm:gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Braço (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    placeholder: "38",
    value: medidaBraco,
    onChange: e => setMedidaBraco(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Coxa (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    placeholder: "58",
    value: medidaCoxa,
    onChange: e => setMedidaCoxa(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-lime-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-medium text-slate-400"
  }, "Peitoral (cm)"), /*#__PURE__*/React.createElement("input", {
    type: "number",
    step: "0.1",
    placeholder: "102",
    value: medidaPeitoral,
    onChange: e => setMedidaPeitoral(e.target.value),
    className: "w-full mt-1 bg-ink-800 border border-ink-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:border-lime-500"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowModalMedidas(false),
    className: "w-full sm:w-auto px-4 py-2 bg-ink-800 text-slate-300 rounded-xl text-sm font-medium border border-ink-700"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full sm:w-auto px-4 py-2 bg-lime-500 hover:bg-lime-400 text-ink-950 rounded-xl text-sm font-bold shadow-glow"
  }, "Registrar Avaliação"))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
