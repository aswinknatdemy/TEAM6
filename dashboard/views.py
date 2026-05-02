from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

import requests
from bs4 import BeautifulSoup

EMPLOYEE_IDS = ['FTM118', 'FTM117', 'FTM020', 'FTM138', 'FTM134', 'FTM018', 'FTM014', 'FTM105']
NAMES = {
    'FTM118': 'ASWIN',
    'FTM117': 'SINAN',
    'FTM020': 'SABITHA',
    'FTM138': 'SHAMEEL',
    'FTM134': 'NIVEDHYA',
    'FTM018': 'ASHIQ',
    'FTM014': 'SHANIYA',
    'FTM105': 'ANSHID'
}

PASSWORDS = {
    'FTM118': 'Aswink@113',
    'FTM117': 'sinan@tm6',
    'FTM020': 'Pass@Sabitha',
    'FTM138': 'shameel@team6',
    'FTM134': 'nivedhya@tem6',
    'FTM018': 'ashiq@ttm6',
    'FTM014': 'shaniya@tmm6',
    'FTM105': 'anshi@tm6'
}

def get_stats(emp_id):
    login_url = "https://plusthree.natdemy.com/users/login/"
    password = PASSWORDS.get(emp_id)
    if not password:
        return {
            "id": emp_id,
            "name": NAMES.get(emp_id, emp_id),
            "total": 0, "verified": 0, "rejected": 0, "waiting": 0, "error": True
        }
    
    try:
        session = requests.Session()
        # Get login page to get CSRF token
        response = session.get(login_url, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            csrf_input = soup.find('input', {'name': 'csrfmiddlewaretoken'})
            if not csrf_input:
                raise ValueError("CSRF token not found")
            csrf_token = csrf_input['value']
            
            # Login
            login_data = {
                'csrfmiddlewaretoken': csrf_token,
                'employee_id': emp_id,
                'password': password
            }
            headers = {
                'Referer': login_url,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            
            post_response = session.post(login_url, data=login_data, headers=headers, timeout=10)
            
            # Navigate to the follow-up page
            follow_up_url = "https://plusthree.natdemy.com/users/follow-up/"
            follow_up_response = session.get(follow_up_url, timeout=10)
            
            if follow_up_response.status_code != 200:
                raise ValueError(f"Failed to load follow-up page: {follow_up_response.status_code}")
                
            follow_soup = BeautifulSoup(follow_up_response.text, 'html.parser')
            
            # Find the table and count statuses
            table = follow_soup.find('table', class_='table')
            
            total = 0
            verified = 0
            rejected = 0
            waiting = 0
            
            if table:
                tbody = table.find('tbody')
                if tbody:
                    rows = tbody.find_all('tr')
                    total = len(rows)
                    for row in rows:
                        cols = row.find_all('td')
                        if len(cols) >= 4:
                            status_text = cols[3].get_text(strip=True).lower()
                            if 'verified' in status_text:
                                verified += 1
                            elif 'rejected' in status_text:
                                rejected += 1
                            elif 'waiting' in status_text or 'pending' in status_text:
                                waiting += 1
            
            return {
                "id": emp_id,
                "name": NAMES.get(emp_id, emp_id),
                "total": total,
                "verified": verified,
                "rejected": rejected,
                "waiting": waiting
            }
    except Exception as e:
        print(f"Error fetching data for {emp_id}: {e}")
    
    return {
        "id": emp_id,
        "name": NAMES.get(emp_id, emp_id),
        "total": 0,
        "verified": 0,
        "rejected": 0,
        "waiting": 0,
        "error": True
    }

def index(request):
    return render(request, 'index.html')

from concurrent.futures import ThreadPoolExecutor

@api_view(['GET'])
@permission_classes([AllowAny])
def api_stats(request):
    # Fetch all stats in parallel (reduced to 4 workers to prevent rate-limiting)
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(get_stats, EMPLOYEE_IDS))
    
    # Sort by VERIFIED (matching the frontend logic to prevent jumping)
    results.sort(key=lambda x: x['verified'], reverse=True)
    return Response(results)


