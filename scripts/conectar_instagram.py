"""Conecta a conta do Instagram ao app. Nenhum token é impresso.

Dois caminhos, conforme o que estiver no .env.local:
  * Login do Facebook (Página vinculada): META_APP_ID, META_APP_SECRET e META_USER_TOKEN
    (token gerado no Explorador da Graph API). O script troca por um token de longa duração,
    acha a Página com Instagram vinculado e grava o token da Página, que não vence.
  * Login do Instagram: INSTAGRAM_TOKEN (gerado na configuração da API com login do Instagram).

Uso: python3 -I scripts/conectar_instagram.py
"""
import json
import pathlib
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

raiz = pathlib.Path(__file__).resolve().parent.parent
env = {}
for linha in (raiz / ".env.local").read_text().splitlines():
    if "=" in linha and not linha.lstrip().startswith("#"):
        chave, valor = linha.split("=", 1)
        env[chave.strip()] = valor.strip().strip('"')

segredos = [v for k, v in env.items() if k.startswith(("META_", "INSTAGRAM_")) and v]


def sem_segredos(texto: str) -> str:
    for segredo in segredos:
        texto = texto.replace(segredo, "***")
    return texto


def obter(url: str, parametros: dict) -> dict:
    try:
        with urllib.request.urlopen(f"{url}?{urllib.parse.urlencode(parametros)}", timeout=30) as resposta:
            return json.loads(resposta.read())
    except urllib.error.HTTPError as erro:
        sys.exit(f"A Meta recusou o pedido: {sem_segredos(erro.read().decode())}")


if env.get("META_USER_TOKEN"):
    via = "facebook"
    longo = obter(
        "https://graph.facebook.com/oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": env["META_APP_ID"],
            "client_secret": env["META_APP_SECRET"],
            "fb_exchange_token": env["META_USER_TOKEN"],
        },
    )["access_token"]
    segredos.append(longo)
    paginas = obter(
        "https://graph.facebook.com/me/accounts",
        {"fields": "name,access_token,instagram_business_account{id,username}", "access_token": longo},
    ).get("data", [])
    com_instagram = [p for p in paginas if p.get("instagram_business_account")]
    if len(com_instagram) != 1:
        nomes = ", ".join(p.get("name", "?") for p in paginas) or "nenhuma"
        sys.exit(f"Esperava exatamente 1 Página com Instagram vinculado; encontrei {len(com_instagram)}. Páginas: {nomes}")
    pagina = com_instagram[0]
    token = pagina["access_token"]
    usuario_id = str(pagina["instagram_business_account"]["id"])
    nome = pagina["instagram_business_account"].get("username", "?")
elif env.get("INSTAGRAM_TOKEN"):
    via = "instagram"
    token = env["INSTAGRAM_TOKEN"]
    conta = obter("https://graph.instagram.com/me", {"fields": "user_id,username", "access_token": token})
    usuario_id = str(conta["user_id"])
    nome = conta["username"]
else:
    sys.exit("Nenhum token encontrado no .env.local (META_USER_TOKEN ou INSTAGRAM_TOKEN).")

if not usuario_id.isdigit() or "$" in token:
    sys.exit("Resposta inesperada da Meta; nada foi gravado.")

sql = (
    "insert into public.instagram_conexao (id, via, usuario_id, token, renovado_em) "
    f"values (1, '{via}', '{usuario_id}', $tk${token}$tk$, now()) "
    "on conflict (id) do update set via = excluded.via, usuario_id = excluded.usuario_id, "
    "token = excluded.token, renovado_em = now();"
)
resultado = subprocess.run(
    [sys.executable, "-I", str(raiz / "scripts" / "sql.py"), "-c", sql], capture_output=True, text=True
)
if resultado.returncode != 0:
    sys.exit(f"Falha ao gravar no banco: {sem_segredos(resultado.stderr)}")
print(f"Instagram conectado pelo caminho '{via}': @{nome} (id {usuario_id})")
