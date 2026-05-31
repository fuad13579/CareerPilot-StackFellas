"""Debug script to check database and storage state"""
import os
import sys

# Change to backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.database_models import CVProfile
from sqlalchemy import text

def main():
    db = SessionLocal()
    print('DB Connection OK')

    # Check tables
    result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
    tables = [row[0] for row in result]
    print(f'Tables: {tables}')

    # Check CV profiles
    profiles = db.query(CVProfile).all()
    print(f'CV profiles in DB: {len(profiles)}')

    # Check if file exists
    if profiles:
        p = profiles[0]
        print(f'Sample: cv_id={p.cv_id}, file_path={p.file_path}')
        print(f'processed_text_path exists: {p.processed_text_path}')
        if p.processed_text_path:
            print(f'File exists: {os.path.exists(p.processed_text_path)}')
            
            # Read processed text if exists
            if os.path.exists(p.processed_text_path):
                with open(p.processed_text_path, 'r') as f:
                    content = f.read()
                    print(f'Processed text length: {len(content)} chars')
    else:
        print('No CV profiles found in database!')
    
    # Check storage directories
    storage_path = r'c:\Users\FUAD\source\repos\CareerPilot-StackFellas\backend\app\storage'
    print(f'\nStorage directories:')
    for subdir in ['uploaded_cvs', 'processed_cvs', 'vector_db']:
        path = os.path.join(storage_path, subdir)
        if os.path.exists(path):
            files = os.listdir(path)
            print(f'  {subdir}: {len(files)} files')
        else:
            print(f'  {subdir}: NOT FOUND')
    
    db.close()

if __name__ == '__main__':
    main()
