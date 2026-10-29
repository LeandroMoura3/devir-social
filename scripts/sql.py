"""Executa SQL no projeto Supabase pela Management API.

Uso: python3 -I scripts/sql.py arquivo.sql   ou   python3 -I scripts/sql.py -c "select 1"
Lê SUPABASE_ACCESS_TOKEN e NEXT_PUBLIC_SUPABASE_URL do .env.local (o token nunca é impresso).
"""
import json
import pathlib
import sys
import urllib.error
import urllib.request

raiz = pathlib.Path(__file__).resolve().parent.parent
env = {}
for linha in (raiz / ".env.local").read_text().splitlines():
    if "=" in linha and not linha.lstrip().startswith("#"):
        chave, valor = linha.split("=", 1)
        env[chave.strip()] = valor.strip().strip('"')

ref = env["NEXT_PUBLIC_SUPABASE_URL"].split("//")[1].split(".")[0]
sql = sys.argv[2] if sys.argv[1] == "-c" else pathlib.Path(sys.argv[1]).read_text()

pedido = urllib.request.Request(
    f"https://api.supabase.com/v1/projects/{ref}/database/query",
    data=json.dumps({"query": sql}).encode(),
    headers={
        "Authorization": f"Bearer {env['SUPABASE_ACCESS_TOKEN']}",
        "Content-Type": "application/json",
        "User-Agent": "devir-social-scripts",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(pedido, timeout=120) as resposta:
        print(json.dumps(json.loads(resposta.read() or "null"), ensure_ascii=False, indent=1))
except urllib.error.HTTPError as erro:
    print(f"ERRO {erro.code}: {erro.read().decode()}", file=sys.stderr)
    sys.exit(1)
