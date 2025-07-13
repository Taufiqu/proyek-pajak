import psycopg2

try:
    conn = psycopg2.connect(
        host = "pgbouncer.hodllrhwyqhrksfkgiqc.supabase.co",
        port=6543,
        database="postgres",
        user="postgres",
        password="26122004dbpajak",
        sslmode="require"
    )
    print("✅ Connected to Supabase PostgreSQL!")
except Exception as e:
    print("❌ Connection failed:", e)
