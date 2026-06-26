function carregarUsuarios() {
  const salvo = localStorage.getItem("plannerUnirio_usuarios");
  if (salvo) {
    return JSON.parse(salvo);
  } else {
    return [];
  }
}

function mostrarErro(id, msg) {
  document.getElementById(id).textContent = msg;
}

function limparErros() {
  const ids = ["erro-email", "erro-senha"];
  for (let i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).textContent = "";
  }
}

document.querySelector("form").addEventListener("submit", function (e) {
  e.preventDefault();
  limparErros();

  const email = document.getElementById("campo-email").value.trim();
  const senha = document.getElementById("campo-senha").value;

  const usuarios = carregarUsuarios();
  
  let usuario = null;
  for (let i = 0; i < usuarios.length; i++) {
    if (usuarios[i].email === email) {
      usuario = usuarios[i];
      break;
    }
  }

  if (!usuario) {
    mostrarErro("erro-email", "E-mail não encontrado.");
    return;
  }

  if (usuario.senha !== senha) {
    mostrarErro("erro-senha", "Senha incorreta.");
    return;
  }

  sessionStorage.setItem("plannerUnirio_usuarioLogado", email);
  window.location.href = "agenda.html";
});

document.querySelector(".reset").addEventListener("click", function() {
  limparErros();
});