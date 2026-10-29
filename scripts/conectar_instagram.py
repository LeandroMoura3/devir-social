"""Conecta a conta do Instagram ao app.

Lê INSTAGRAM_TOKEN do .env.local, descobre a conta pela API do Instagram e grava
token e conta na tabela instagram_conexao (só a coordenação lê). O token nunca é impresso.
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

token = env.get("INSTAGRAM_TOKEN", "")
if not token:
    sys.exit("INSTAGRAM_TOKEN não encontrado no .env.local")

consulta = urllib.parse.urlencode({"fields": "user_id,username", "access_token": token})
try:
    with urllib.request.urlopen(f"https://graph.instagram.com/me?{consulta}", timeout=30) as resposta:
        conta = json.loads(resposta.read())
except urllib.error.HTTPError as erro:
    sys.exit(f"O Instagram recusou o token: {erro.read().decode()}")

usuario_id = str(conta["user_id"])
if not usuario_id.isdigit() or "$" in token:
    sys.exit("Resposta inesperada do Instagram; nada foi gravado.")

sql = (
    "insert into public.instagram_conexao (id, usuario_id, token, renovado_em) "
    f"values (1, '{usuario_id}', $tk${token}$tk$, now()) "
    "on conflict (id) do update set usuario_id = excluded.usuario_id, token = excluded.token, renovado_em = now();"
)
resultado = subprocess.run(
    [sys.executable, "-I", str(raiz / "scripts" / "sql.py"), "-c", sql], capture_output=True, text=True
)
if resultado.returncode != 0:
    sys.exit(f"Falha ao gravar no banco: {resultado.stderr.replace(token, '***')}")
print(f"Instagram conectado: @{conta['username']} (id {usuario_id})")
