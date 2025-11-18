"""
MySQL 데이터베이스 생성 스크립트
실행 전에 MySQL 서버가 실행 중이어야 합니다.
"""
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_DB = os.getenv("MYSQL_DB", "fruit_orders")

try:
    # 데이터베이스 생성 전에 연결 (데이터베이스 이름 없이)
    connection = pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        charset='utf8mb4'
    )
    
    with connection.cursor() as cursor:
        # 데이터베이스 생성
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"[OK] 데이터베이스 '{MYSQL_DB}' 생성 완료!")
    
    connection.close()
    
except pymysql.Error as e:
    print(f"[ERROR] 오류 발생: {e}")
    print("\n해결 방법:")
    print("1. MySQL 서버가 실행 중인지 확인하세요")
    print("2. .env 파일에 올바른 MySQL 접속 정보가 있는지 확인하세요")
    print("3. MySQL 사용자에게 데이터베이스 생성 권한이 있는지 확인하세요")

